// Audita con Wikimon (wikimon.net) las marcas de las cartas: la "A" de los Armor, la "H" de los Hybrid y el "XW" de las fusiones de Digimon Xros Wars.
// Compara lo que hace la página (nivel de la API, nombre, especie y lista de datos.js) con lo que dice Wikimon, y arma un informe con lo que no coincide:
//   · digimons que Wikimon pone como Armor o Hybrid y la carta no lleva la marca (la API los deja como Adult, Perfect…)
//   · cartas que llevan la marca y Wikimon no las pone como Armor ni Hybrid
//   · fusiones de Xros Wars que la carta no marca con "XW" (por ejemplo, "Rare Star Sword": no tiene especie ni nada en el nombre que la delate)
//   · cartas con "XW" que Wikimon no relaciona con DigiXros
// No cambia nada de la página: solo arma un informe. Con él se decide qué corregir.
//
// Necesita herramientas/elementos-datos.json (lo arma herramientas/elementos-datos.mjs): de ahí saca el nivel, la especie y el nombre de cada digimon.
//
// Se corre desde la carpeta del proyecto, en la terminal:
//   node herramientas/marcas-wikimon.mjs prueba   → prueba rápida con unos digimons (un solo pedido, tarda como 1 minuto; no escribe el informe)
//   node herramientas/marcas-wikimon.mjs          → todos los digimons (unos 30 pedidos a Wikimon; tarda como 30 minutos)
//
// Como los otros: respeta la pausa de 60 segundos entre pedidos que pide Wikimon y, si se corta, al volver a correrlo sigue donde quedó
// (lo ya buscado está en herramientas/marcas-wikimon.cache.json).
//
// Al terminar escribe:
//   herramientas/marcas-wikimon-diferencias.txt   → el informe

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ANIOS_XROS_WARS, ESPECIES_DE_FUSION, FUSIONES_XROS_WARS } from '../datos.js';
import { ESPECIES_CORREGIDAS } from '../especiesCorregidas.js';
import { extraerCampos } from './descripciones-faltantes.mjs';
import { extraerFicha } from './especies-wikimon.mjs';
import { ESPERA_MS, POR_PEDIDO, esperar, traerPaginas, variantesDelNombre } from './nombres-japoneses.mjs';

const archivoDatos = new URL('./elementos-datos.json', import.meta.url);
const archivoCache = new URL('./marcas-wikimon.cache.json', import.meta.url);
const archivoInforme = new URL('./marcas-wikimon-diferencias.txt', import.meta.url);

const PRUEBA = ['Fladramon', 'Magnamon', 'Agunimon', 'Rare Star Sword', 'Star Axe', 'Shoutmon X7', 'Opossummon', 'Digmon'];

// Lo que mira cada digimon de Xros Wars en el texto de Wikimon: las palabras de la fusión
// (el nombre de la serie, "Xros Wars", sale en las páginas de todos los de esa temporada, así que no cuenta como señal de fusión)
const PALABRAS_DE_FUSION = /digi-?xros(?:s?ed|sing)?|xros up|gattai|forced xros|grand xros/gi;

const claveDeNombre = nombre =>
    nombre
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

// Lo mismo que hace cartas.js (esXrosWars) para poner el "XW": por el nombre, por la lista de datos.js o por la especie de fusión en 2010-2012.
// Si cartas.js cambia, hay que cambiar esto también. (Acá el año es el de Wikimon, no el de la API.)
const CLAVES_XROS_WARS = new Set(FUSIONES_XROS_WARS.map(claveDeNombre));
const esXrosWars = (nombre, especies, anio) =>
    /xros|\bgattai\b/i.test(nombre) ||
    /\bX\d/.test(nombre) ||
    CLAVES_XROS_WARS.has(claveDeNombre(nombre)) ||
    (ANIOS_XROS_WARS.includes(anio) && especies.some(especie => ESPECIES_DE_FUSION.includes(especie)));

// Un pedacito de wikitexto, sin enlaces ni marcas, para leerlo en el informe
const limpiarFragmento = texto =>
    texto
        .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
        .replace(/\{\{[^{}]*\}\}/g, '')
        .replace(/['|{}[\]]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

// De una página de Wikimon saca lo que sirve para las marcas:
//   niveles    → { l1, l2… } los niveles de la ficha (el l1 es el principal)
//   anio       → el año de estreno (campo "yd"), o null
//   especies   → las especies de la ficha (t1, t2…)
//   categorias → las categorías de la página
//   xros       → { perfil, cuerpo, fragmento }: cuántas veces habla de DigiXros / Xros Up / Gattai en el perfil y en toda la página, y un pedacito de ejemplo
export function extraerMarcas(wikitexto) {
    const { campos } = extraerFicha(wikitexto);
    const niveles = Object.fromEntries(Object.entries(campos).filter(([nombre]) => /^l\d+$/.test(nombre)));
    const especies = Object.entries(campos)
        .filter(([nombre]) => /^t\d+$/.test(nombre))
        .map(([, valor]) => valor);
    const categorias = [...new Set([...String(wikitexto).matchAll(/\[\[Category:([^\]|]+)/gi)].map(coincidencia => coincidencia[1].trim()))];
    const perfil = Object.values(extraerCampos(wikitexto)).join('\n');
    const enPerfil = perfil.match(PALABRAS_DE_FUSION) ?? [];
    const sinPerfil = String(wikitexto).replace(/<ref[\s\S]*?(<\/ref>|\/>)/gi, '');
    const enTodo = sinPerfil.match(PALABRAS_DE_FUSION) ?? [];
    const lugar = sinPerfil.search(PALABRAS_DE_FUSION);
    return {
        niveles,
        anio: /^\d{4}$/.test(campos.yd ?? '') ? Number(campos.yd) : null,
        especies,
        categorias,
        xros: {
            perfil: enPerfil.length,
            cuerpo: enTodo.length,
            fragmento: lugar >= 0 ? limpiarFragmento(sinPerfil.slice(Math.max(0, lugar - 70), lugar + 110)) : '', // (el primero que aparece en la página)
        },
    };
}

async function buscarLote(titulos) {
    const paginas = await traerPaginas(titulos);
    return Object.fromEntries(
        Object.entries(paginas).map(([pedido, texto]) => [pedido, texto ? { pagina: true, ...extraerMarcas(texto) } : { pagina: false }]),
    );
}

function leerCache() {
    try {
        return existsSync(archivoCache) ? JSON.parse(readFileSync(archivoCache, 'utf8')) : {};
    } catch {
        return {}; // un caché dañado se rehace
    }
}

// La ficha de un digimon, probando también las otras formas de escribir su nombre; se queda con la primera que trae algún nivel
function fichaDe(nombre, cache) {
    const formas = [nombre, ...variantesDelNombre(nombre)];
    return (
        formas.map(forma => cache[forma]).find(ficha => ficha?.pagina && Object.keys(ficha.niveles).length) ??
        formas.map(forma => cache[forma]).find(ficha => ficha?.pagina) ??
        null
    );
}

const marcaDeNivel = nivel => (/^armor$/i.test(nivel ?? '') ? 'Armor' : /^hybrid$/i.test(nivel ?? '') ? 'Hybrid' : null);

async function principal() {
    const prueba = process.argv.includes('prueba');
    if (!existsSync(archivoDatos)) throw new Error('Falta herramientas/elementos-datos.json: corré antes "node herramientas/elementos-datos.mjs".');
    const datos = JSON.parse(readFileSync(archivoDatos, 'utf8'));
    const elegidos = prueba ? PRUEBA.map(nombre => datos.find(digimon => digimon.nombre === nombre) ?? { id: 0, nombre, nivel: '', especies: [] }) : datos;
    console.log(`${datos.length} digimons; se miran ${elegidos.length}${prueba ? ' (prueba)' : ''}.`);

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
        const sinFicha = nombres.filter(nombre => !fichaDe(nombre, cache)?.pagina);
        const otrasFormas = [...new Set(sinFicha.flatMap(variantesDelNombre))];
        if (otrasFormas.some(forma => !(forma in cache))) {
            console.log('\nProbando otras formas de escribir los que no aparecieron…');
            await buscarLosQueFaltan(otrasFormas);
        }
    }

    // Comparar
    const faltaMarca = []; // Wikimon dice Armor o Hybrid y la carta no lleva la marca
    const sobraMarca = []; // la carta lleva la marca y Wikimon no dice Armor ni Hybrid
    const faltaXw = []; // la carta no lleva XW y Wikimon relaciona al digimon con la fusión
    const sobraXw = []; // la carta lleva XW y Wikimon no habla de fusión
    const soloEnOtrosNiveles = []; // Wikimon dice Armor o Hybrid, pero no como nivel principal (casi seguro que no hace falta marcarlos)
    const fueraDeAnios = []; // el perfil habla de DigiXros pero el estreno no es de 2010-2012
    const sinPagina = [];
    const descripcion = (digimon, ficha) =>
        `${digimon.id} · ${digimon.nombre} · API: ${digimon.nivel || '(sin nivel)'} · Wikimon: ${
            Object.entries(ficha.niveles)
                .map(([n, v]) => `${n}=${v}`)
                .join(' ') || '(sin nivel)'
        } · estreno ${ficha.anio ?? '?'}`;
    for (const digimon of elegidos) {
        const ficha = fichaDe(digimon.nombre, cache);
        if (!ficha?.pagina) {
            sinPagina.push(`${digimon.id} · ${digimon.nombre}`);
            continue;
        }
        const marcaActual = marcaDeNivel(digimon.nivel);
        const marcaWikimon = marcaDeNivel(ficha.niveles.l1); // (el principal; los demás niveles son de otras apariciones: un Adult que fue Armor en un juego sigue siendo Adult)
        const soloSecundario = !marcaWikimon && Object.values(ficha.niveles).map(marcaDeNivel).find(Boolean);
        if (marcaWikimon && marcaWikimon !== marcaActual) faltaMarca.push(`${descripcion(digimon, ficha)} → debería llevar ${marcaWikimon}`);
        if (marcaActual && !marcaWikimon) sobraMarca.push(`${descripcion(digimon, ficha)} → la carta lleva ${marcaActual}`);
        if (soloSecundario && !marcaActual) soloEnOtrosNiveles.push(`${descripcion(digimon, ficha)} → ${soloSecundario} solo en un nivel secundario`);

        const especies = ESPECIES_CORREGIDAS[digimon.id] ?? digimon.especies ?? [];
        const lleva = esXrosWars(digimon.nombre, especies, ficha.anio);
        const señal = ficha.xros.cuerpo; // cuántas veces habla de DigiXros, Xros Up o Gattai en toda la página
        const enLosAnios = ANIOS_XROS_WARS.includes(ficha.anio);
        const detalle = `${descripcion(digimon, ficha)} · especies [${especies.join(', ')}] · fusión: perfil ${ficha.xros.perfil}, página ${señal}`;
        if (!lleva && enLosAnios && señal > 0) faltaXw.push({ señal, texto: `${detalle} · «${ficha.xros.fragmento}»` });
        else if (!lleva && ficha.xros.perfil > 0) fueraDeAnios.push(`${detalle} · «${ficha.xros.fragmento}»`);
        if (lleva && señal === 0) sobraXw.push(`${detalle} · Wikimon no habla de fusión en ninguna parte`);
    }
    faltaXw.sort((a, b) => b.señal - a.señal);

    const informe = [
        `MARCAS: la página contra Wikimon (${elegidos.length} digimons)`,
        `Falta la A o la H: ${faltaMarca.length} · Sobra la A o la H: ${sobraMarca.length} · Falta el XW: ${faltaXw.length} · Sobra el XW: ${sobraXw.length} · Sin página en Wikimon: ${sinPagina.length}`,
        '',
        '== WIKIMON DICE ARMOR O HYBRID Y LA CARTA NO LLEVA LA MARCA ==',
        ...faltaMarca,
        '',
        '== LA CARTA LLEVA A O H Y WIKIMON NO LO DICE ==',
        ...sobraMarca,
        '',
        '== SOLO COMO NIVEL SECUNDARIO EN WIKIMON (Armor o Hybrid que no es su nivel principal) ==',
        ...soloEnOtrosNiveles,
        '',
        '== FALTA EL XW (estreno 2010-2012, Wikimon habla de DigiXros / Xros Up / Gattai en la página y la carta no lleva el XW; primero los que más hablan) ==',
        ...faltaXw.map(item => item.texto),
        '',
        '== DIGIXROS EN EL PERFIL PERO EL ESTRENO NO ES DE 2010-2012 (sin XW) ==',
        ...fueraDeAnios,
        '',
        '== SOBRA EL XW (la carta lo lleva y Wikimon no habla de fusión) ==',
        ...sobraXw,
        '',
        '== NO SE ENCONTRARON EN WIKIMON ==',
        ...sinPagina,
        '',
    ].join('\n');

    if (prueba) {
        for (const digimon of elegidos) {
            const ficha = fichaDe(digimon.nombre, cache);
            console.log(
                `\n${digimon.nombre}: ${ficha?.pagina ? `niveles ${JSON.stringify(ficha.niveles)} · estreno ${ficha.anio} · especies [${ficha.especies}] · fusión en el perfil ${ficha.xros.perfil} / en toda la página ${ficha.xros.cuerpo}${ficha.xros.fragmento ? ` · «${ficha.xros.fragmento}»` : ''}\n   categorías: ${ficha.categorias.join(' | ')}` : '(no se encontró la página)'}`,
            );
        }
        console.log('\nSi se ve bien, corré el programa sin "prueba". Avisale a Claude lo que salió en la prueba.');
        return;
    }

    writeFileSync(archivoInforme, informe);
    console.log(`\nListo: ${elegidos.length} digimons.`);
    console.log(
        `Falta la A o la H: ${faltaMarca.length} · Sobra la A o la H: ${sobraMarca.length} · Falta el XW: ${faltaXw.length} · Sobra el XW: ${sobraXw.length} · Sin página: ${sinPagina.length} · Armor/Hybrid solo secundario: ${soloEnOtrosNiveles.length} · DigiXros fuera de 2010-2012: ${fueraDeAnios.length}`,
    );
    console.log('El informe está en herramientas/marcas-wikimon-diferencias.txt y lo buscado en herramientas/marcas-wikimon.cache.json. Avisale a Claude.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    principal().catch(error => {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    });
}
