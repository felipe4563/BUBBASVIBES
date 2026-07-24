import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  return { usuario, token, estaAutenticado: !!token, logout };
}
