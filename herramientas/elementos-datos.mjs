// Junta, de cada digimon de la API (digi-api.com), los datos que sirven para revisar cómo se deduce su elemento: nivel, especies ("types"), grupos
// ("fields"), descripción en inglés y ataques (nombre, traducción y descripción). No cambia nada de la página: solo copia a un archivo.
//
// Se corre desde la carpeta del proyecto, en la terminal:
//   node herramientas/elementos-datos.mjs prueba   → prueba rápida con 5 digimons (no escribe nada)
//   node herramientas/elementos-datos.mjs          → todos los digimons (un pedido por digimon: son unos 1500, tarda de 10 a 20 minutos)
//
// Se piden pocos a la vez para no abusar de la API. Si se corta (o se cierra la terminal), al volver a correrlo sigue donde quedó:
// lo ya pedido está en herramientas/elementos-datos.cache.json.
//
// Al terminar escribe:
//   herramientas/elementos-datos.json   → [{ id, nombre, nivel, especies, grupos, previas, siguientes, descripcion, ataques }], ordenado por ID

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { esperar, pedirJson } from './nombres-japoneses.mjs';

const URL_DE_LA_API = 'https://digi-api.com/api/v1/digimon';
const SIMULTANEOS = 4; // pedidos a la vez
const PAUSA_MS = 150; // pausa de cada "carril" entre un pedido y el siguiente

const archivoCache = new URL('./elementos-datos.cache.json', import.meta.url);
const archivoSalida = new URL('./elementos-datos.json', import.meta.url);

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

// La descripción en inglés, igual que la elige la página (api.js): la de idioma "en_us" o, si no, una parecida; vacía si no tiene
function descripcionEnIngles(detalles) {
    const descripciones = Array.isArray(detalles.descriptions) ? detalles.descriptions : [];
    const buscada = descripciones.find(texto => texto.language === 'en_us' && texto.description?.trim());
    const parecida = buscada ?? descripciones.find(texto => /^en/i.test(String(texto.language)) && texto.description?.trim());
    return parecida?.description.trim() ?? '';
}

async function datosDe(digimon) {
    const detalles = await pedirJson(`${URL_DE_LA_API}/${digimon.id}`);
    return {
        nombre: digimon.name,
        nivel: detalles.levels?.[0]?.level ?? '',
        especies: (detalles.types || []).map(especie => especie.type).filter(Boolean),
        grupos: (detalles.fields || []).map(campo => campo.field).filter(Boolean),
        previas: (detalles.priorEvolutions || []).map(evolucion => evolucion.id).filter(Boolean), // las evoluciones vecinas (por ID), para detectar elementos que desentonan con su línea
        siguientes: (detalles.nextEvolutions || []).map(evolucion => evolucion.id).filter(Boolean),
        descripcion: descripcionEnIngles(detalles),
        ataques: (detalles.skills || [])
            .filter(habilidad => habilidad.skill && !/^\[N\s*\d+\]$/i.test(habilidad.skill))
            .map(habilidad => ({ ataque: habilidad.skill, traduccion: habilidad.translation || '', descripcion: habilidad.description || '' })),
    };
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
    const cache = prueba ? {} : leerCache(); // ID → datos
    const pendientes = digimons.filter(digimon => !cache[digimon.id]?.previas); // (lo que quedó de una versión anterior sin evoluciones se vuelve a pedir)
    console.log(`Faltan pedir ${pendientes.length}.`);

    let hechos = 0;
    let siguiente = 0;
    const carril = async () => {
        while (siguiente < pendientes.length) {
            const digimon = pendientes[siguiente++];
            cache[digimon.id] = await datosDe(digimon);
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

    const lista = digimons.map(digimon => ({ id: digimon.id, ...cache[digimon.id] })).sort((a, b) => a.id - b.id);
    const conGrupos = lista.filter(item => item.grupos.length).length;
    console.log(`\nDigimons: ${lista.length} (con algún grupo: ${conGrupos}).`);

    if (prueba) {
        console.log('\nEjemplos:');
        for (const item of lista)
            console.log(`- #${item.id} ${item.nombre}: especies [${item.especies}] · grupos [${item.grupos}] · ${item.ataques.length} ataques`);
        console.log('\nSi se ve bien, corré el programa sin "prueba" para hacer todos.');
        return;
    }
    writeFileSync(archivoSalida, JSON.stringify(lista, null, 1));
    console.log('\nListo: herramientas/elementos-datos.json. Avisale a Claude para seguir con la revisión de los elementos.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    principal().catch(error => {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    });
}
