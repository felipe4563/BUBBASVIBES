import api from './cliente';

export const getProductos = (params) => api.get('/productos', { params }).then(r => r.data.datos);
export const getProducto = (id) => api.get(`/productos/${id}`).then(r => r.data.datos);
export const crearProducto = (datos) => api.post('/productos', datos).then(r => r.data.datos);
export const actualizarProducto = (id, datos) => api.put(`/productos/${id}`, datos).then(r => r.data.datos);
export const eliminarProducto = (id) => api.delete(`/productos/${id}`).then(r => r.data.datos);

export const subirImagenProducto = (archivo) => {
  const fd = new FormData();
  fd.append('imagen', archivo);
  return api.post('/uploads/imagen', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.datos.url);
};
