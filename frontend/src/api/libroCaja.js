import api from './cliente';

export const getLibroCaja = (params = {}) =>
  api.get('/libro-caja', { params }).then(r => r.data.datos);

export const crearMovimiento = (datos) =>
  api.post('/libro-caja', datos).then(r => r.data.datos);
