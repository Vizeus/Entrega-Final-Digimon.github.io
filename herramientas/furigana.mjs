// Arma la lista de lecturas (furigana) de los kanji que usa la página en japonés.
//
// Cómo funciona:
//   1. Recorre los archivos .js del proyecto y junta todos los textos entre comillas que tienen kanji (descripciones de ataques, nombres, menús...).
//   2. Los pasa por kuromoji (un analizador de japonés) que los corta en palabras y dice cómo se lee cada una. De cada palabra con kanji arma una entrada
//      con marcas (食《た》べる: la lectura va solo sobre los kanji, no sobre la okurigana); si una palabra se lee distinto según el texto, se queda con la
//      lectura que más veces aparece. Un kanji suelto solo se anota cuando aparece solo (no pegado a otro kanji) y las lecturas de los pegados se arman
//      aparte (ver 4; los sufijos que sí pueden ir pegados llevan un "+" en furigana-a-mano.json): kuromoji lee mal los compuestos que no conoce ("炎弾" lo lee ほのおたま en vez de えんだん).
//   3. Los nombres de los ataques y de los digimons se leen de su romanización (la clave: "Bakusuiryū" → 爆水竜《ばくすいりゅう》), que es la de Wikimon y
//      es más confiable que kuromoji para esos nombres. Solo se usa si la romanización calza con la parte en kana del nombre y la cantidad de sílabas es razonable.
//   4. Le pone encima lo que está en herramientas/furigana-a-mano.json (lo que kuromoji no sabe o lee mal): eso siempre gana.
//   5. Prueba la lista como la usa la página (la palabra más larga que calce, de izquierda a derecha) y escribe en herramientas/furigana-revisar.txt los kanji
//      que quedaron sin lectura, para agregarlos en furigana-a-mano.json.
//
// Se corre desde la carpeta del proyecto: node herramientas/furigana.mjs
// Escribe furiganaJa.js (la lista, sí se sube) y herramientas/furigana-revisar.txt (el informe, no se sube).

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { KANJI, KATAKANA, armarIndice, segmentar, sinMarcas } from '../furiganaMotor.js';
import { ATAQUES_JA } from '../ataquesJa.js';
import { NOMBRES_JA } from '../nombresJa.js';
import { aHiragana as romajiAHiragana } from './romaji.mjs';

const require = createRequire(import.meta.url);
const kuromoji = require('kuromoji');
const espree = require('espree');

const carpeta = new URL('../', import.meta.url);
const archivoAMano = new URL('./furigana-a-mano.json', import.meta.url);
const archivoSalida = new URL('../furiganaJa.js', import.meta.url);
const archivoInforme = new URL('./furigana-revisar.txt', import.meta.url);

const KC = '\\u3400-\\u4dbf\\u4e00-\\u9fff々〆';
const SOLO_KANJI = new RegExp(`^[${KC}]$`);
const aHiragana = texto => texto.replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const hayKanji = texto => KANJI.test(texto);
// Los nombres de ataques chinos (en caracteres simplificados y con pinyin en la clave) no tienen lectura japonesa
const PINYIN = /[àáǎèéěìíǐòóǒùúǔǘǚ]/;

// ---- 1. Los textos con kanji -----------------------------------------------------------------------------------------------------------------

// Textos entre comillas de un archivo (sin los comentarios), con espree para no confundir un apóstrofo de un comentario con una comilla
function textosDe(codigo) {
    const textos = [];
    const recorrer = nodo => {
        if (!nodo || typeof nodo.type !== 'string') return;
        if (nodo.type === 'Literal' && typeof nodo.value === 'string') textos.push(nodo.value);
        if (nodo.type === 'TemplateElement') textos.push(nodo.value.cooked ?? '');
        for (const [campo, valor] of Object.entries(nodo)) {
            // Las claves de los objetos (en las listas de nombres son los nombres de la API, que no se ven en japonés) no cuentan
            if (campo === 'key' && !nodo.computed) continue;
            if (Array.isArray(valor)) valor.forEach(recorrer);
            else if (valor && typeof valor === 'object') recorrer(valor);
        }
    };
    recorrer(espree.parse(codigo, { ecmaVersion: 'latest', sourceType: 'module' }));
    return textos;
}

// Los textos de la página tienen trozos que no son japonés: {n} (variables) y <b>…</b> (etiquetas). Se parte por ellos.
function trozosDe(texto) {
    return texto.split(/\{[^}]*\}|<[^>]*>|&[a-z]+;/g).filter(hayKanji);
}

function juntarTextos() {
    const trozos = new Set();
    for (const nombre of readdirSync(carpeta)) {
        if (!nombre.endsWith('.js') || nombre === 'furiganaJa.js' || nombre.startsWith('eslint')) continue;
        for (const texto of textosDe(readFileSync(new URL(nombre, carpeta), 'utf8'))) {
            if (hayKanji(texto)) trozosDe(texto).forEach(trozo => trozos.add(trozo));
        }
    }
    return [...trozos];
}

// ---- 2. kuromoji -----------------------------------------------------------------------------------------------------------------------------

const analizador = await new Promise((resolver, rechazar) => {
    kuromoji
        .builder({ dicPath: new URL('../node_modules/kuromoji/dict/', import.meta.url).pathname })
        .build((error, tokenizer) => (error ? rechazar(error) : resolver(tokenizer)));
});

// Una palabra de kuromoji → con marcas. Los kanji de la palabra se alinean con su lectura dejando afuera la okurigana: 食べる (タベル) → 食《た》べる.
// Devuelve null si no se puede (kuromoji no conoce la palabra o la lectura no calza con la escritura).
function marcarPalabra(superficie, lecturaKatakana) {
    if (!hayKanji(superficie)) return superficie;
    if (!lecturaKatakana || lecturaKatakana === '*') return null;
    const lectura = aHiragana(lecturaKatakana);
    const partes = superficie.match(new RegExp(`[${KC}]+|[^${KC}]+`, 'g'));
    const patron = partes.map(parte => (hayKanji(parte) ? '(.+?)' : aHiragana(parte).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('');
    const calce = lectura.match(new RegExp(`^${patron}$`));
    if (!calce) return null;
    let n = 1;
    return partes.map(parte => (hayKanji(parte) ? `${parte}《${calce[n++]}》` : parte)).join('');
}

// ---- 3. Nombres: la lectura sale de la romanización -----------------------------------------------------------------------------------------

// La vocal larga se escribe de varias formas (ー, う, お...): para comparar la parte en kana del nombre con la romanización se igualan
const igualar = texto =>
    aHiragana(texto)
        .replace(/([あかさたなはまやらわがざだばぱ])ー/g, '$1あ')
        .replace(/([いきしちにひみりぎじびぴ])ー/g, '$1い')
        .replace(/([うくすつぬふむゆるぐずぶぷ])ー/g, '$1う')
        .replace(/([えけせてねへめれげぜでべぺ])ー/g, '$1え')
        .replace(/([おこそとのほもよろをごぞどぼぽ])ー/g, '$1う');
const PUNTUACION = /^[・：:！!（）()\s·、。\-\u3000]+$/;
const moras = lectura => lectura.replace(/[ゃゅょぁぃぅぇぉ]/g, '').length;

// "Bakusuiryū" + 爆水竜 → 爆水竜《ばくすいりゅう》. Devuelve { marcado } o { motivo } si no se pudo.
function leerPorRomaji(clave, valor) {
    const limpia = clave.replace(/\[.*?\]/g, '').trim();
    const romaji = romajiAHiragana(limpia);
    if (!romaji) return { motivo: 'la clave no es romaji' };
    const partes = valor.match(new RegExp(`[${KC}]+|[^${KC}]+`, 'g'));
    for (let i = 0; i < partes.length - 2; i++) {
        if (hayKanji(partes[i]) && hayKanji(partes[i + 2]) && PUNTUACION.test(partes[i + 1]))
            return { motivo: 'dos grupos de kanji separados por un signo: no se sabe dónde cortar' };
    }
    const patron = partes
        .map(parte => (hayKanji(parte) ? '(.+?)' : PUNTUACION.test(parte) ? '' : igualar(parte).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        .join('');
    const calce = igualar(romaji).match(new RegExp(`^${patron}$`));
    if (!calce) return { motivo: 'la romanización no calza con el nombre' };
    let n = 1;
    for (const parte of partes) {
        if (!hayKanji(parte)) continue;
        const lectura = calce[n++];
        const razon = moras(lectura) / [...parte].length;
        if (razon < 1.2 || razon > 3.6) return { motivo: `lectura rara (${parte} → ${lectura}): faltan o sobran sílabas en la romanización` };
    }
    n = 1;
    return { marcado: partes.map(parte => (hayKanji(parte) ? `${parte}《${calce[n++]}》` : parte)).join('') };
}

const porRomaji = new Map(); // valor (el nombre en japonés) → marcado
const noCalzaron = [];
const conflictos = [];
for (const [nombre, lista] of [
    ['ataque', ATAQUES_JA],
    ['digimon', NOMBRES_JA],
]) {
    for (const [clave, valor] of Object.entries(lista)) {
        if (!hayKanji(valor) || PINYIN.test(clave)) continue;
        const resultado = leerPorRomaji(clave, valor);
        if (!resultado.marcado) {
            noCalzaron.push(`${nombre}\t${clave}\t${valor}\t${resultado.motivo}`);
            continue;
        }
        if (porRomaji.has(valor) && porRomaji.get(valor) !== resultado.marcado)
            conflictos.push(`${valor}\t${porRomaji.get(valor)}  |  ${resultado.marcado}\t(${clave})`);
        else porRomaji.set(valor, resultado.marcado);
    }
}
for (const conflicto of conflictos) porRomaji.delete(conflicto.split('\t')[0]); // si dos claves se leen distinto, no se usa ninguna

// ---- 4. Las palabras -------------------------------------------------------------------------------------------------------------------------

const trozos = juntarTextos();
const lecturasPorPalabra = new Map(); // "食べる" → Map("食《た》べる" → veces)
const ejemplos = new Map(); // palabra → un texto donde aparece

for (const trozo of trozos) {
    for (const palabra of analizador.tokenize(trozo)) {
        const superficie = palabra.surface_form;
        if (!hayKanji(superficie) || superficie.includes('々')) continue;
        const marcada = marcarPalabra(superficie, palabra.reading);
        if (marcada === null) continue;
        if (SOLO_KANJI.test(superficie)) {
            // Un kanji suelto: se cuenta solo cuando no está pegado a otro kanji ni detrás de un katakana (ahí la lectura cambia: 弾 → たま, pero エネルギー弾 → だん)
            const inicio = palabra.word_position - 1;
            const pegado = hayKanji(trozo[inicio - 1] ?? '') || KATAKANA.test(trozo[inicio - 1] ?? '') || hayKanji(trozo[inicio + 1] ?? '');
            if (pegado) continue;
        }
        if (!lecturasPorPalabra.has(superficie)) lecturasPorPalabra.set(superficie, new Map());
        const lecturas = lecturasPorPalabra.get(superficie);
        lecturas.set(marcada, (lecturas.get(marcada) ?? 0) + 1);
        if (!ejemplos.has(superficie)) ejemplos.set(superficie, trozo);
    }
}

const lista = new Map(); // clave → entrada de la lista
const variantes = []; // palabras que se leen distinto en distintos textos
for (const [clave, lecturas] of lecturasPorPalabra) {
    const ordenadas = [...lecturas].sort((a, b) => b[1] - a[1]);
    lista.set(clave, ordenadas[0][0]);
    if (ordenadas.length > 1) variantes.push({ clave, ordenadas, ejemplo: ejemplos.get(clave) });
}
for (const marcado of porRomaji.values()) lista.set(sinMarcas(marcado), marcado);

// ---- 5. Lo hecho a mano (gana sobre lo automático) ---------------------------------------------------------------------------------------------

const aMano = existsSync(archivoAMano) ? JSON.parse(readFileSync(archivoAMano, 'utf8')) : [];
// (un kanji suelto puede estar dos veces: solo, con su lectura de siempre, y con un "+", para cuando va pegado a otro kanji)
for (const entrada of aMano) lista.set((entrada.startsWith('+') ? '+' : '') + sinMarcas(entrada), entrada);

// ---- 6. Prueba como la usa la página -----------------------------------------------------------------------------------------------------------

const entradas = [...lista.values()].sort((a, b) => sinMarcas(a).localeCompare(sinMarcas(b), 'ja'));
const indice = armarIndice(entradas);
const pendientes = new Map(); // grupo de kanji sin lectura → { veces, ejemplo }
let textosCompletos = 0;
for (const trozo of trozos) {
    const faltan = segmentar(trozo, indice)
        .filter(parte => !parte.lectura)
        .flatMap(parte => parte.texto.match(new RegExp(`[${KC}]+`, 'g')) ?? []);
    if (!faltan.length) textosCompletos++;
    for (const grupo of faltan) {
        if (!pendientes.has(grupo)) pendientes.set(grupo, { veces: 0, ejemplo: trozo });
        pendientes.get(grupo).veces++;
    }
}

// ---- Salida ------------------------------------------------------------------------------------------------------------------------------------

const nombresChinos = [
    ...new Set(
        Object.entries(ATAQUES_JA)
            .filter(([clave]) => PINYIN.test(clave))
            .map(([, valor]) => valor),
    ),
].sort();
const salida =
    '// Lecturas (furigana) de los kanji que usa la página en japonés. LO ARMA herramientas/furigana.mjs: no se edita a mano\n' +
    '// (lo que kuromoji no sabe o lee mal va en herramientas/furigana-a-mano.json). Cada palabra lleva su lectura entre 《 》 solo sobre los kanji;\n' +
    '// un "+" delante marca un kanji suelto que puede ir pegado a otro (ver furiganaMotor.js). Lo usa furigana.js.\n' +
    `export const LECTURAS_JA = [\n${entradas.map(entrada => `    ${JSON.stringify(entrada)},`).join('\n')}\n];\n\n` +
    '// Nombres de ataques que solo existen en chino (caracteres simplificados): no tienen lectura japonesa, así que no llevan furigana\n' +
    `export const SIN_FURIGANA_JA = [\n${nombresChinos.map(nombre => `    ${JSON.stringify(nombre)},`).join('\n')}\n];\n`;
writeFileSync(archivoSalida, salida);

const sinChinos = [...pendientes].filter(([grupo]) => !PINYIN.test(grupo)).sort((a, b) => b[1].veces - a[1].veces);
const informe = [];
informe.push(
    `Textos con kanji: ${trozos.length} (${textosCompletos} con todos sus kanji leídos) · entradas: ${entradas.length} (nombres por romaji: ${porRomaji.size}; a mano: ${aMano.length})`,
);
informe.push('');
informe.push(
    `== KANJI SIN LECTURA (${sinChinos.length} grupos): agregarlos en furigana-a-mano.json. Entre corchetes, cómo los lee kuromoji (suele fallar en compuestos)`,
);
for (const [grupo, { veces, ejemplo }] of sinChinos) {
    const guia = analizador
        .tokenize(grupo)
        .map(p => `${p.surface_form}:${p.reading ? aHiragana(p.reading) : '?'}`)
        .join(' ');
    informe.push(`${grupo}\t×${veces}\t[${guia}]\t← ${ejemplo.slice(0, 40)}`);
}
informe.push('');
informe.push(`== PALABRAS QUE SE LEEN DISTINTO en distintos textos (${variantes.length}): se eligió la más frecuente`);
for (const { clave, ordenadas, ejemplo } of variantes)
    informe.push(`${clave}\t${ordenadas.map(([m, n]) => `${m} ×${n}`).join('  |  ')}\t← ${ejemplo.slice(0, 40)}`);
informe.push('');
informe.push(`== NOMBRES CUYA ROMANIZACIÓN NO SE USÓ (${noCalzaron.length}); se leen con kuromoji o quedan pendientes arriba`);
informe.push(...noCalzaron);
informe.push('');
informe.push(`== NOMBRES CON DOS LECTURAS (${conflictos.length}); no se usó ninguna`);
informe.push(...conflictos);
writeFileSync(archivoInforme, informe.join('\n') + '\n');

console.log(informe[0]);
console.log(
    `kanji sin lectura: ${sinChinos.length} grupos (${sinChinos.reduce((suma, [, { veces }]) => suma + veces, 0)} veces) · variantes: ${variantes.length}`,
);
console.log('Informe: herramientas/furigana-revisar.txt');
