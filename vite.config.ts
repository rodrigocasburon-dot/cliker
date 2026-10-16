import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el build funciona servido desde cualquier subcarpeta.
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
