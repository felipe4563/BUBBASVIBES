import { useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

// El manifest estático que genera vite-plugin-pwa usa el ícono genérico del
// sistema. Lo reemplazamos por el endpoint del backend, que arma el manifest
// al vuelo usando el logo subido en Configuración como ícono de instalación.
export function useDynamicManifest() {
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return;
    link.setAttribute('href', `${API_BASE}/configuracion/manifest.webmanifest`);
  }, []);
}
