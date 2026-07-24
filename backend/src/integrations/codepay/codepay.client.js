const { createHmac, timingSafeEqual } = require('crypto');

function _credenciales() {
  const sandbox = process.env.CODEPAY_SANDBOX === 'true';
  return {
    apiUrl: process.env.CODEPAY_API_URL,
    publicKey: sandbox ? process.env.CODEPAY_SANDBOX_PUBLIC_KEY : process.env.CODEPAY_PUBLIC_KEY,
    secretKey: sandbox ? process.env.CODEPAY_SANDBOX_SECRET_KEY : process.env.CODEPAY_SECRET_KEY,
  };
}

function firmarToken(payload, secretKey) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = Buffer.from(JSON.stringify(header)).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secretKey).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

async function generarQr({ order_id, amount, description, expires_at, currency = 'BOB' }) {
  const { apiUrl, publicKey, secretKey } = _credenciales();
  const payload = { app_key: publicKey, order_id, amount, currency, description, expires_at };
  const token = firmarToken(payload, secretKey);

  let res;
  try {
    res = await fetch(`${apiUrl}/v1/payments/qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, pk: publicKey }),
    });
  } catch {
    throw Object.assign(new Error('No se pudo generar el QR, intenta de nuevo o cobra en efectivo'), { status: 502 });
  }

  if (!res.ok) {
    throw Object.assign(new Error('No se pudo generar el QR, intenta de nuevo o cobra en efectivo'), { status: 502 });
  }
  return res.json();
}

async function consultarEstado(tx_id) {
  const { apiUrl } = _credenciales();

  let res;
  try {
    res = await fetch(`${apiUrl}/checkout/status/${tx_id}`);
  } catch {
    throw Object.assign(new Error('No se pudo consultar el estado del pago en CodePay'), { status: 502 });
  }

  if (!res.ok) {
    throw Object.assign(new Error('No se pudo consultar el estado del pago en CodePay'), { status: 502 });
  }
  return res.json();
}

// Formato real de X-Codepay-Signature: "t={timestamp},v1={hmac_hex}" —
// el HMAC se calcula sobre "{timestamp}.{rawBody}", no sobre el body solo.
function verificarFirmaWebhook(rawBody, signatureHeader) {
  if (!signatureHeader || !rawBody) return false;

  const partes = Object.fromEntries(
    signatureHeader.split(',').map((parte) => parte.split('=').map((s) => s.trim()))
  );
  const timestamp = partes.t;
  const firmaRecibidaHex = partes.v1;
  if (!timestamp || !firmaRecibidaHex) return false;

  const esperada = createHmac('sha256', process.env.CODEPAY_NOTIFICATION_SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  let recibida, calculada;
  try {
    recibida = Buffer.from(firmaRecibidaHex, 'hex');
    calculada = Buffer.from(esperada, 'hex');
  } catch {
    return false;
  }
  if (recibida.length !== calculada.length) return false;
  return timingSafeEqual(recibida, calculada);
}

module.exports = { firmarToken, generarQr, consultarEstado, verificarFirmaWebhook };
