import api from './cliente';

export const getMesas = (params) => api.get('/mesas', { params }).then(r => r.data.datos);
export const crearMesa = (datos) => api.post('/mesas', datos).then(r => r.data.datos);
export const actualizarMesa = (id, datos) => api.put(`/mesas/${id}`, datos).then(r => r.data.datos);
export const eliminarMesa = (id) => api.delete(`/mesas/${id}`).then(r => r.data.datos);
