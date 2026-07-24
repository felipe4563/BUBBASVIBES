import api from './cliente';

export const getCajas       = (params = {}) => api.get('/cajas', { params }).then(r => r.data.datos);
export const crearCaja      = (datos)       => api.post('/cajas', datos).then(r => r.data.datos);
export const actualizarCaja = (id, datos)   => api.put(`/cajas/${id}`, datos).then(r => r.data.datos);
export const eliminarCaja   = (id)          => api.delete(`/cajas/${id}`).then(r => r.data.datos);
