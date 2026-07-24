const { Router } = require('express');
const codepayClient = require('../integrations/codepay/codepay.client');
const ventasService = require('../modules/ventas/ventas.service');

const router = Router();

router.post('/codepay', async (req, res) => {
  const firmaValida = codepayClient.verificarFirmaWebhook(req.rawBody, req.headers['x-codepay-signature']);
  if (!firmaValida) {
    return res.status(401).json({ ok: false, mensaje: 'Firma inválida' });
  }

  try {
    await ventasService.procesarWebhookPagoQr(req.body);
  } catch (err) {
    console.error('Error procesando webhook de CodePay:', err);
  }

  res.status(200).json({ ok: true });
});

module.exports = router;
