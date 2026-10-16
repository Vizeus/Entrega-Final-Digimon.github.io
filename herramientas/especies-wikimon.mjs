// Mira en Wikimon (wikimon.net) la especie ("Type") y los grupos ("Fields") de los digimons y los compara con lo que trae la API (digi-api.com).
// Sirve para completar los digimons a los que la API les deja la especie o los grupos vacíos o en "Unknown". No cambia nada de la página: solo
// arma un informe con las diferencias (y guarda lo que dice Wikimon, para decidir después qué se corrige).
//
// Necesita herramientas/elementos-datos.json (lo arma herramientas/elementos-datos.mjs): de ahí saca lo que dice la API.
//
// Se corre desde la carpeta del proyecto, en la terminal:
//   node herramientas/especies-wikimon.mjs prueba   → prueba rápida con 8 digimons (un solo pedido, tarda como 1 minuto; no escribe el informe)
//   node herramientas/especies-wikimon.mjs          → los digimons con la especie vacía o desconocida, o con los grupos vacíos o desconocidos
//   node herramientas/especies-wikimon.mjs todos    → todos los digimons (unos 30 pedidos a Wikimon; tarda como 30 minutos)
//
// Como los otros: respeta la pausa de 60 segundos entre pedidos que pide Wikimon y, si se corta, al volver a correrlo sigue donde quedó
// (lo ya buscado está en herramientas/especies-wikimon.cache.json).
//
// A quién le cree la página: si Wikimon trae especies (o grupos) y no coinciden con los de la API —porque la API los deja vacíos, con "Unknown" de más o
// con alguna especie de menos—, valen los de Wikimon. Si Wikimon no trae nada, se quedan los de la API.
//
// Al terminar escribe:
//   especiesCorregidas.js                           → { ID → especies } y { ID → grupos } SOLO de los digimons donde Wikimon aporta o discrepa (la página lo usa)
//   herramientas/especies-wikimon-diferencias.txt   → para cada digimon: lo que dice la API y lo que dice Wikimon (especie y grupos)
//
// De cada página se guarda, tal cual, todo lo corto que trae la ficha (la especie es el campo "t1", "t2"…; el campo de los grupos se descubre mirando
// el informe) y la lista de los nombres de campos de la ficha, para poder ajustar la lectura sin volver a pedir.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ESPERA_MS, POR_PEDIDO, esperar, traerPaginas, variantesDelNombre } from './nombres-japoneses.mjs';

const archivoDatos = new URL('./elementos-datos.json', import.meta.url);
const archivoCache = new URL('./especies-wikimon.cache.json', import.meta.url);
const archivoInforme = new URL('./especies-wikimon-diferencias.txt', import.meta.url);
const archivoSalida = new URL('../especiesCorregidas.js', import.meta.url);

const PRUEBA = ['Agumon', 'Bun', 'Death Devimon', 'Etemon Chaos', 'Ohakadamon', 'Kohagurumon', 'Metal Greymon', 'Zurumon'];
const LARGO_MAXIMO_DE_VALOR = 160; // los campos más largos que esto son texto (perfil, notas, referencias): no hacen falta acá
const DESCONOCIDOS = ['unknown', 'species unknown', 'no data', 'none', ''];

// Saca de un valor de Wikimon los enlaces [[a|b]], las comillas, las etiquetas, las referencias y las plantillas
function limpiar(valor) {
    return String(valor ?? '')
        .replace(/<ref[\s\S]*?(<\/ref>|\/>)/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\{\{([^{}|]*\|)?([^{}]*)\}\}/g, '$2')
        .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
        .replace(/'{2,}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// De una página de Wikimon saca los campos cortos de la ficha ("|campo=valor", uno por renglón). Si la página tiene varias fichas (formas distintas),
// se queda con la primera aparición de cada campo: es la de la ficha principal. Devuelve { campos: { nombre → valor limpio }, claves: [nombres, en orden] }
export function extraerFicha(wikitexto) {
    const campos = {};
    const claves = [];
    for (const coincidencia of String(wikitexto ?? '').matchAll(/^\|\s*([\w-]+)\s*=(.*)$/gm)) {
        const [, nombre, crudo] = coincidencia;
        if (nombre in campos) continue;
        claves.push(nombre);
        const valor = limpiar(crudo);
        if (valor && valor.length <= LARGO_MAXIMO_DE_VALOR && !/\{\{|\}\}/.test(valor)) campos[nombre] = valor; // (una plantilla a medio leer, como '{{IG', no es un dato)
    }
    return { campos, claves };
}

// Las especies que dice una ficha: los campos "t1", "t2"… (sin los "t1ref" de las referencias), en orden
export function especiesDeLaFicha(ficha) {
    return Object.entries(ficha?.campos ?? {})
        .filter(([nombre]) => /^t\d+$/.test(nombre))
        .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
        .map(([, valor]) => valor)
        .filter(valor => !DESCONOCIDOS.includes(valor.toLowerCase()));
}

// Los grupos que dice una ficha: los campos "f1", "f2"… (sin los desconocidos), en orden
export function gruposDeLaFicha(ficha) {
    return Object.entries(ficha?.campos ?? {})
        .filter(([nombre]) => /^f\d+$/.test(nombre))
        .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
        .map(([, valor]) => valor)
        .filter(valor => !DESCONOCIDOS.includes(valor.toLowerCase()));
}

async function buscarLote(titulos) {
    const paginas = await traerPaginas(titulos);
    return Object.fromEntries(Object.entries(paginas).map(([pedido, texto]) => [pedido, texto ? { pagina: true, ...extraerFicha(texto) } : { pagina: false }]));
}

function leerCache() {
    try {
        return existsSync(archivoCache) ? JSON.parse(readFileSync(archivoCache, 'utf8')) : {};
    } catch {
        return {}; // un caché dañado se rehace
    }
}

// La ficha de un digimon, probando también las otras formas de escribir su nombre; se queda con la primera que trae algún campo "t…"
function fichaDe(nombre, cache) {
    for (const forma of [nombre, ...variantesDelNombre(nombre)]) {
        const ficha = cache[forma];
        if (ficha?.pagina && ficha.claves.some(clave => /^t\d+$/.test(clave))) return ficha;
    }
    return [nombre, ...variantesDelNombre(nombre)].map(forma => cache[forma]).find(ficha => ficha?.pagina) ?? null;
}

const esVacioODesconocido = lista => !lista?.length || lista.every(valor => DESCONOCIDOS.includes(String(valor).toLowerCase()));

async function principal() {
    const prueba = process.argv.includes('prueba');
    const todosLosDigimons = process.argv.includes('todos');
    if (!existsSync(archivoDatos)) throw new Error('Falta herramientas/elementos-datos.json: corré antes "node herramientas/elementos-datos.mjs".');
    const datos = JSON.parse(readFileSync(archivoDatos, 'utf8'));
    const elegidos = prueba
        ? PRUEBA.map(nombre => datos.find(digimon => digimon.nombre === nombre)).filter(Boolean)
        : todosLosDigimons
          ? datos
          : datos.filter(digimon => esVacioODesconocido(digimon.especies) || esVacioODesconocido(digimon.grupos));
    console.log(
        `${datos.length} digimons; se miran ${elegidos.length}${prueba ? ' (prueba)' : todosLosDigimons ? ' (todos)' : ' (especie o grupos vacíos o desconocidos)'}.`,
    );

    const cache = prueba ? {} : leerCache();
    const buscarLosQueFaltan = async lista => {
        const pendientes = lista.filter(titulo => !(titulo in cache));
        const pedidos = Math.ceil(pendientes.length / POR_PEDIDO);
        if (!pedidos) return;
        console.log(`Faltan buscar ${pendientes.length} en Wikimon (${pedidos} pedidos, con ${ESPERA_MS / 1000} s de pausa entre cada uno).`);
        for (let desde = 0; desde < pendientes.length; desde += POR_PEDIDO) {
            Object.assign(cache, await buscarLote(pendientes.slice(desde, desde + POR_PEDIDO)));
            if (!prueba) writeFileSync(archivoCache, JSON.stringify(cache));
            console.log(`  ${Math.min(desde + POR_PEDIDO, pendientes.length)} / ${pendientes.length}`);
            if (desde + POR_PEDIDO < pendientes.length) await esperar(ESPERA_MS);
        }
    };

    const nombres = elegidos.map(digimon => digimon.nombre);
    await buscarLosQueFaltan(nombres);
    if (!prueba) {
        const sinFicha = nombres.filter(nombre => !fichaDe(nombre, cache)?.claves.some(clave => /^t\d+$/.test(clave)));
        const otrasFormas = [...new Set(sinFicha.flatMap(variantesDelNombre))];
        if (otrasFormas.some(forma => !(forma in cache))) {
            console.log('\nProbando otras formas de escribir los que no aparecieron…');
            await buscarLosQueFaltan(otrasFormas);
        }
    }

    // Compara lo de la API con lo de Wikimon: 'igual', 'distinto', 'aporta' (la API no tiene y Wikimon sí), 'nada' (ninguna de las dos) o 'solo API' (Wikimon no tiene)
    const comparar = (api, wikimon) => {
        const sinApi = esVacioODesconocido(api);
        if (wikimon.length && sinApi) return 'aporta';
        if (!wikimon.length) return sinApi ? 'nada' : 'solo API';
        const iguales = wikimon.length === api.length && wikimon.every(valor => api.some(otro => otro.toLowerCase() === valor.toLowerCase()));
        return iguales ? 'igual' : 'distinto';
    };
    const cuenta = { especie: {}, grupos: {} };
    const renglones = [];
    let sinPagina = 0;
    for (const digimon of elegidos) {
        const ficha = fichaDe(digimon.nombre, cache);
        const especies = especiesDeLaFicha(ficha);
        const grupos = gruposDeLaFicha(ficha);
        if (!ficha) sinPagina++;
        const estadoEspecie = ficha ? comparar(digimon.especies, especies) : 'sin página';
        const estadoGrupos = ficha ? comparar(digimon.grupos, grupos) : 'sin página';
        cuenta.especie[estadoEspecie] = (cuenta.especie[estadoEspecie] ?? 0) + 1;
        cuenta.grupos[estadoGrupos] = (cuenta.grupos[estadoGrupos] ?? 0) + 1;
        renglones.push({
            estadoEspecie,
            estadoGrupos,
            texto: [
                `${digimon.id} · ${digimon.nombre} · nivel ${ficha?.campos.l1 ?? '(sin nivel en Wikimon)'}  →  especie: ${estadoEspecie} · grupos: ${estadoGrupos}`,
                `   API:     especies [${digimon.especies.join(', ')}] · grupos [${digimon.grupos.join(', ')}]`,
                ficha ? `   Wikimon: especies [${especies.join(', ')}] · grupos [${grupos.join(', ')}]` : '   Wikimon: (no se encontró la página)',
            ].join('\n'),
        });
    }
    const resumen = objeto =>
        Object.entries(objeto)
            .map(([estado, cantidad]) => `${estado}: ${cantidad}`)
            .join(' · ');

    if (prueba) {
        console.log(`\n${renglones.map(renglon => renglon.texto).join('\n\n')}`);
        console.log('\nSi se ve bien, corré el programa sin "prueba". Avisale a Claude lo que salió en la prueba.');
        return;
    }

    // Las correcciones: todos los digimons que ya se buscaron en Wikimon (también los de corridas anteriores), no solo los de esta corrida
    const cambia = (api, wikimon) => ['aporta', 'distinto'].includes(comparar(api, wikimon));
    const especiesCorregidas = [];
    const gruposCorregidos = [];
    for (const digimon of datos) {
        const ficha = fichaDe(digimon.nombre, cache);
        if (!ficha) continue;
        const especies = especiesDeLaFicha(ficha);
        const grupos = gruposDeLaFicha(ficha);
        if (cambia(digimon.especies, especies))
            especiesCorregidas.push(`    ${digimon.id}: ${JSON.stringify(especies)}, // ${digimon.nombre}: la API dice [${digimon.especies.join(', ')}]`);
        if (cambia(digimon.grupos, grupos))
            gruposCorregidos.push(`    ${digimon.id}: ${JSON.stringify(grupos)}, // ${digimon.nombre}: la API dice [${digimon.grupos.join(', ')}]`);
    }
    writeFileSync(
        archivoSalida,
        `// Especies y grupos corregidos de los digimons. LO ARMA herramientas/especies-wikimon.mjs: no se edita a mano.
// Son solo los digimons donde la API (digi-api.com) deja la especie o los grupos vacíos, con "Unknown" de más o incompletos y Wikimon (https://wikimon.net)
// sí los trae: ID del digimon → lista. Los demás se quedan con lo que trae la API.
export const ESPECIES_CORREGIDAS = {
${especiesCorregidas.join('\n')}
};

export const GRUPOS_CORREGIDOS = {
${gruposCorregidos.join('\n')}
};
`,
    );

    // Primero lo que cambiaría algo (Wikimon aporta o discrepa), después lo demás
    const importa = renglon => [renglon.estadoEspecie, renglon.estadoGrupos].some(estado => estado === 'aporta' || estado === 'distinto');
    writeFileSync(
        archivoInforme,
        [
            `ESPECIES Y GRUPOS: API contra Wikimon (${elegidos.length} digimons)`,
            `Especies → ${resumen(cuenta.especie)}`,
            `Grupos   → ${resumen(cuenta.grupos)}`,
            "('aporta' = la API no tiene y Wikimon sí · 'distinto' = los dos tienen y no coinciden · 'nada' = ninguna de las dos)",
            '',
            '== DONDE WIKIMON APORTA O DISCREPA ==',
            ...renglones.filter(importa).flatMap(renglon => [renglon.texto, '']),
            '== EL RESTO ==',
            ...renglones.filter(renglon => !importa(renglon)).flatMap(renglon => [renglon.texto, '']),
        ].join('\n'),
    );
    console.log(`\nListo: ${elegidos.length} digimons, ${sinPagina} sin página en Wikimon.`);
    console.log(`Corregidos (especiesCorregidas.js): ${especiesCorregidas.length} especies y ${gruposCorregidos.length} grupos.`);
    console.log(`Especies → ${resumen(cuenta.especie)}`);
    console.log(`Grupos   → ${resumen(cuenta.grupos)}`);
    console.log('El informe está en herramientas/especies-wikimon-diferencias.txt y lo buscado en herramientas/especies-wikimon.cache.json. Avisale a Claude.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    principal().catch(error => {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    });
}
