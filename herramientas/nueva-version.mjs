// Cambia el "?v=" de los archivos en el index.html por la fecha y hora de ahora (por ejemplo, ?v=20261006-1930).
// Así, cuando se suben cambios, los navegadores bajan los archivos nuevos en vez de seguir usando los que tenían guardados.
// Se corre con: npm run nueva-version (antes de hacer el commit)
import { readFileSync, writeFileSync } from 'node:fs';

const archivo = new URL('../index.html', import.meta.url);
const ahora = new Date();
const dos = numero => String(numero).padStart(2, '0');
const version = `${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}-${dos(ahora.getHours())}${dos(ahora.getMinutes())}`;

const html = readFileSync(archivo, 'utf8');
let cambiados = 0;
const nuevo = html.replace(/(\.(?:js|css))\?v=[\w-]+/g, (_, extension) => {
    cambiados++;
    return `${extension}?v=${version}`;
});
writeFileSync(archivo, nuevo);
console.log(`Versión ${version} puesta en ${cambiados} archivos del index.html`);
