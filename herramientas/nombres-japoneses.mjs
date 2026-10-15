// Arma la lista de nombres japoneses (en katakana) de los digimons, sacándolos de Wikimon (wikimon.net).
// La API de digi-api.com no los trae, y no se pueden sacar "convirtiendo" el nombre: muchos son otros nombres (Myotismon → ヴァンデモン, Gatomon → テイルモン).
//
// Se corre desde la carpeta del proyecto, en la terminal:
//   node herramientas/nombres-japoneses.mjs prueba   → prueba rápida con 10 digimons (un solo pedido, tarda como 1 minuto; no escribe nada)
//   node herramientas/nombres-japoneses.mjs          → todos los digimons (unos 30 pedidos; tarda como 30 minutos)
//
// Wikimon pide (en su robots.txt) esperar 60 segundos entre pedidos: este programa lo respeta, por eso tarda. Se puede dejar corriendo y seguir con
// otra cosa. Si se corta (o se cierra la terminal), al volver a correrlo sigue desde donde quedó: lo ya buscado se guarda en
// herramientas/nombres-japoneses.cache.json.
//
// Al terminar escribe:
//   nombresJa.js                                   → la lista (nombre de la API → katakana), para que la use la página
//   herramientas/nombres-japoneses-a-mano.json     → (lo escribe una persona) nombres cargados a mano, que se usan solo si Wikimon no tiene el digimon; ese archivo se lee, no se pisa
//   herramientas/nombres-japoneses-faltan.txt      → los digimons para los que no se encontró el nombre (esos siguen con el nombre latino)

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const URL_DE_LA_API = 'https://digi-api.com/api/v1/digimon';
const URL_DE_WIKIMON = 'https://wikimon.net/api.php';
export const ESPERA_MS = Number(process.env.ESPERA_MS ?? 60_000); // pausa entre pedidos a Wikimon (lo que pide su robots.txt)
export const POR_PEDIDO = 50; // títulos por pedido (el máximo que deja la API de Wikimon cuando se pide el texto de las páginas)
const AGENTE = 'EntregaFinalDigimon/1.0 (proyecto de estudio, sin fines de lucro)';

const archivoCache = new URL('./nombres-japoneses.cache.json', import.meta.url);
const archivoAMano = new URL('./nombres-japoneses-a-mano.json', import.meta.url);
const archivoFaltan = new URL('./nombres-japoneses-faltan.txt', import.meta.url);
const archivoSalida = new URL('../nombresJa.js', import.meta.url);

const PRUEBA = ['Agumon', 'Greymon', 'MetalGarurumon', 'Myotismon', 'Machinedramon', 'Gatomon', 'Omnimon', 'Wizardmon', 'Angewomon', 'Cherrymon'];

export const esperar = milisegundos => new Promise(resolver => setTimeout(resolver, milisegundos));

// Pide una dirección y devuelve el JSON (reintenta si falla)
export async function pedirJson(url, intentos = 4) {
    for (let intento = 1; ; intento++) {
        try {
            const respuesta = await fetch(url, { headers: { 'User-Agent': AGENTE, Accept: 'application/json' } });
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
            return await respuesta.json();
        } catch (error) {
            if (intento >= intentos) throw new Error(`No se pudo pedir ${url.slice(0, 90)}…: ${error.message}`, { cause: error });
            console.log(`  (falló: ${error.message}; se reintenta en un rato…)`);
            await esperar(Math.max(ESPERA_MS, 5000) * intento);
        }
    }
}

// Los nombres de todos los digimons de la API (los mismos que usa la página)
export async function nombresDeLaApi() {
    const nombres = [];
    for (let pagina = 0; pagina < 30; pagina++) {
        const datos = await pedirJson(`${URL_DE_LA_API}?pageSize=100&page=${pagina}`);
        const contenido = datos.content ?? [];
        if (!contenido.length) break;
        for (const digimon of contenido) if (digimon.name) nombres.push(String(digimon.name).trim());
    }
    return [...new Set(nombres)];
}

// Del texto de una página de Wikimon saca el nombre en katakana (está en el campo "kan" de la ficha)
export function extraerKatakana(wikitexto) {
    const coincidencia = String(wikitexto ?? '').match(/\|\s*kan\s*=\s*([^\n|<{[]+)/);
    if (!coincidencia) return null;
    const nombre = coincidencia[1].replace(/'+/g, '').trim();
    return /[぀-ヿ一-鿿]/.test(nombre) ? nombre : null;
}

// Pide a Wikimon el texto de varias páginas de una vez. Devuelve { nombre pedido → texto de la página (o null si no existe) }
export async function traerPaginas(titulos) {
    const normalizados = new Map(); // "nombre pedido" → "título normalizado" (mayúscula inicial, espacios en vez de guiones bajos…)
    const redirigidos = new Map(); // "título" → "título al que redirige" (por ejemplo Gatomon → Tailmon)
    const paginas = new Map(); // título → texto de la página (o null si no existe)

    let continuar = {};
    do {
        const parametros = new URLSearchParams({
            action: 'query',
            prop: 'revisions',
            rvprop: 'content',
            rvslots: 'main',
            redirects: '1',
            format: 'json',
            formatversion: '2',
            titles: titulos.join('|'),
            ...continuar,
        });
        const datos = await pedirJson(`${URL_DE_WIKIMON}?${parametros}`);
        const consulta = datos.query ?? {};
        for (const par of consulta.normalized ?? []) normalizados.set(par.from, par.to);
        for (const par of consulta.redirects ?? []) redirigidos.set(par.from, par.to);
        for (const pagina of consulta.pages ?? []) {
            const texto = pagina.missing ? null : pagina.revisions?.[0]?.slots?.main?.content;
            if (texto || !paginas.has(pagina.title)) paginas.set(pagina.title, texto ?? null);
        }
        continuar = datos.continue ?? null; // (si la respuesta quedó a medias, Wikimon dice cómo seguir; eso se manda tal cual en el pedido siguiente)
        if (continuar) await esperar(ESPERA_MS);
    } while (continuar);

    const resultado = {};
    for (const pedido of titulos) {
        let titulo = normalizados.get(pedido) ?? pedido;
        for (let vueltas = 0; redirigidos.has(titulo) && vueltas < 5; vueltas++) titulo = redirigidos.get(titulo);
        resultado[pedido] = paginas.get(titulo) ?? null;
    }
    return resultado;
}

// Lo mismo, pero devuelve solo el nombre en katakana de cada página. { nombre pedido → katakana o null }
async function buscarLote(titulos) {
    const paginas = await traerPaginas(titulos);
    return Object.fromEntries(Object.entries(paginas).map(([pedido, texto]) => [pedido, extraerKatakana(texto)]));
}

// Otras formas de escribir el nombre de un digimon con un modo o una aclaración:
// 'Dukemon(Crimson Mode)' → 'Dukemon (Crimson Mode)', 'Dukemon Crimson Mode' y 'Dukemon: Crimson Mode' (así los titula Wikimon: con dos puntos)
export function variantesDelNombre(nombre) {
    const conEspacio = nombre.replace(/(\S)\(/, '$1 (');
    const sinParentesis = nombre.replace(/\s*\((.*)\)\s*$/, ' $1').trim();
    const formas = [conEspacio, sinParentesis];
    const conParentesis = nombre.match(/^(.+?)\s*\((.+)\)\s*$/); // 'Base(Modo)'
    const conModo = nombre.match(/^(\S+) (.+ Mode)$/); // 'Base Modo Mode'
    const partes = conParentesis ?? conModo;
    if (partes) {
        const [, base, modo] = partes;
        formas.push(`${base}: ${modo}`, `${base}: ${modo.replace('X-Antibody', 'X Antibody')}`);
    }
    return [...new Set(formas)].filter(forma => forma !== nombre);
}

function leerCache() {
    return existsSync(archivoCache) ? JSON.parse(readFileSync(archivoCache, 'utf8')) : {};
}

async function principal() {
    if (process.argv[2] === 'prueba') {
        console.log('Prueba con 10 digimons (un pedido a Wikimon)…');
        const resultado = await buscarLote(PRUEBA);
        for (const [nombre, katakana] of Object.entries(resultado)) console.log(`  ${nombre.padEnd(16)} → ${katakana ?? '(no se encontró)'}`);
        console.log('\nSi los nombres salen bien, corré el programa sin "prueba" para hacer todos.');
        return;
    }

    console.log('Pidiendo la lista de digimons a la API…');
    const nombres = await nombresDeLaApi();
    console.log(`${nombres.length} digimons.`);

    const cache = leerCache();

    // Busca en Wikimon los nombres que todavía no están en el caché (de a 50 por pedido, con la pausa que pide Wikimon)
    const buscarLosQueFaltan = async lista => {
        const pendientes = lista.filter(nombre => !(nombre in cache));
        const pedidos = Math.ceil(pendientes.length / POR_PEDIDO);
        if (!pedidos) return;
        console.log(
            `Faltan buscar ${pendientes.length} (${pedidos} pedidos a Wikimon, con ${ESPERA_MS / 1000} s de pausa entre cada uno: unos ${Math.ceil((pedidos * ESPERA_MS) / 60000)} minutos).`,
        );
        for (let desde = 0; desde < pendientes.length; desde += POR_PEDIDO) {
            const lote = pendientes.slice(desde, desde + POR_PEDIDO);
            Object.assign(cache, await buscarLote(lote));
            writeFileSync(archivoCache, JSON.stringify(cache, null, 1));
            console.log(`  ${Math.min(desde + POR_PEDIDO, pendientes.length)} / ${pendientes.length}`);
            if (desde + POR_PEDIDO < pendientes.length) await esperar(ESPERA_MS);
        }
    };

    await buscarLosQueFaltan(nombres);

    // Segunda vuelta, solo para los que no aparecieron: la API escribe 'Dukemon(Crimson Mode)' o 'Dukemon (Crimson Mode)', y en Wikimon suele ser
    // 'Dukemon Crimson Mode' (o con el espacio antes del paréntesis). Se prueban esas otras formas.
    const sinEncontrar = nombres.filter(nombre => !cache[nombre]);
    const otrasFormas = [...new Set(sinEncontrar.flatMap(variantesDelNombre))];
    if (otrasFormas.some(forma => !(forma in cache))) {
        console.log('\nProbando otras formas de escribir los que no aparecieron…');
        await buscarLosQueFaltan(otrasFormas);
    }
    // Los que se cargaron a mano (nombre de la API → katakana) en herramientas/nombres-japoneses-a-mano.json: se usan solo cuando Wikimon no trae el nombre
    const aMano = existsSync(archivoAMano) ? JSON.parse(readFileSync(archivoAMano, 'utf8')) : {};
    const katakanaDe = nombre =>
        cache[nombre] ??
        variantesDelNombre(nombre)
            .map(forma => cache[forma])
            .find(Boolean) ??
        aMano[nombre] ??
        null;

    const encontrados = nombres.filter(nombre => katakanaDe(nombre));
    const faltan = nombres.filter(nombre => !katakanaDe(nombre));

    const lineas = encontrados.map(nombre => `    ${JSON.stringify(nombre)}: ${JSON.stringify(katakanaDe(nombre))},`);
    writeFileSync(
        archivoSalida,
        `// Nombres japoneses (katakana) de los digimons. LO ARMA herramientas/nombres-japoneses.mjs: no se edita a mano.
// Fuente: Wikimon (https://wikimon.net). Clave: el nombre que trae la API (digi-api.com).
export const NOMBRES_JA = {
${lineas.join('\n')}
};
`,
    );
    writeFileSync(archivoFaltan, faltan.join('\n') + '\n');
    console.log(`\nListo: ${encontrados.length} nombres en nombresJa.js; ${faltan.length} sin encontrar (están en herramientas/nombres-japoneses-faltan.txt).`);
}

// (Solo corre si se lo llama desde la terminal; así se puede importar extraerKatakana sin que arranque)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    principal().catch(error => {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    });
}
