// Junta, de Wikimon (wikimon.net), todo lo que dice sobre los digimons a los que la API (digi-api.com) NO les trae descripción en inglés, para poder
// escribir después una descripción propia y corta (resumida, con otras palabras: no se copia). No cambia nada de la página: solo arma un archivo.
//
// Necesita herramientas/elementos-datos.json (lo arma herramientas/elementos-datos.mjs): de ahí saca qué digimons no tienen descripción.
//
// Se corre desde la carpeta del proyecto, en la terminal:
//   node herramientas/descripciones-faltantes.mjs prueba   → prueba rápida con 3 digimons (un solo pedido, tarda como 1 minuto; no escribe nada)
//   node herramientas/descripciones-faltantes.mjs          → todos los que faltan (unos 5 pedidos a Wikimon; tarda unos 6 a 10 minutos)
//
// Respeta la pausa de 60 segundos entre pedidos que pide Wikimon. Si se corta, al volver a correrlo sigue donde quedó
// (lo ya buscado está en herramientas/descripciones-faltantes.cache.json).
//
// Al terminar escribe:
//   herramientas/descripciones-faltantes.json   → [{ id, nombre, nivel, especies, grupos, previas, siguientes, ataques, campos, texto }], un registro por digimon
//       campos → los datos de la ficha de Wikimon que son texto largo (el perfil oficial suele estar ahí)
//       texto  → el cuerpo de la página, limpio (sin plantillas ni enlaces); vacío si Wikimon no tiene la página

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ESPERA_MS, POR_PEDIDO, esperar, traerPaginas, variantesDelNombre } from './nombres-japoneses.mjs';

const archivoDatos = new URL('./elementos-datos.json', import.meta.url);
const archivoCache = new URL('./descripciones-faltantes.cache.json', import.meta.url);
const archivoSalida = new URL('./descripciones-faltantes.json', import.meta.url);

const LARGO_MINIMO_DE_CAMPO = 30; // los campos de perfil más cortos que esto no dicen nada
const CAMPO_DE_PERFIL = /^(p[ej]\d*[a-z]?|[ej])$/i; // en la ficha de Wikimon: pe1a, pe3c… (perfil en inglés), pj1a… (en japonés), e / j (nota corta)
const LARGO_MAXIMO_DEL_TEXTO = 3500; // para que el archivo no crezca sin sentido con páginas larguísimas

// Saca de un texto con plantillas todo lo que son plantillas {{…}} (aunque estén una dentro de otra)
function sinPlantillas(texto) {
    let anterior;
    let actual = texto;
    do {
        anterior = actual;
        actual = actual.replace(/\{\{[^{}]*\}\}/g, '');
    } while (actual !== anterior);
    return actual;
}

// Pasa el marcado de Wikimon a texto corrido: sin referencias, enlaces, negritas ni etiquetas
export function limpiarTexto(texto) {
    return sinPlantillas(
        String(texto ?? '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<ref[^>]*\/>/g, '')
            .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, ''),
    )
        .replace(/\[\[(?:File|Image|Category|Archivo):[^\]]*\]\]/gi, '')
        .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
        .replace(/\[\[([^\]]*)\]\]/g, '$1')
        .replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1')
        .replace(/\[https?:\/\/\S+\]/g, '')
        .replace(/'{2,}/g, '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/^=+\s*(.*?)\s*=+\s*$/gm, '\n## $1\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*/g, '\n\n')
        .trim();
}

// De la ficha de Wikimon ("|campo=valor", uno por renglón) saca los campos que son texto largo, ya limpios. { campo → texto }
export function extraerCampos(wikitexto) {
    const campos = {};
    const partes = String(wikitexto ?? '').split(/\n\|(?=\s*\w+\s*=)/);
    for (const parte of partes.slice(1)) {
        const igual = parte.indexOf('=');
        const nombre = parte.slice(0, igual).trim();
        if (!CAMPO_DE_PERFIL.test(nombre) || nombre in campos) continue; // lo demás de la ficha (tablas, estilos, referencias…) no es descripción
        const valor = limpiarTexto(parte.slice(igual + 1).split(/\n\}\}/)[0]); // (el último campo termina donde cierra la ficha: lo que sigue es el cuerpo)
        if (valor.length >= LARGO_MINIMO_DE_CAMPO)
            campos[nombre] = valor
                .replace(/\s*""/g, '')
                .replace(/\s*\(\s*\)/g, '')
                .replace(/\s{2,}/g, ' '); // (los nombres de ataques eran plantillas: quedan comillas y paréntesis vacíos)
    }
    return campos;
}

// El cuerpo de la página, solo con lo que cuenta: sin listas (las evoluciones ya las tenemos), sin tablas, sin títulos vacíos y cortado donde empiezan
// los datos de juegos, mascotas virtuales y cartas
const SECCIONES_DE_RELLENO = /^## (Video Games|Virtual Pets|TCG|Card Game|Additional Information|Notes|References|External Links|Trivia)\b/i;
export function extraerCuerpo(wikitexto) {
    const lineas = [];
    for (const linea of limpiarTexto(wikitexto).split('\n')) {
        if (SECCIONES_DE_RELLENO.test(linea)) break;
        if (/^\s*([*#:]|\||!|-{3,})/.test(linea)) continue; // listas, tablas y rayas
        lineas.push(linea.replace(/\s*""/g, '').replace(/\s*\(\s*\)/g, ''));
    }
    // un título solo se queda si después hay texto antes del próximo título
    const conTexto = lineas.filter((linea, indice) => {
        if (!/^##/.test(linea)) return true;
        const siguiente = lineas.slice(indice + 1).find(otra => otra.trim());
        return siguiente !== undefined && !/^##/.test(siguiente);
    });
    return conTexto
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, LARGO_MAXIMO_DEL_TEXTO);
}

// Otras formas de escribir el nombre: las de nombres-japoneses.mjs y, además, sin los espacios de la parte de adelante
// ('Death Airdramon' → 'DeathAirdramon', que es como muchas veces titula Wikimon)
function formasDe(nombre) {
    const juntar = texto => texto.replace(/^(.*?)(\s*[(:].*)?$/, (_, base, resto = '') => base.replace(/\s+/g, '') + resto);
    return [...new Set([nombre, ...variantesDelNombre(nombre), juntar(nombre), ...variantesDelNombre(nombre).map(juntar)])];
}

async function buscarLote(titulos) {
    const paginas = await traerPaginas(titulos);
    return Object.fromEntries(
        Object.entries(paginas).map(([pedido, texto]) => [pedido, texto ? { campos: extraerCampos(texto), texto: extraerCuerpo(texto) } : null]),
    );
}

function leerCache() {
    try {
        return existsSync(archivoCache) ? JSON.parse(readFileSync(archivoCache, 'utf8')) : {};
    } catch {
        return {}; // un caché dañado se rehace
    }
}

const tieneContenido = ficha => ficha && (ficha.texto || Object.keys(ficha.campos).length);

async function principal() {
    const prueba = process.argv.includes('prueba');
    if (!existsSync(archivoDatos)) throw new Error('Falta herramientas/elementos-datos.json: corré antes "node herramientas/elementos-datos.mjs".');
    const todos = JSON.parse(readFileSync(archivoDatos, 'utf8'));
    const faltantes = todos.filter(digimon => !String(digimon.descripcion ?? '').trim());
    const elegidos = prueba ? faltantes.filter(digimon => ['Death Airdramon', 'Minotaurmon', 'Etemon Chaos'].includes(digimon.nombre)) : faltantes;
    console.log(`${todos.length} digimons; sin descripción en la API: ${faltantes.length}${prueba ? ` (se prueba con ${elegidos.length})` : ''}.`);

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
        const sinContenido = nombres.filter(nombre => !tieneContenido(cache[nombre]));
        const otrasFormas = [...new Set(sinContenido.flatMap(formasDe))];
        if (otrasFormas.some(forma => !(forma in cache))) {
            console.log('\nProbando otras formas de escribir los que no aparecieron…');
            await buscarLosQueFaltan(otrasFormas);
        }
    }

    const fichaDe = nombre =>
        formasDe(nombre)
            .map(forma => cache[forma])
            .find(tieneContenido) ?? null;

    if (prueba) {
        for (const digimon of elegidos) {
            const ficha = fichaDe(digimon.nombre);
            console.log(`\n=== ${digimon.nombre} (#${digimon.id}) ===`);
            if (!ficha) {
                console.log('(Wikimon no tiene la página o no trae texto)');
                continue;
            }
            for (const [campo, valor] of Object.entries(ficha.campos)) console.log(`[campo ${campo}, ${valor.length} caracteres] ${valor.slice(0, 600)}`);
            console.log(`[cuerpo, ${ficha.texto.length} caracteres] ${ficha.texto.slice(0, 900)}`);
        }
        console.log('\nSi se ve bien, corré el programa sin "prueba" para hacer todos.');
        return;
    }

    const registros = elegidos.map(digimon => {
        const ficha = fichaDe(digimon.nombre);
        const sinDescripcion = Object.fromEntries(Object.entries(digimon).filter(([clave]) => clave !== 'descripcion')); // (viene vacía: no sirve)
        return { ...sinDescripcion, campos: ficha?.campos ?? {}, texto: ficha?.texto ?? '' };
    });
    writeFileSync(archivoSalida, JSON.stringify(registros, null, 1));
    const conTexto = registros.filter(registro => registro.texto || Object.keys(registro.campos).length).length;
    console.log(`\nListo: ${registros.length} digimons, ${conTexto} con texto en Wikimon, ${registros.length - conTexto} sin nada.`);
    console.log('Está en herramientas/descripciones-faltantes.json. Avisale a Claude para escribir las descripciones.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    principal().catch(error => {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    });
}
