import api from './cliente';

export const getGruposOpciones = () => api.get('/grupos-opciones').then(r => r.data.datos);
export const crearGrupoOpciones = (datos) => api.post('/grupos-opciones', datos).then(r => r.data.datos);
export const actualizarGrupoOpciones = (id, datos) => api.put(`/grupos-opciones/${id}`, datos).then(r => r.data.datos);
export const eliminarGrupoOpciones = (id) => api.delete(`/grupos-opciones/${id}`).then(r => r.data.datos);
