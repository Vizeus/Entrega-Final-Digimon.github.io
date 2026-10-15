// Arma la lista de nombres japoneses de las especies de los digimons ("Reptile" → 爬虫類型), sacándolos de Wikimon (wikimon.net).
// Wikimon no tiene un campo con el nombre japonés de la especie: lo trae adentro del texto de perfil en japonés de cada digimon ("爬虫類型デジモン…").
// Entonces este programa lee la ficha de todos los digimons, mira qué especie tiene cada uno y qué "…型" dice su perfil, y vota: la especie "Reptile"
// aparece en muchos digimons y casi todos dicen 爬虫類型. Los digimons con una sola especie son los que cuentan; en los que tienen varias no se sabe cuál
// "…型" va con cuál, así que esos se usan solo si la especie no apareció de otra forma.
//
// Se corre desde la carpeta del proyecto, en la terminal:
//   node herramientas/especies-japonesas.mjs prueba   → prueba rápida con 4 digimons (un solo pedido, tarda como 1 minuto; no escribe la lista)
//   node herramientas/especies-japonesas.mjs          → todos los digimons (unos 30 pedidos; tarda como 30 minutos)
//
// Como los otros: respeta la pausa de 60 segundos que pide Wikimon y, si se corta, al volver a correrlo sigue donde quedó
// (lo ya buscado está en herramientas/especies-japonesas.cache.json).
//
// Al terminar escribe:
//   especiesJa.js                                    → la lista (especie → japonés), con las que tienen un resultado claro
//   herramientas/especies-japonesas-revisar.txt      → para cada especie: lo que se encontró y cuántos votos tuvo (las dudosas y las que no se encontraron
//                                                      están marcadas: esas se traducen a mano en herramientas/especies-japonesas-a-mano.json)

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ESPERA_MS, POR_PEDIDO, esperar, nombresDeLaApi, traerPaginas, variantesDelNombre } from './nombres-japoneses.mjs';
import { plantillas } from './ataques-japoneses.mjs';

const archivoCache = new URL('./especies-japonesas.cache.json', import.meta.url);
const archivoRevisar = new URL('./especies-japonesas-revisar.txt', import.meta.url);
const archivoAMano = new URL('./especies-japonesas-a-mano.json', import.meta.url);
const archivoPrueba = new URL('./especies-japonesas.prueba.txt', import.meta.url);
const archivoSalida = new URL('../especiesJa.js', import.meta.url);

const PRUEBA = ['Agumon', 'Greymon', 'Garudamon', 'Gomamon'];

// Quita de un valor de Wikimon los enlaces [[a|b]], las comillas de negrita/cursiva, las etiquetas y las plantillas
function limpiar(valor) {
    return String(valor ?? '')
        .replace(/<ref[\s\S]*?(<\/ref>|\/>)/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\{\{[\s\S]*?\}\}/g, '')
        .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
        .replace(/'{2,}/g, '')
        .trim();
}

// De un texto como "恐竜の様な姿をした爬虫類型" deja solo la palabra pegada a 型: "爬虫類型". Es la tira de kanji (o de katakana) que está justo antes.
export function palabraDelTipo(texto) {
    const sinTipo = String(texto).replace(/型$/, '');
    const ultima = sinTipo.slice(-1);
    const patron = /[ァ-ヺー・]/.test(ultima) ? /[ァ-ヺー・]+$/ : /[一-鿿々]+$/;
    const palabra = patron.exec(sinTipo)?.[0];
    return palabra ? `${palabra}型` : null;
}

// Los "…型" que aparecen en el texto de perfil japonés (en orden, con repetidos). Ej: "…した爬虫類型デジモン。…" → ['爬虫類型']
export function tiposEnJapones(texto) {
    const resultado = [];
    for (const coincidencia of String(texto ?? '').matchAll(/([^\s、。，,「」『』（）()[\]{}|<>:：;；*#=!?！？]{1,14}?型)デジモン/g)) {
        const tipo = palabraDelTipo(coincidencia[1]);
        if (tipo) resultado.push(tipo);
    }
    return resultado;
}

// De la página de un digimon: sus especies en inglés (t1, t2…) y los "…型" de su perfil japonés
export function extraerEspecies(wikitexto) {
    const ficha = plantillas(String(wikitexto ?? '')).find(plantilla => plantilla.cuerpo.some(parametro => /^\s*t1\s*=/.test(parametro)));
    if (!ficha) return null;
    const especies = [];
    let perfil = '';
    for (const parametro of ficha.cuerpo) {
        const igual = parametro.indexOf('=');
        if (igual < 0) continue;
        const clave = parametro.slice(0, igual).trim();
        const valor = limpiar(parametro.slice(igual + 1));
        if (/^t\d+$/i.test(clave) && valor) especies.push(valor);
        else if (/^pj/i.test(clave)) perfil += ` ${valor}`;
    }
    return { especies, japoneses: tiposEnJapones(perfil) };
}

function leerCache() {
    return existsSync(archivoCache) ? JSON.parse(readFileSync(archivoCache, 'utf8')) : {};
}

// Los "…型" de una lista, del que más se repite al que menos (los empates quedan en el orden en que aparecieron)
function masRepetidos(japoneses) {
    const cuentas = new Map();
    for (const japones of japoneses) cuentas.set(japones, (cuentas.get(japones) ?? 0) + 1);
    return [...cuentas].sort((a, b) => b[1] - a[1]).map(([japones]) => japones);
}

// Vota: por cada especie, qué "…型" dijeron los digimons que la tienen. Cada digimon vota una vez. Los de una sola especie votan con el "…型" que más
// repite su perfil (son los votos "claros"); los de varias especies no dicen cuál "…型" es de cuál, así que votan con tantos "…型" como especies tengan
// (votos "dudosos", que solo se usan si la especie no tiene ningún voto claro)
export function votar(paginas) {
    const claros = new Map(); // especie → Map(japonés → votos)
    const dudosos = new Map();
    const sumar = (mapa, especie, japones) => {
        if (!mapa.has(especie)) mapa.set(especie, new Map());
        mapa.get(especie).set(japones, (mapa.get(especie).get(japones) ?? 0) + 1);
    };
    for (const pagina of paginas) {
        if (!pagina?.especies.length) continue;
        const candidatos = masRepetidos(pagina.japoneses);
        if (pagina.especies.length === 1) {
            if (candidatos.length) sumar(claros, pagina.especies[0], candidatos[0]);
        } else {
            for (const especie of pagina.especies) for (const japones of candidatos.slice(0, pagina.especies.length)) sumar(dudosos, especie, japones);
        }
    }
    const especies = new Set([...claros.keys(), ...dudosos.keys()]);
    return { claros, dudosos, especies };
}

async function principal() {
    if (process.argv[2] === 'prueba') {
        console.log(`Prueba con ${PRUEBA.length} digimons (un pedido a Wikimon)…`);
        const paginas = await traerPaginas(PRUEBA);
        let crudo = '';
        for (const [nombre, texto] of Object.entries(paginas)) {
            const resultado = extraerEspecies(texto);
            console.log(`\n${nombre}: especies ${JSON.stringify(resultado?.especies)}  →  "…型" del perfil: ${JSON.stringify(resultado?.japoneses)}`);
            const ficha = plantillas(String(texto ?? '')).find(plantilla => plantilla.cuerpo.some(parametro => /^\s*t1\s*=/.test(parametro)));
            crudo += `==== ${nombre} ====\n${ficha ? ficha.cuerpo.map(parametro => parametro.slice(0, 300)).join('\n|') : '(no se encontró la ficha)'}\n\n`;
        }
        writeFileSync(archivoPrueba, crudo);
        console.log('\n(La ficha original de cada uno quedó en herramientas/especies-japonesas.prueba.txt, por si hay que revisar el formato.)');
        console.log('Si salen bien las especies y los "…型", corré el programa sin "prueba" para hacer todos.');
        return;
    }

    console.log('Pidiendo la lista de digimons a la API…');
    const nombres = await nombresDeLaApi();
    console.log(`${nombres.length} digimons.`);

    const cache = leerCache(); // nombre del digimon → { especies, japoneses } (null si no se encontró la ficha)

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
            for (const [nombre, texto] of Object.entries(paginas)) cache[nombre] = texto === null ? null : extraerEspecies(texto);
            writeFileSync(archivoCache, JSON.stringify(cache));
            console.log(`  ${Math.min(desde + POR_PEDIDO, pendientes.length)} / ${pendientes.length}`);
            if (desde + POR_PEDIDO < pendientes.length) await esperar(ESPERA_MS);
        }
    };

    await buscarLosQueFaltan(nombres);

    // Segunda vuelta para los digimons cuya ficha no apareció con el nombre de la API
    const sinFicha = nombres.filter(nombre => !cache[nombre]);
    const otrasFormas = [...new Set(sinFicha.flatMap(variantesDelNombre))];
    if (otrasFormas.some(forma => !(forma in cache))) {
        console.log('\nProbando otras formas de escribir los que no aparecieron…');
        await buscarLosQueFaltan(otrasFormas);
    }

    const fichas = nombres.map(
        nombre =>
            cache[nombre] ??
            variantesDelNombre(nombre)
                .map(forma => cache[forma])
                .find(Boolean) ??
            null,
    );
    const { claros, dudosos, especies } = votar(fichas);
    const aMano = existsSync(archivoAMano) ? JSON.parse(readFileSync(archivoAMano, 'utf8')) : {};

    const elegidas = {};
    const informe = [];
    for (const especie of [...especies].sort((a, b) => a.localeCompare(b, 'en'))) {
        const votos = claros.get(especie) ?? dudosos.get(especie);
        const ordenados = votos ? [...votos].sort((a, b) => b[1] - a[1]) : [];
        const total = ordenados.reduce((suma, [, cantidad]) => suma + cantidad, 0);
        const [mejor, cantidad] = ordenados[0] ?? [null, 0];
        // Resultado claro: vino de digimons de una sola especie y la mayoría (al menos 2 de cada 3 votos) coincide. Si no, queda para revisar
        const claro = Boolean(mejor) && claros.has(especie) && cantidad / total >= 2 / 3;
        const final = aMano[especie] ?? (claro ? mejor : null);
        if (final) elegidas[especie] = final;
        const estado = aMano[especie] ? 'A MANO' : claro ? 'ok' : mejor ? 'REVISAR' : 'FALTA';
        informe.push(
            `${estado.padEnd(8)}${especie.padEnd(28)}${ordenados.map(([japones, n]) => `${japones} (${n})`).join(', ') || '—'}${claros.has(especie) ? '' : '   [solo en digimons con varias especies]'}`,
        );
    }

    const lineas = Object.entries(elegidas).map(([especie, japones]) => `    ${JSON.stringify(especie)}: ${JSON.stringify(japones)},`);
    writeFileSync(
        archivoSalida,
        `// Nombres japoneses de las especies de los digimons. LO ARMA herramientas/especies-japonesas.mjs: no se edita a mano
// (lo que no se encuentra solo va en herramientas/especies-japonesas-a-mano.json). Fuente: Wikimon (https://wikimon.net).
export const ESPECIES_JA = {
${lineas.join('\n')}
};
`,
    );
    writeFileSync(archivoRevisar, informe.join('\n') + '\n');
    const sin = informe.filter(linea => /^(REVISAR|FALTA)/.test(linea)).length;
    console.log(
        `\nListo: ${Object.keys(elegidas).length} de ${especies.size} especies en especiesJa.js; ${sin} para revisar o traducir a mano (ver herramientas/especies-japonesas-revisar.txt).`,
    );
}

// (Solo corre si se lo llama desde la terminal; así se pueden importar las funciones sin que arranque)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    principal().catch(error => {
        console.error('\nError:', error.message);
        process.exitCode = 1;
    });
}
