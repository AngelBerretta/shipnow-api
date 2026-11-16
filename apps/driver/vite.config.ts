import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// /api se redirige a la API local en desarrollo. En produccion lo resuelve la
// Pages Function de functions/api (ver docs/etapa-3.md).
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Ruvika Repartidores',
        short_name: 'Ruvika',
        description: 'Tus entregas del día, también sin conexión.',
        lang: 'es-AR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1b232b',
        theme_color: '#1b232b',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        // La API nunca pasa por el service worker: los datos offline los maneja la app (IndexedDB, por usuario).
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    port: 5174,
    allowedHosts: ['.trycloudflare.com'],
    proxy: { '/api': 'http://localhost:3000' },
  },
  preview: {
    port: 4173,
    allowedHosts: ['.trycloudflare.com'],
    proxy: { '/api': 'http://localhost:3000' },
  },
});
