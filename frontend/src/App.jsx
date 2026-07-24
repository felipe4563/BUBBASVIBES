import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router/index.jsx';
import { useTheme } from './hooks/useTheme';
import OfflineIndicator from './components/pwa/OfflineIndicator';
import InstallPrompt from './components/pwa/InstallPrompt';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// Sincroniza la clase 'dark' en <html> según el store
function ThemeSync() {
  useTheme();
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <OfflineIndicator />
      <InstallPrompt />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
