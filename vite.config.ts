import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Identificador de cada build: el juego lo compara con el publicado para avisar de versiones nuevas. */
const BUILD_ID = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

export default defineConfig({
  // Todo (JS, CSS) se incrusta en un único HTML: así el juego funciona al abrir
  // index.html con doble clic (file://), sin servidor.
  plugins: [
    viteSingleFile(),
    {
      name: 'build-id',
      transformIndexHtml: (html) => html.replace('</head>', `  <meta name="build-id" content="${BUILD_ID}" />\n  </head>`),
    },
  ],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  base: './',
  // assets/ (arte final opcional) se sirve tal cual desde la raíz, igual en desarrollo y en GitHub Pages.
  publicDir: false,
  server: { open: '/dev.html' },
  build: {
    rollupOptions: { input: 'dev.html' },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
