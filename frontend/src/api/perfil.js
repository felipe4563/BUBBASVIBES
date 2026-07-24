import api from './cliente';

export const getPerfil = () => api.get('/perfil').then((r) => r.data.datos);

export const actualizarPerfil = (datos) =>
  api.put('/perfil', datos).then((r) => r.data.datos);

export const cambiarContrasena = (datos) =>
  api.put('/perfil/contrasena', datos).then((r) => r.data.datos);
