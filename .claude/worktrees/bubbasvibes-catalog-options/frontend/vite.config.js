import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Strip /api/v1 to get the server origin (e.g. http://localhost:3001)
  const apiBase = (env.VITE_API_URL ?? 'http://localhost:3001/api/v1').replace('/api/v1', '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // Enable in dev so the SW is exercised without a production build
        devOptions: { enabled: true, type: 'module' },
        includeAssets: ['favicon.svg', 'icons/icon.svg'],
        manifest: {
          name: 'Sistema Restaurante',
          short_name: 'Restaurante',
          description: 'Sistema de gestión integral para restaurantes',
          theme_color: '#d97706',
          background_color: '#130D07',
          display: 'standalone',
          start_url: '/',
          orientation: 'portrait-primary',
          lang: 'es',
          categories: ['business', 'food'],
          icons: [
            {
              src: '/icons/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: '/icons/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Nueva Venta',
              url: '/ventas',
              description: 'Ir al punto de venta',
              icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
            },
            {
              name: 'Cocina',
              url: '/cocina',
              description: 'Ver pedidos en cocina',
              icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
            },
          ],
        },
        workbox: {
          // Pre-cache every asset produced by the build
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // SPA: always serve index.html for navigation requests
          navigateFallback: '/index.html',
          // Never intercept API or upload requests with the navigate fallback
          navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
          runtimeCaching: [
            {
              // Static uploads (logos, product images) — cache-first, 30 days
              urlPattern: new RegExp(`^${apiBase}/uploads/`),
              handler: 'CacheFirst',
              options: {
                cacheName: 'uploads-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // GET API calls — network-first (10 s timeout), falls back to cache
              urlPattern: new RegExp(`^${apiBase}/api/`),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 150, maxAgeSeconds: 60 * 10 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Google Fonts stylesheets
              urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              // Google Fonts files
              urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    server: {
      host: true,   // escucha en 0.0.0.0, expone la IP local
      port: 5173,
    },
  };
});
