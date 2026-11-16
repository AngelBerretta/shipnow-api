import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

const background = '#1b232b';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // El ícono tiene fondo propio: el padding de "maskable" y "apple" se rellena con el mismo color.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { fit: 'contain', background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { fit: 'contain', background } },
  },
  images: ['public/icon.svg'],
});