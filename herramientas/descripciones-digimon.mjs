// Baja la descripción en inglés de cada digimon de la API (digi-api.com), para poder traducirlas al español.
// No traduce nada: solo copia a un archivo los mismos textos que la página ya muestra (ver descripcionEnIdioma en api.js).
//
// Se corre desde la carpeta del proyecto, en la terminal:
//   node herramientas/descripciones-digimon.mjs prueba   → prueba rápida con 5 digimons (no escribe nada)
//   node herramientas/descripciones-digimon.mjs          → todos los digimons (un pedido por digimon: son unos 1500, tarda de 10 a 20 minutos)
//
// Se piden pocos a la vez para no abusar de la API. Si se corta (o se cierra la terminal), al volver a correrlo sigue donde quedó:
// lo ya pedido está en herramientas/descripciones-digimon.cache.json.
//
// Al terminar escribe:
//   herramientas/descripciones-digimon.json   → [{ id, nombre, descripcion }], ordenado por ID (el mismo número de la carta en la página)
// y muestra en pantalla cuántas hay y cuánto texto es.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { esperar, pedirJson } from './nombres-japoneses.mjs';

const URL_DE_LA_API = 'https://digi-api.com/api/v1/digimon';
const SIMULTANEOS = 4; // pedidos a la vez
const PAUSA_MS = 150; // pausa de cada "carril" entre un pedido y el siguiente

const archivoCache = new URL('./descripciones-digimon.cache.json', import.meta.url);
const archivoSalida = new URL('./descripciones-digimon.json', import.meta.url);

// Todos los digimons de la API: { id, name }
async function listaDeDigimons(limite = Infinity) {
    const lista = [];
    for (let pagina = 0; pagina < 30 && lista.length < limite; pagina++) {
        const datos = await pedirJson(`${URL_DE_LA_API}?pageSize=100&page=${pagina}`);
        const contenido = datos.content ?? [];
        if (!contenido.length) break;
        for (const digimon of contenido) if (digimon.id && digimon.name) lista.push({ id: digimon.id, name: String(digimon.name).trim() });
    }
    return lista.slice(0, limite);
}

// La descripción en inglés de un digimon, igual que la elige la página (api.js): la de idioma "en_us" o, si no, una parecida; vacía si no tiene
async function descripcionDe(digimon) {
    const detalles = await pedirJson(`${URL_DE_LA_API}/${digimon.id}`);
    const descripciones = Array.isArray(detalles.descriptions) ? detalles.descriptions : [];
    const buscada = descripciones.find(texto => texto.language === 'en_us' && texto.description?.trim());
    const parecida = buscada ?? descripciones.find(texto => /^en/i.test(String(texto.language)) && texto.description?.trim());
    return parecida?.description.trim() ?? '';
}

function leerCache() {
    try {
        return existsSync(archivoCache) ? JSON.parse(readFileSync(archivoCache, 'utf8')) : {};
    } catch {
        return {}; // un caché dañado se rehace
    }
}

async function principal() {
    const prueba = process.argv.includes('prueba');
    console.log('Pidiendo la lista de digimons a la API…');
    const digimons = await listaDeDigimons(prueba ? 5 : Infinity);
    console.log(`${digimons.length} digimons.`);

    const cache = prueba ? {} : leerCache(); // ID → { nombre, descripcion }
    const pendientes = digimons.filter(digimon => !(digimon.id in cache));
    console.log(`Faltan pedir ${pendientes.length}.`);

    let hechos = 0;
    let siguiente = 0;
    const carril = async () => {
        while (siguiente < pendientes.length) {
            const digimon = pendientes[siguiente++];
            cache[digimon.id] = { nombre: digimon.name, descripcion: await descripcionDe(digimon) };
            hechos++;
            if (!prueba && hechos % 50 === 0) {
                writeFileSync(archivoCache, JSON.stringify(cache));
                console.log(`  ${hechos} / ${pendientes.length}`);
            }
            await esperar(PAUSA_MS);
        }
    };
    await Promise.all(Array.from({ length: SIMULTANEOS }, carril));
    if (!prueba) writeFileSync(archivoCache, JSON.stringify(cache));

    const lista = digimons
        .filter(digimon => cache[digimon.id]?.descripcion)
        .map(digimon => ({ id: digimon.id, nombre: digimon.name, descripcion: cache[digimon.id].descripcion }))
        .sort((a, b) => a.id - b.id);
    const sinDescripcion = digimons.length - lista.length;
    const letras = lista.reduce((suma, item) => suma + item.descripcion.length, 0);
    console.log(`\nDigimons con descripción en inglés: ${lista.length} (sin descripción: ${sinDescripcion}).`);
    console.log(`Largo total: ${letras} letras (unas ${Math.round(letras / 5)} palabras).`);

    if (prueba) {
        console.log('\nEjemplos:');
        for (const item of lista) console.log(`- #${item.id} ${item.nombre}: ${item.descripcion.slice(0, 140)}`);
        console.log('\nSi se ve bien, corré el programa sin "prueba" para hacer todos.');
        return;
    }
    writeFileSync(archivoSalida, JSON.stringify(lista, null, 1));
    console.log('\nListo: herramientas/descripciones-digimon.json. Avisale a Claude para empezar a traducirlas.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    principal().catch(error => {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    });
}
