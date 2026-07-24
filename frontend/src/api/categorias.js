import api from './cliente';

export const getCategorias = () => api.get('/categorias').then(r => r.data.datos);
export const crearCategoria = (datos) => api.post('/categorias', datos).then(r => r.data.datos);
export const actualizarCategoria = (id, datos) => api.put(`/categorias/${id}`, datos).then(r => r.data.datos);
export const eliminarCategoria = (id) => api.delete(`/categorias/${id}`).then(r => r.data.datos);
