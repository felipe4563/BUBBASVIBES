import api from './cliente';

export const getInventario = (params = {}) =>
  api.get('/inventario', { params }).then(r => r.data.datos);

export const getInventarioPorProducto = (productoId) =>
  api.get(`/inventario/producto/${productoId}`).then(r => r.data.datos);

export const registrarEntrada = (datos) =>
  api.post('/inventario/entrada', datos).then(r => r.data.datos);

export const registrarSalida = (datos) =>
  api.post('/inventario/salida', datos).then(r => r.data.datos);

export const registrarAjuste = (datos) =>
  api.post('/inventario/ajuste', datos).then(r => r.data.datos);
