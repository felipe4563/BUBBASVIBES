import { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

export function useTheme() {
  const { modo, toggleModo } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    if (modo === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [modo]);

  return { modo, toggleModo };
}
