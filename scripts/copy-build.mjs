// Copia el build de un solo archivo a index.html (raíz): se abre con doble clic.
import { copyFileSync } from 'node:fs';
copyFileSync('dist/dev.html', 'index.html');
console.log('index.html actualizado (juego completo en un solo archivo)');
