import api from './cliente';

export const getVentas = (params) =>
  api.get('/ventas', { params }).then((r) => r.data.datos);

export const crearVenta = (datos) =>
  api.post('/ventas', datos).then((r) => r.data.datos);

export const getVenta = (id) =>
  api.get(`/ventas/${id}`).then((r) => r.data.datos);

export const agregarItem = (pedido_id, datos) =>
  api.post(`/ventas/${pedido_id}/items`, datos).then((r) => r.data.datos);

export const actualizarItem = (pedido_id, item_id, datos) =>
  api.put(`/ventas/${pedido_id}/items/${item_id}`, datos).then((r) => r.data.datos);

export const eliminarItem = (pedido_id, item_id) =>
  api.delete(`/ventas/${pedido_id}/items/${item_id}`).then((r) => r.data.datos);

export const cobrarVenta = (pedido_id, datos) =>
  api.post(`/ventas/${pedido_id}/cobrar`, datos).then((r) => r.data.datos);

export const cancelarVenta = (pedido_id) =>
  api.post(`/ventas/${pedido_id}/cancelar`).then((r) => r.data.datos);

export const getCocinaOrders = () =>
  api.get('/ventas/cocina').then((r) => r.data.datos);

export const marcarListo = (pedido_id) =>
  api.patch(`/ventas/${pedido_id}/listo`).then((r) => r.data.datos);

export const crearVentaCompleta = (datos) =>
  api.post('/ventas/completa', datos).then((r) => r.data.datos);
