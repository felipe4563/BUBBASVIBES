// Simula el webhook de confirmación de CodePay contra el backend local.
// Uso:
//   node scripts/simular-webhook-codepay.js                     -> confirma el pago QR pendiente más reciente
//   node scripts/simular-webhook-codepay.js pedido_12_1          -> confirma ese order_id puntual
//   node scripts/simular-webhook-codepay.js pedido_12_1 payment.failed  -> simula un pago fallido
require('dotenv').config();
const { createHmac } = require('crypto');
const { PagoQr } = require('../src/models');

async function main() {
  const [, , ordenArg, eventoArg] = process.argv;
  const evento = eventoArg || 'payment.completed';

  const pagoQr = ordenArg
    ? await PagoQr.findOne({ where: { order_id: ordenArg } })
    : await PagoQr.findOne({ where: { estado: 'pendiente' }, order: [['id', 'DESC']] });

  if (!pagoQr) {
    console.error('No se encontró ningún pago QR pendiente. Cobrá una venta eligiendo "QR" en el sistema primero.');
    process.exit(1);
  }

  const body = { event: evento, order_id: pagoQr.order_id, tx_id: pagoQr.tx_id };
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000);
  const hmac = createHmac('sha256', process.env.CODEPAY_NOTIFICATION_SECRET).update(`${timestamp}.${raw}`).digest('hex');
  const firma = `t=${timestamp},v1=${hmac}`;

  const res = await fetch(`http://localhost:${process.env.PORT || 3001}/webhooks/codepay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Codepay-Signature': firma },
    body: raw,
  });

  console.log(`order_id=${pagoQr.order_id} evento=${evento} -> HTTP ${res.status}`);
  console.log(await res.text());
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
