process.env.CODEPAY_SANDBOX = 'true';
process.env.CODEPAY_API_URL = 'https://payapi.codewave.com.bo/api';
process.env.CODEPAY_SANDBOX_PUBLIC_KEY = 'pk_test_x';
process.env.CODEPAY_SANDBOX_SECRET_KEY = 'sk_test_x';
process.env.CODEPAY_NOTIFICATION_SECRET = 'whsec_test_x';

const { createHmac } = require('crypto');
const {
  firmarToken, generarQr, consultarEstado, verificarFirmaWebhook,
} = require('../src/integrations/codepay/codepay.client');

describe('codepayClient.firmarToken', () => {
  it('genera un JWT con 3 segmentos y firma determinística para el mismo payload', () => {
    const payload = { app_key: 'pk_test_x', order_id: 'pedido_1_1', amount: 10, currency: 'BOB' };
    const token1 = firmarToken(payload, 'sk_test_x');
    const token2 = firmarToken(payload, 'sk_test_x');
    expect(token1.split('.')).toHaveLength(3);
    expect(token1).toBe(token2);
  });

  it('cambia la firma si cambia el secreto', () => {
    const payload = { app_key: 'pk_test_x', order_id: 'pedido_1_1', amount: 10, currency: 'BOB' };
    const tokenA = firmarToken(payload, 'sk_test_x');
    const tokenB = firmarToken(payload, 'otro_secreto');
    expect(tokenA).not.toBe(tokenB);
  });
});

describe('codepayClient.generarQr', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('devuelve el JSON de CodePay cuando la respuesta es ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ qr_code: 'data:image/png;base64,abc', tx_id: 'tx_1', amount: 10.35, net_amount: 10, commission_amount: 0.35 }),
    });

    const res = await generarQr({ order_id: 'pedido_1_1', amount: 10, description: 'VentaTest', expires_at: new Date().toISOString() });
    expect(res.tx_id).toBe('tx_1');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://payapi.codewave.com.bo/api/v1/payments/qr',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('lanza 502 si CodePay responde !ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(generarQr({ order_id: 'pedido_1_1', amount: 10, description: 'x', expires_at: new Date().toISOString() }))
      .rejects.toMatchObject({ status: 502 });
  });

  it('lanza 502 si falla la red', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    await expect(generarQr({ order_id: 'pedido_1_1', amount: 10, description: 'x', expires_at: new Date().toISOString() }))
      .rejects.toMatchObject({ status: 502 });
  });
});

describe('codepayClient.consultarEstado', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('devuelve el estado reportado por CodePay', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', tx_id: 'tx_1', order_id: 'pedido_1_1' }) });
    const res = await consultarEstado('tx_1');
    expect(res.status).toBe('completed');
  });

  it('lanza 502 si CodePay responde !ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    await expect(consultarEstado('tx_1')).rejects.toMatchObject({ status: 502 });
  });
});

describe('codepayClient.verificarFirmaWebhook', () => {
  it('acepta una firma válida en formato t=...,v1=...', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.completed', order_id: 'pedido_1_1' }));
    const timestamp = Math.floor(Date.now() / 1000);
    const hmac = createHmac('sha256', 'whsec_test_x').update(`${timestamp}.${body}`).digest('hex');
    expect(verificarFirmaWebhook(body, `t=${timestamp},v1=${hmac}`)).toBe(true);
  });

  it('rechaza una firma con hmac incorrecto', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.completed', order_id: 'pedido_1_1' }));
    const timestamp = Math.floor(Date.now() / 1000);
    expect(verificarFirmaWebhook(body, `t=${timestamp},v1=00112233`)).toBe(false);
  });

  it('rechaza un header sin el formato t=...,v1=...', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.completed', order_id: 'pedido_1_1' }));
    expect(verificarFirmaWebhook(body, 'firma_incorrecta_pero_hex_00112233')).toBe(false);
  });

  it('rechaza si no hay header de firma', () => {
    const body = Buffer.from(JSON.stringify({ event: 'payment.completed' }));
    expect(verificarFirmaWebhook(body, undefined)).toBe(false);
  });
});
