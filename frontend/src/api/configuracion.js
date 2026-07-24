import api from './cliente';

// URL base del servidor (sin /api/v1) para construir rutas de archivos estáticos
export const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1').replace('/api/v1', '');

export const logoSrc = (path) => (path ? `${BASE_URL}${path}` : null);

export const getConfiguracion = () =>
  api.get('/configuracion').then((r) => r.data.datos);

export const getConfiguracionPublica = () =>
  api.get('/configuracion/publica').then((r) => r.data.datos);

export const actualizarConfiguracion = (datos) =>
  api.put('/configuracion', datos).then((r) => r.data.datos);

export const subirLogo = (file) => {
  const form = new FormData();
  form.append('imagen', file);
  return api.post('/uploads/imagen', form).then((r) => r.data.datos.url);
};
