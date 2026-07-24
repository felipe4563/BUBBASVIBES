import { useAuthStore } from '../store/authStore';

export function usePermisos() {
  const usuario = useAuthStore((s) => s.usuario);
  // Backend devuelve permisos como ["ventas.ver", "caja.abrir", ...]
  const permisos = usuario?.permisos ?? [];

  function tienePermiso(modulo, accion) {
    return permisos.includes(`${modulo}.${accion}`);
  }

  return { tienePermiso };
}
