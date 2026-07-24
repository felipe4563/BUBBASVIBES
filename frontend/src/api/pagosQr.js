import api from './cliente';

export const consultarEstadoPagoQr = (pedidoId) =>
  api.get(`/ventas/${pedidoId}/pago-qr/estado`).then((r) => r.data.datos);

export const cancelarPagoQr = (pedidoId) =>
  api.post(`/ventas/${pedidoId}/pago-qr/cancelar`).then((r) => r.data.datos);
