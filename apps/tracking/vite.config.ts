import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// En desarrollo /api se redirige a la API local. En producción el portal llama
// directo a la API (VITE_API_URL): ver docs/etapa-4.md.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5175, proxy: { '/api': 'http://localhost:3000' } },
});