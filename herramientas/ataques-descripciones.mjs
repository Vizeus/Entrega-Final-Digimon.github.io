// Junta las descripciones de los ataques de todos los digimons de la API (digi-api.com), sin repetir, para poder traducirlas al japonés.
// La API trae cada descripción solo en inglés (la de Wikimon): no hay una versión japonesa para copiar, así que se traducen aparte.
//
// Se corre desde la carpeta del proyecto, en la terminal:
//   node herramientas/ataques-descripciones.mjs prueba   → prueba rápida con 5 digimons (no escribe nada)
//   node herramientas/ataques-descripciones.mjs          → todos los digimons (un pedido por digimon: son unos 1500, tarda de 10 a 20 minutos)
//
// A la API no hace falta darle pausas largas como a Wikimon, pero se piden pocos a la vez para no abusar. Si se corta (o se cierra la terminal),
// al volver a correrlo sigue donde quedó: lo ya pedido está en herramientas/ataques-descripciones.cache.json.
//
// Al terminar escribe:
//   herramientas/ataques-descripciones.json   → cada descripción distinta, con los ataques que la usan (para pasárselo a Claude y que la traduzca)
// y muestra en pantalla cuántas hay (en total, distintas y cuántas se repiten).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { esperar, pedirJson } from './nombres-japoneses.mjs';

const URL_DE_LA_API = 'https://digi-api.com/api/v1/digimon';
const SIMULTANEOS = 4; // pedidos a la vez
const PAUSA_MS = 150; // pausa de cada "carril" entre un pedido y el siguiente
const NOTA_AL_PIE = /^\[N\s*\d+\]$/i; // lo mismo que filtra la página: "[N 1]" no es un ataque

const archivoCache = new URL('./ataques-descripciones.cache.json', import.meta.url);
const archivoSalida = new URL('./ataques-descripciones.json', import.meta.url);

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

// Los ataques de un digimon con su descripción
async function ataquesDe(digimon) {
    const detalles = await pedirJson(`${URL_DE_LA_API}/${digimon.id}`);
    return (detalles.skills ?? [])
        .filter(habilidad => habilidad.skill && !NOTA_AL_PIE.test(habilidad.skill))
        .map(habilidad => ({
            ataque: String(habilidad.skill).trim(),
            traduccion: String(habilidad.translation ?? '').trim(),
            descripcion: String(habilidad.description ?? '').trim(),
        }));
}

// De todos los ataques de todos los digimons arma la lista de descripciones distintas: { descripcion, ataques: [nombres], digimons: cantidad }
export function juntarDescripciones(porDigimon) {
    const mapa = new Map();
    for (const [nombreDelDigimon, ataques] of Object.entries(porDigimon)) {
        for (const { ataque, traduccion, descripcion } of ataques ?? []) {
            if (!descripcion) continue;
            const actual = mapa.get(descripcion) ?? { descripcion, ataques: new Set(), traducciones: new Set(), digimons: new Set() };
            actual.ataques.add(ataque);
            if (traduccion) actual.traducciones.add(traduccion);
            actual.digimons.add(nombreDelDigimon);
            mapa.set(descripcion, actual);
        }
    }
    return [...mapa.values()]
        .map(({ descripcion, ataques, traducciones, digimons }) => ({
            descripcion,
            ataques: [...ataques].slice(0, 4), // unos pocos nombres, para dar contexto al traducir
            traduccion: [...traducciones][0] ?? '', // lo que dice la API que significa el nombre del ataque
            digimons: digimons.size,
        }))
        .sort((a, b) => b.digimons - a.digimons || a.descripcion.localeCompare(b.descripcion, 'en'));
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

    const cache = prueba ? {} : leerCache(); // nombre del digimon → sus ataques
    const pendientes = digimons.filter(digimon => !(digimon.name in cache));
    console.log(`Faltan pedir ${pendientes.length}.`);

    let hechos = 0;
    let siguiente = 0;
    const carril = async () => {
        while (siguiente < pendientes.length) {
            const digimon = pendientes[siguiente++];
            cache[digimon.name] = await ataquesDe(digimon);
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

    const lista = juntarDescripciones(cache);
    const total = Object.values(cache).reduce((suma, ataques) => suma + ataques.filter(ataque => ataque.descripcion).length, 0);
    const repetidas = lista.filter(item => item.digimons > 1).length;
    const letras = lista.reduce((suma, item) => suma + item.descripcion.length, 0);
    console.log(`\nAtaques con descripción: ${total} (sumando todos los digimons).`);
    console.log(`Descripciones distintas: ${lista.length} (${repetidas} de ellas se repiten en más de un digimon).`);
    console.log(`Largo total de las distintas: ${letras} letras (unas ${Math.round(letras / 5)} palabras).`);

    if (prueba) {
        console.log('\nEjemplos:');
        for (const item of lista.slice(0, 5)) console.log(`- [${item.ataques.join(', ')}] ${item.descripcion.slice(0, 140)}`);
        console.log('\nSi se ve bien, corré el programa sin "prueba" para hacer todos.');
        return;
    }
    writeFileSync(archivoSalida, JSON.stringify(lista, null, 1));
    console.log('\nListo: herramientas/ataques-descripciones.json. Pasáselo a Claude para traducirlas.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    principal().catch(error => {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    });
}
