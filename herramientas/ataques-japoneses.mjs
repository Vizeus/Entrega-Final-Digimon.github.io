// Arma la lista de nombres japoneses de los ataques de los digimons, sacándolos de Wikimon (wikimon.net).
// La API (digi-api.com) trae los ataques con el nombre que tienen en Wikimon ("Baby Flame", "Surudoi Tsume") y no trae el japonés.
// Wikimon, en la página de cada digimon, tiene una tabla de ataques con el nombre japonés de cada uno (el campo "kan"). Este programa lee esas tablas
// de todos los digimons y arma un diccionario "nombre del ataque → nombre en japonés". Los ataques que Wikimon no tiene en japonés (por ejemplo
// los que son inventados o de adaptaciones) quedan afuera: en la página siguen con el nombre de siempre.
//
// Se corre desde la carpeta del proyecto, en la terminal:
//   node herramientas/ataques-japoneses.mjs prueba   → prueba rápida con 3 digimons (un solo pedido, tarda como 1 minuto; no escribe la lista)
//   node herramientas/ataques-japoneses.mjs          → todos los digimons (unos 30 pedidos; tarda como 30 minutos)
//
// Igual que el de los nombres: respeta la pausa de 60 segundos entre pedidos que pide Wikimon, y si se corta, al volver a correrlo sigue desde donde
// quedó (lo ya buscado se guarda en herramientas/ataques-japoneses.cache.json).
//
// Al terminar escribe:
//   ataquesJa.js                                      → el diccionario (nombre del ataque → japonés), para que lo use la página
//   herramientas/ataques-japoneses-conflictos.txt     → ataques que en distintas páginas tienen distinto nombre japonés (para esos, la página usa el del digimon que corresponde)

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ESPERA_MS, POR_PEDIDO, esperar, nombresDeLaApi, traerPaginas, variantesDelNombre } from './nombres-japoneses.mjs';

const archivoCache = new URL('./ataques-japoneses.cache.json', import.meta.url);
const archivoConflictos = new URL('./ataques-japoneses-conflictos.txt', import.meta.url);
const archivoPrueba = new URL('./ataques-japoneses.prueba.txt', import.meta.url);
const archivoSalida = new URL('../ataquesJa.js', import.meta.url);

const PRUEBA = ['Agumon', 'Greymon', 'Gabumon'];
const TIENE_JAPONES = /[぀-ヿ一-鿿]/; // hiragana, katakana o kanji
const SIN_FORMATO = /[{}[\]<>|]/; // restos de plantillas o enlaces mal cerrados: no son parte de un nombre

// Deja un valor de Wikimon como texto simple: sin comillas de negrita/cursiva, sin enlaces [[a|b]], sin plantillas ni etiquetas
function limpiar(valor) {
    return String(valor ?? '')
        .replace(/<ref[\s\S]*?(<\/ref>|\/>)/gi, '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\{\{[\s\S]*?\}\}/g, '')
        .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
        .replace(/'{2,}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Parte el texto de una plantilla en sus parámetros (separados por "|"), sin cortar lo que está adentro de {{ }} o [[ ]]
function partirParametros(texto) {
    const partes = [];
    let actual = '';
    let profundidad = 0;
    for (let i = 0; i < texto.length; i++) {
        const dos = texto.slice(i, i + 2);
        if (dos === '{{' || dos === '[[') {
            profundidad++;
            actual += dos;
            i++;
        } else if (dos === '}}' || dos === ']]') {
            profundidad--;
            actual += dos;
            i++;
        } else if (texto[i] === '|' && profundidad === 0) {
            partes.push(actual);
            actual = '';
        } else {
            actual += texto[i];
        }
    }
    partes.push(actual);
    return partes;
}

// Las plantillas de primer nivel de un texto, como { nombre, cuerpo } (cuerpo: lo que va entre el nombre y el cierre)
export function plantillas(texto) {
    const resultado = [];
    for (let i = 0; i < texto.length; i++) {
        if (texto.slice(i, i + 2) !== '{{') continue;
        let profundidad = 0;
        let j = i;
        for (; j < texto.length; j++) {
            const dos = texto.slice(j, j + 2);
            if (dos === '{{') {
                profundidad++;
                j++;
            } else if (dos === '}}') {
                profundidad--;
                j++;
                if (profundidad === 0) break;
            }
        }
        const interior = texto.slice(i + 2, j - 1);
        const [nombre, ...resto] = partirParametros(interior);
        resultado.push({ nombre: nombre.trim().toLowerCase(), cuerpo: resto });
        i = j;
    }
    return resultado;
}

// La sección de ataques de una página (en Wikimon se llama "Attack Techniques"), hasta el siguiente título del mismo nivel o mayor
function seccionDeAtaques(wikitexto) {
    const titulo = /^(=+)\s*Attack(?:s| Techniques)\s*\1\s*$/im.exec(wikitexto);
    if (!titulo) return '';
    const resto = wikitexto.slice(titulo.index + titulo[0].length);
    const siguiente = new RegExp(`^={1,${titulo[1].length}}[^=].*$`, 'm').exec(resto);
    return siguiente ? resto.slice(0, siguiente.index) : resto;
}

// De una página de digimon de Wikimon saca sus ataques: [{ nombre, japones }] (japones es null si Wikimon no lo tiene).
// La tabla es una plantilla {{T …}} con los parámetros name, kan, trans… repetidos con un número al final (name, name2, name3…; el último, "l").
export function extraerAtaques(wikitexto) {
    const ataques = [];
    for (const plantilla of plantillas(seccionDeAtaques(String(wikitexto ?? '')))) {
        if (plantilla.nombre !== 't') continue;
        const grupos = new Map(); // sufijo → { name, kan }
        for (const parametro of plantilla.cuerpo) {
            const igual = parametro.indexOf('=');
            if (igual < 0) continue;
            const coincidencia = /^\s*(name|kan)(\d+|l)?\s*$/i.exec(parametro.slice(0, igual));
            if (!coincidencia) continue;
            const sufijo = coincidencia[2] ?? '';
            if (!grupos.has(sufijo)) grupos.set(sufijo, {});
            grupos.get(sufijo)[coincidencia[1].toLowerCase()] = limpiar(parametro.slice(igual + 1));
        }
        for (const { name, kan } of grupos.values()) {
            if (!name || !/\p{L}/u.test(name) || SIN_FORMATO.test(name)) continue; // (a veces una tabla mal escrita deja restos como "}}")
            ataques.push({ nombre: name, japones: kan && TIENE_JAPONES.test(kan) && !SIN_FORMATO.test(kan) ? kan : null });
        }
    }
    return ataques;
}

// La página de Wikimon de un digimon de la API: la que se buscó con su nombre o, si no apareció, con otra forma de escribirlo
function ataquesDe(nombre, cache) {
    const ataques =
        cache[nombre] ??
        variantesDelNombre(nombre)
            .map(forma => cache[forma])
            .find(Boolean);
    return ataques ?? null;
}

// Junta los ataques de todos los digimons. En la API cada ataque se llama como en Wikimon, pero algunos nombres son genéricos ("Breath", "Kick") y
// en cada digimon son otro ataque, con otro nombre japonés. Entonces:
//   global      → nombre del ataque → japonés (el que más se repite)
//   porDigimon  → solo para los ataques con nombres distintos: ataque → { digimon de la API → su japonés }, únicamente los que difieren del global
export function armarDiccionarios(nombres, cache) {
    const valores = new Map(); // ataque → Map(japonés → cuántas veces)
    const usados = new Map(); // ataque → [[digimon, japonés]]
    const sinJapones = new Set();
    let paginasLeidas = 0;
    for (const nombre of nombres) {
        const ataques = ataquesDe(nombre, cache);
        if (!ataques) continue;
        paginasLeidas++;
        for (const [ataque, japonesCrudo] of ataques) {
            if (!/\p{L}/u.test(ataque) || SIN_FORMATO.test(ataque) || ataque.length > 60) continue; // (restos de tablas mal escritas, no son nombres de ataques)
            const japones = japonesCrudo && !SIN_FORMATO.test(japonesCrudo) ? japonesCrudo : null;
            if (!japones) {
                sinJapones.add(ataque);
                continue;
            }
            if (!valores.has(ataque)) {
                valores.set(ataque, new Map());
                usados.set(ataque, []);
            }
            valores.get(ataque).set(japones, (valores.get(ataque).get(japones) ?? 0) + 1);
            usados.get(ataque).push([nombre, japones]);
        }
    }

    const global = new Map();
    const porDigimon = new Map();
    const conflictos = new Map();
    for (const [ataque, cuentas] of valores) {
        const [masUsado] = [...cuentas].sort((a, b) => b[1] - a[1])[0];
        global.set(ataque, masUsado);
        sinJapones.delete(ataque);
        if (cuentas.size > 1) {
            conflictos.set(ataque, new Set(cuentas.keys()));
            const propios = {};
            for (const [digimon, japones] of usados.get(ataque)) if (japones !== masUsado) propios[digimon] = japones;
            porDigimon.set(ataque, propios);
        }
    }
    return { global, porDigimon, conflictos, sinJapones, paginasLeidas };
}

export function textoDelArchivo(global, porDigimon) {
    const ordenar = ([a], [b]) => a.localeCompare(b, 'en');
    const lineas = [...global].sort(ordenar).map(([ataque, japones]) => `    ${JSON.stringify(ataque)}: ${JSON.stringify(japones)},`);
    const propios = [...porDigimon].sort(ordenar).map(([ataque, digimons]) => `    ${JSON.stringify(ataque)}: ${JSON.stringify(digimons)},`);
    return `// Nombres japoneses de los ataques de los digimons. LO ARMA herramientas/ataques-japoneses.mjs: no se edita a mano.
// Fuente: Wikimon (https://wikimon.net). Clave: el nombre del ataque que trae la API (digi-api.com).
export const ATAQUES_JA = {
${lineas.join('\n')}
};

// Ataques cuyo nombre es el mismo en varios digimons pero no es el mismo ataque ("Breath", "Kick"…): ataque → { digimon de la API → su nombre japonés },
// solo para los digimons en que difiere del de arriba
export const ATAQUES_JA_POR_DIGIMON = {
${propios.join('\n')}
};
`;
}

function leerCache() {
    return existsSync(archivoCache) ? JSON.parse(readFileSync(archivoCache, 'utf8')) : {};
}

async function principal() {
    if (process.argv[2] === 'prueba') {
        console.log(`Prueba con ${PRUEBA.length} digimons (un pedido a Wikimon)…`);
        const paginas = await traerPaginas(PRUEBA);
        for (const [nombre, texto] of Object.entries(paginas)) {
            const ataques = extraerAtaques(texto);
            const conJapones = ataques.filter(ataque => ataque.japones);
            console.log(`\n${nombre}: ${ataques.length} ataques, ${conJapones.length} con nombre japonés`);
            for (const ataque of ataques.slice(0, 6)) console.log(`  ${ataque.nombre.padEnd(22)} → ${ataque.japones ?? '(sin nombre japonés)'}`);
        }
        // Por si algo sale mal: el comienzo de la sección de ataques tal cual la trae Wikimon, para poder ver el formato
        const agumon = paginas.Agumon ?? '';
        const desde = agumon.search(/^=+\s*Attack(?:s| Techniques)/im);
        writeFileSync(archivoPrueba, desde < 0 ? '(no se encontró la sección de ataques)' : agumon.slice(desde, desde + 2500));
        console.log('\n(El texto original de la tabla de Agumon quedó en herramientas/ataques-japoneses.prueba.txt, por si hay que revisar el formato.)');
        console.log('Si los nombres salen bien, corré el programa sin "prueba" para hacer todos.');
        return;
    }

    console.log('Pidiendo la lista de digimons a la API…');
    const nombres = await nombresDeLaApi();
    console.log(`${nombres.length} digimons.`);

    const cache = leerCache(); // nombre del digimon → [[ataque, japonés o null], …]  (null si Wikimon no tiene la página)

    const buscarLosQueFaltan = async lista => {
        const pendientes = lista.filter(nombre => !(nombre in cache));
        const pedidos = Math.ceil(pendientes.length / POR_PEDIDO);
        if (!pedidos) return;
        console.log(
            `Faltan buscar ${pendientes.length} (${pedidos} pedidos a Wikimon, con ${ESPERA_MS / 1000} s de pausa entre cada uno: unos ${Math.ceil((pedidos * ESPERA_MS) / 60000)} minutos).`,
        );
        for (let desde = 0; desde < pendientes.length; desde += POR_PEDIDO) {
            const lote = pendientes.slice(desde, desde + POR_PEDIDO);
            const paginas = await traerPaginas(lote);
            for (const [nombre, texto] of Object.entries(paginas)) {
                cache[nombre] = texto === null ? null : extraerAtaques(texto).map(({ nombre: ataque, japones }) => [ataque, japones]);
            }
            writeFileSync(archivoCache, JSON.stringify(cache));
            console.log(`  ${Math.min(desde + POR_PEDIDO, pendientes.length)} / ${pendientes.length}`);
            if (desde + POR_PEDIDO < pendientes.length) await esperar(ESPERA_MS);
        }
    };

    await buscarLosQueFaltan(nombres);

    // Segunda vuelta para los digimons cuya página no apareció con el nombre de la API (mismas otras formas de escribirlo que en el de los nombres)
    const sinPagina = nombres.filter(nombre => cache[nombre] === null);
    const otrasFormas = [...new Set(sinPagina.flatMap(variantesDelNombre))];
    if (otrasFormas.some(forma => !(forma in cache))) {
        console.log('\nProbando otras formas de escribir los que no aparecieron…');
        await buscarLosQueFaltan(otrasFormas);
    }

    const { global, porDigimon, conflictos, sinJapones, paginasLeidas } = armarDiccionarios(nombres, cache);
    writeFileSync(archivoSalida, textoDelArchivo(global, porDigimon));
    writeFileSync(archivoConflictos, [...conflictos].map(([ataque, formas]) => `${ataque}: ${[...formas].join(' / ')}`).join('\n') + '\n');

    console.log(`\nListo: ${global.size} ataques con nombre japonés en ataquesJa.js.`);
    console.log(
        `  (${paginasLeidas.length} páginas leídas; ${sinJapones.size} ataques más que Wikimon tiene sin nombre japonés; ${conflictos.size} con nombres distintos según el digimon, que se guardan aparte para cada uno: ver herramientas/ataques-japoneses-conflictos.txt)`,
    );
}

// (Solo corre si se lo llama desde la terminal; así se puede importar extraerAtaques sin que arranque)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    principal().catch(error => {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    });
}
