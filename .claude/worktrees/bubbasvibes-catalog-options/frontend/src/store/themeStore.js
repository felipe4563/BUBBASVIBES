import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      modo: 'light',
      toggleModo: () =>
        set((s) => ({ modo: s.modo === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'theme' }
  )
);
