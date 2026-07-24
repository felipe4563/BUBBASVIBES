import api from './cliente';

export const getRoles    = ()        => api.get('/roles').then(r => r.data.datos);
export const getPermisos = ()        => api.get('/roles/permisos').then(r => r.data.datos);
export const crearRol    = (datos)   => api.post('/roles', datos).then(r => r.data.datos);
export const actualizarRol = (id, datos) => api.put(`/roles/${id}`, datos).then(r => r.data.datos);
export const eliminarRol = (id)      => api.delete(`/roles/${id}`).then(r => r.data.datos);
