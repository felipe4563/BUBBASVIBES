import api from './cliente';

export const getSucursales       = ()          => api.get('/sucursales').then(r => r.data.datos);
export const crearSucursal       = (datos)     => api.post('/sucursales', datos).then(r => r.data.datos);
export const actualizarSucursal  = (id, datos) => api.put(`/sucursales/${id}`, datos).then(r => r.data.datos);
export const eliminarSucursal    = (id)        => api.delete(`/sucursales/${id}`).then(r => r.data.datos);
