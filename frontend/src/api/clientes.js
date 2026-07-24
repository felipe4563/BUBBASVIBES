import api from './cliente';

export const getClientes = (params = {}) =>
  api.get('/clientes', { params }).then(r => r.data.datos);

export const getCliente = (id) =>
  api.get(`/clientes/${id}`).then(r => r.data.datos);

export const crearCliente = (datos) =>
  api.post('/clientes', datos).then(r => r.data.datos);

export const actualizarCliente = (id, datos) =>
  api.put(`/clientes/${id}`, datos).then(r => r.data.datos);
