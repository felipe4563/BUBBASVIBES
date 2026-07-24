import api from './cliente';

export const getUsuarios  = ()           => api.get('/usuarios').then(r => r.data.datos);
export const crearUsuario = (datos)      => api.post('/usuarios', datos).then(r => r.data.datos);
export const actualizarUsuario = (id, datos) => api.put(`/usuarios/${id}`, datos).then(r => r.data.datos);
export const eliminarUsuario   = (id)    => api.delete(`/usuarios/${id}`).then(r => r.data.datos);
export const actualizarSucursalesUsuario = (id, datos) => api.put(`/usuarios/${id}/sucursales`, datos).then(r => r.data.datos);
