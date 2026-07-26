import api from './cliente';

// Proveedores
export const getProveedores = () =>
  api.get('/proveedores').then(r => r.data.datos);

export const crearProveedor = (datos) =>
  api.post('/proveedores', datos).then(r => r.data.datos);

export const actualizarProveedor = (id, datos) =>
  api.put(`/proveedores/${id}`, datos).then(r => r.data.datos);

export const desactivarProveedor = (id) =>
  api.delete(`/proveedores/${id}`).then(r => r.data.datos);

// Compras
export const getCompras = () =>
  api.get('/compras').then(r => r.data.datos);

export const getCompra = (id) =>
  api.get(`/compras/${id}`).then(r => r.data.datos);

export const crearCompra = (datos) =>
  api.post('/compras', datos).then(r => r.data.datos);

export const actualizarCompra = (id, datos) =>
  api.put(`/compras/${id}`, datos).then(r => r.data.datos);

export const recibirCompra = (id) =>
  api.put(`/compras/${id}/recibir`).then(r => r.data.datos);
