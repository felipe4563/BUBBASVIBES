import api from './cliente';

export const getAreas = () => api.get('/areas').then(r => r.data.datos);
export const crearArea = (datos) => api.post('/areas', datos).then(r => r.data.datos);
export const actualizarArea = (id, datos) => api.put(`/areas/${id}`, datos).then(r => r.data.datos);
export const eliminarArea = (id) => api.delete(`/areas/${id}`).then(r => r.data.datos);
