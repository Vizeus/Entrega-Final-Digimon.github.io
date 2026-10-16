// Revisa el atributo (Vacuna, Virus, Datos…) de todos los digimons comparando la API (digi-api.com) con Wikimon (wikimon.net), y arma la lista de
// correcciones para los que no coinciden (por ejemplo WereGarurumon: la API dice Datos y Wikimon dice Vacuna).
//
// Se corre desde la carpeta del proyecto, en la terminal:
//   node herramientas/atributos-wikimon.mjs prueba   → prueba rápida con 10 digimons (un solo pedido a Wikimon, tarda como 1 minuto; no escribe nada)
//   node herramientas/atributos-wikimon.mjs          → todos los digimons (unos 30 pedidos a Wikimon; tarda como 30 minutos)
//
// Igual que el de los nombres japoneses: respeta la pausa de 60 segundos entre pedidos que pide Wikimon, y si se corta (o se cierra la terminal),
// al volver a correrlo sigue desde donde quedó: lo ya pedido está en herramientas/atributos-wikimon.cache.json.
//
// A quién le cree la página, de más a menos:
//   1. herramientas/atributos-a-mano.json → (lo escribe una persona) { "ID del digimon": "Vacuna" }, para cuando Wikimon tampoco acierta o no trae el dato
//   2. Wikimon (su atributo principal, el "a1" de la ficha; si dice 'None' o no tiene al digimon, no opina)
//   3. la API (lo que trae digi-api.com; es lo que pasa si el digimon no está en la lista de correcciones)
//
// Al terminar escribe:
//   atributosCorregidos.js                      → { ID → atributo } SOLO de los digimons donde la API no coincide con Wikimon (o con la lista a mano)
//   herramientas/atributos-diferencias.txt      → el informe: qué cambió, qué no se encontró en Wikimon y cuáles no traen atributo

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { atributoDeLaApi } from '../datos.js';
import { listaDeDigimons } from './elementos-datos.mjs';
import { ESPERA_MS, POR_PEDIDO, esperar, pedirJson, traerPaginas, variantesDelNombre } from './nombres-japoneses.mjs';

const URL_DE_LA_API = 'https://digi-api.com/api/v1/digimon';
const SIMULTANEOS = 4; // pedidos a la API a la vez
const PAUSA_MS = 150; // pausa de cada "carril" entre un pedido y el siguiente

const archivoCache = new URL('./atributos-wikimon.cache.json', import.meta.url);
const archivoAMano = new URL('./atributos-a-mano.json', import.meta.url);
const archivoInforme = new URL('./atributos-diferencias.txt', import.meta.url);
const archivoSalida = new URL('../atributosCorregidos.js', import.meta.url);

// (nombres tal cual los trae la API: Tailmon es Gatomon, Omegamon es Omnimon, Vamdemon es Myotismon…)
const PRUEBA = ['Were Garurumon', 'Metal Garurumon', 'Agumon', 'Greymon', 'Zurumon', 'Kuramon', 'Tailmon', 'Omegamon', 'Vamdemon', 'Algomon (Baby I)'];

// Los atributos que existen, tal cual los escribe Wikimon (en inglés). Todo lo demás que aparezca en ese campo ('None', 'No Data'…) no es un atributo.
const ATRIBUTOS_VALIDOS = Object.keys(atributoDeLaApi); // Data, Vaccine, Virus, Free, Variable, Unknown

// De una página de Wikimon saca los atributos de la ficha. Wikimon los guarda en los campos "a1", "a2", "a3"…: el "a1" es el atributo principal
// (el oficial) y los demás son los que les dieron otros juegos. Devuelve { principal, otros, linea }:
//   principal → el valor del "a1" tal cual ('Vaccine', 'None'…); null si la ficha no tiene "a1"
//   otros     → los valores de "a2", "a3"… tal cual
//   linea     → los renglones que se leyeron, para poder revisarlos en el informe
export function extraerAtributos(wikitexto) {
    const texto = String(wikitexto ?? '');
    const valores = new Map(); // número del campo → valor (solo el primero de cada número: es el de la ficha principal de la página)
    for (const coincidencia of texto.matchAll(/\|\s*a(\d+)\s*=([^\n|{<]*)/g)) {
        const [, numero, valor] = coincidencia;
        if (!valores.has(numero)) valores.set(numero, valor.replace(/\[\[([^\]|]*)(?:\|[^\]]*)?\]\]/g, '$1').trim());
    }
    if (!valores.has('1')) return null;
    const otros = [...valores].filter(([numero]) => numero !== '1').map(([, valor]) => valor);
    return { principal: valores.get('1'), otros, linea: [...valores].map(([numero, valor]) => `a${numero}=${valor}`).join(' ') };
}

// Wikimon: { título pedido → { pagina: true, principal, otros, linea } | { pagina: true, principal: null, inicio } | { pagina: false } }
async function buscarEnWikimon(titulos) {
    const paginas = await traerPaginas(titulos);
    return Object.fromEntries(
        Object.entries(paginas).map(([pedido, texto]) => {
            if (!texto) return [pedido, { pagina: false }];
            const ficha = extraerAtributos(texto);
            // Si la página existe pero no tiene el campo "a1", se guarda el comienzo del texto: así se puede ver por qué sin volver a pedir
            return [pedido, ficha ? { pagina: true, ...ficha } : { pagina: true, principal: null, inicio: texto.slice(0, 500) }];
        }),
    );
}

// El atributo (en inglés, 'Data', 'Vaccine'…) que trae la API para un digimon; '' si no trae
async function atributoDeLaApiPara(digimon) {
    const detalles = await pedirJson(`${URL_DE_LA_API}/${digimon.id}`);
    return detalles.attributes?.[0]?.attribute ?? '';
}

function leerCache() {
    try {
        const cache = existsSync(archivoCache) ? JSON.parse(readFileSync(archivoCache, 'utf8')) : {};
        return { api: cache.api ?? {}, wikimon: cache.wikimon ?? {} };
    } catch {
        return { api: {}, wikimon: {} }; // un caché dañado se rehace
    }
}

// Lo que dice Wikimon de un digimon, probando también las otras formas de escribir su nombre ('Dukemon (Crimson Mode)' → 'Dukemon: Crimson Mode'…).
// Se queda con la primera página que tenga ficha de atributos (campo "a1"), aunque diga 'None'.
function fichaDe(nombre, cacheWikimon) {
    for (const forma of [nombre, ...variantesDelNombre(nombre)]) {
        const ficha = cacheWikimon[forma];
        if (ficha?.pagina && ficha.principal !== null && ficha.principal !== undefined) return ficha;
    }
    return null;
}

// El atributo principal de Wikimon, ya con el nombre que usamos por dentro ('Vacuna'…); null si Wikimon no trae un atributo (dice 'None', 'No Data'…)
function principalDe(ficha) {
    const atributo = ATRIBUTOS_VALIDOS.find(valido => valido.toLowerCase() === String(ficha?.principal ?? '').toLowerCase());
    return atributo ? atributoDeLaApi[atributo] : null;
}

async function principal() {
    const prueba = process.argv.includes('prueba');
    console.log('Pidiendo la lista de digimons a la API…');
    const todos = await listaDeDigimons();
    const digimons = prueba ? PRUEBA.map(nombre => todos.find(digimon => digimon.name === nombre)).filter(Boolean) : todos;
    console.log(`${digimons.length} digimons.`);

    const cache = prueba ? { api: {}, wikimon: {} } : leerCache();

    // 1) El atributo que trae la API de cada digimon (4 pedidos a la vez)
    const pendientesApi = digimons.filter(digimon => !(digimon.id in cache.api));
    console.log(`Faltan pedir ${pendientesApi.length} a la API.`);
    let hechos = 0;
    let siguiente = 0;
    const carril = async () => {
        while (siguiente < pendientesApi.length) {
            const digimon = pendientesApi[siguiente++];
            cache.api[digimon.id] = await atributoDeLaApiPara(digimon);
            hechos++;
            if (!prueba && hechos % 50 === 0) {
                writeFileSync(archivoCache, JSON.stringify(cache));
                console.log(`  ${hechos} / ${pendientesApi.length}`);
            }
            await esperar(PAUSA_MS);
        }
    };
    await Promise.all(Array.from({ length: SIMULTANEOS }, carril));
    if (!prueba) writeFileSync(archivoCache, JSON.stringify(cache));

    // 2) Lo que dice Wikimon (de a 50 por pedido, con la pausa que pide). Primero los nombres tal cual; después, para los que no aparecieron, otras formas.
    const buscarLosQueFaltan = async lista => {
        const pendientes = lista.filter(titulo => !(titulo in cache.wikimon));
        const pedidos = Math.ceil(pendientes.length / POR_PEDIDO);
        if (!pedidos) return;
        console.log(
            `Faltan buscar ${pendientes.length} en Wikimon (${pedidos} pedidos, con ${ESPERA_MS / 1000} s de pausa entre cada uno: unos ${Math.ceil((pedidos * ESPERA_MS) / 60000)} minutos).`,
        );
        for (let desde = 0; desde < pendientes.length; desde += POR_PEDIDO) {
            Object.assign(cache.wikimon, await buscarEnWikimon(pendientes.slice(desde, desde + POR_PEDIDO)));
            if (!prueba) writeFileSync(archivoCache, JSON.stringify(cache));
            console.log(`  ${Math.min(desde + POR_PEDIDO, pendientes.length)} / ${pendientes.length}`);
            if (desde + POR_PEDIDO < pendientes.length) await esperar(ESPERA_MS);
        }
    };
    const nombres = digimons.map(digimon => digimon.name);
    await buscarLosQueFaltan(nombres);
    if (!prueba) {
        const sinFicha = nombres.filter(nombre => !fichaDe(nombre, cache.wikimon));
        const otrasFormas = [...new Set(sinFicha.flatMap(variantesDelNombre))];
        if (otrasFormas.some(forma => !(forma in cache.wikimon))) {
            console.log('\nProbando otras formas de escribir los que no aparecieron…');
            await buscarLosQueFaltan(otrasFormas);
        }
    }

    // 3) Comparar. Vale el atributo principal de Wikimon (el "a1"); si Wikimon dice 'None' o no tiene al digimon, no opina y se queda el de la API.
    const aMano = existsSync(archivoAMano) ? JSON.parse(readFileSync(archivoAMano, 'utf8')) : {};
    const cambios = []; // { id, nombre, api, nuevo, motivo }
    const sinPagina = []; // Wikimon no tiene la página (o no tiene la ficha de atributos)
    const sinPrincipal = []; // Wikimon tiene la página, pero su atributo principal es 'None' o 'No Data'
    let iguales = 0;
    for (const digimon of digimons) {
        const api = atributoDeLaApi[cache.api[digimon.id]] || 'Desconocido';
        const ficha = fichaDe(digimon.name, cache.wikimon);
        const wikimon = principalDe(ficha);
        if (aMano[digimon.id]) {
            if (aMano[digimon.id] !== api) cambios.push({ id: digimon.id, nombre: digimon.name, api, nuevo: aMano[digimon.id], motivo: 'a mano' });
            else iguales++;
        } else if (!ficha) sinPagina.push(digimon);
        else if (!wikimon) sinPrincipal.push({ digimon, api, linea: ficha.linea });
        else if (wikimon !== api) cambios.push({ id: digimon.id, nombre: digimon.name, api, nuevo: wikimon, motivo: `Wikimon: ${ficha.linea}` });
        else iguales++;
    }

    if (prueba) {
        console.log('\nPrueba (API → Wikimon):');
        for (const digimon of digimons) {
            const ficha = fichaDe(digimon.name, cache.wikimon);
            const crudo = cache.wikimon[digimon.name];
            const cuenta = ficha
                ? `principal ${ficha.principal} · ${ficha.linea}`
                : crudo?.pagina
                  ? '(la página existe, pero no tiene la ficha de atributos)'
                  : '(no se encontró la página)';
            console.log(`  ${digimon.name.padEnd(18)} API: ${(cache.api[digimon.id] || '(nada)').padEnd(9)} Wikimon: ${cuenta}`);
            if (crudo?.pagina && !ficha) console.log(`      comienzo de la página: ${JSON.stringify(crudo.inicio)}`);
        }
        console.log('\nSi se ve bien, corré el programa sin "prueba" para hacer todos.');
        return;
    }

    cambios.sort((a, b) => a.id - b.id);
    const lineas = cambios.map(
        cambio => `    ${cambio.id}: ${JSON.stringify(cambio.nuevo)}, // ${cambio.nombre}: la API dice ${cambio.api} (${cambio.motivo})`,
    );
    writeFileSync(
        archivoSalida,
        `// Atributos corregidos de los digimons. LO ARMA herramientas/atributos-wikimon.mjs: no se edita a mano
// (para cargar uno a mano, usá herramientas/atributos-a-mano.json y volvé a correr el programa).
// Son solo los digimons donde la API (digi-api.com) no coincide con Wikimon (https://wikimon.net): ID del digimon → atributo.
export const ATRIBUTOS_CORREGIDOS = {
${lineas.join('\n')}
};
`,
    );
    const informe = [
        `ATRIBUTOS: API contra Wikimon (${digimons.length} digimons)`,
        `Coinciden: ${iguales} · Corregidos: ${cambios.length} · Wikimon sin atributo principal: ${sinPrincipal.length} · No están en Wikimon: ${sinPagina.length}`,
        '',
        '== CORREGIDOS (ID · nombre · API → nuevo · de dónde sale) ==',
        ...cambios.map(cambio => `${cambio.id} · ${cambio.nombre} · ${cambio.api} → ${cambio.nuevo} · ${cambio.motivo}`),
        '',
        "== WIKIMON NO TIENE ATRIBUTO PRINCIPAL (dice 'None' o 'No Data': se queda el de la API) (ID · nombre · API · lo que dice Wikimon) ==",
        ...sinPrincipal.map(({ digimon, api, linea }) => `${digimon.id} · ${digimon.name} · ${api} · ${linea}`),
        '',
        '== NO SE ENCONTRARON EN WIKIMON (se queda el de la API) (ID · nombre · API) ==',
        ...sinPagina.map(digimon => `${digimon.id} · ${digimon.name} · ${atributoDeLaApi[cache.api[digimon.id]] || 'Desconocido'}`),
        '',
    ].join('\n');
    writeFileSync(archivoInforme, informe);
    console.log(
        `\nListo: ${cambios.length} atributos corregidos (atributosCorregidos.js), ${iguales} coinciden, ${sinPrincipal.length} sin atributo principal en Wikimon, ${sinPagina.length} sin encontrar.`,
    );
    console.log('El informe está en herramientas/atributos-diferencias.txt. Avisale a Claude para revisarlo juntos.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    principal().catch(error => {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    });
}
