import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      usuario: null,
      setAuth: ({ token, refresh_token, usuario }) =>
        set({ token, refreshToken: refresh_token, usuario }),
      setToken: (token) => set({ token }),
      updateUsuario: (campos) =>
        set((s) => ({ usuario: s.usuario ? { ...s.usuario, ...campos } : s.usuario })),
      logout: () => set({ token: null, refreshToken: null, usuario: null }),
    }),
    { name: 'auth' }
  )
);
