import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  // Todo (JS, CSS) se incrusta en un único HTML: así el juego funciona al abrir
  // index.html con doble clic (file://), sin servidor.
  plugins: [viteSingleFile()],
  base: './',
  server: { open: '/dev.html' },
  build: {
    rollupOptions: { input: 'dev.html' },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
