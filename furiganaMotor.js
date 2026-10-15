// El "motor" del furigana: la parte que no toca la página, para que la usen tanto furigana.js (en el navegador) como herramientas/furigana.mjs (que arma la lista de lecturas).
//
// Las lecturas se guardan como texto con marcas: cada grupo de kanji va seguido de su lectura entre 《 》, y la okurigana queda fuera:
//   食《た》べる   必殺《ひっさつ》技《わざ》   ３本《ぼん》 → solo "本" lleva lectura
// La lista (furiganaJa.js) es un arreglo de esas palabras con marcas; la palabra sin marcas es la clave con la que se busca en un texto.
//
// Un kanji suelto ("炎") solo se usa cuando no está pegado a otro kanji ni detrás de un katakana: dentro de una palabra más larga ("炎弾", "エネルギー弾")
// la lectura cambia (ほのお / えん) y una lectura equivocada es peor que ninguna. Los que sí pueden ir pegados (sufijos como 型, 者, 的...) llevan un "+"
// delante en la lista.

export const KANJI = /[㐀-䶿一-鿿々〆]/;
export const KATAKANA = /[ァ-ヺー-ヿ]/;
const GRUPO_CON_LECTURA = /([㐀-䶿一-鿿々〆]+)《([^》]+)》/g;

// El texto sin las marcas (ni el "+" del principio)
export const sinMarcas = marcado => marcado.replace(/^\+/, '').replace(/《[^》]*》/g, '');

// Una palabra con marcas → trozos: { texto } y { texto, lectura } (los kanji con su lectura)
function trozosDe(marcado) {
    const trozos = [];
    let desde = 0;
    for (const grupo of marcado.matchAll(GRUPO_CON_LECTURA)) {
        if (grupo.index > desde) trozos.push({ texto: marcado.slice(desde, grupo.index) });
        trozos.push({ texto: grupo[1], lectura: grupo[2] });
        desde = grupo.index + grupo[0].length;
    }
    if (desde < marcado.length) trozos.push({ texto: marcado.slice(desde) });
    return trozos;
}

// Arma el índice de búsqueda: primera letra → palabras que empiezan así, de la más larga a la más corta (gana la más larga)
export function armarIndice(lista) {
    const indice = new Map();
    for (const entrada of lista) {
        const libre = entrada.startsWith('+');
        const marcado = libre ? entrada.slice(1) : entrada;
        const clave = sinMarcas(marcado);
        const suelto = clave.length === 1 && KANJI.test(clave) && !libre;
        if (!indice.has(clave[0])) indice.set(clave[0], []);
        indice.get(clave[0]).push({ clave, trozos: trozosDe(marcado), suelto });
    }
    for (const palabras of indice.values()) palabras.sort((a, b) => b.clave.length - a.clave.length);
    return indice;
}

// Un kanji suelto va "pegado" cuando lo precede un kanji o un katakana (エネルギー弾) o lo sigue un kanji (弾丸): ahí no es la palabra sola
const estaPegado = (texto, i) => KANJI.test(texto[i - 1] ?? '') || KATAKANA.test(texto[i - 1] ?? '') || KANJI.test(texto[i + 1] ?? '');

// Un texto → trozos { texto } y { texto, lectura }. Recorre de izquierda a derecha y en cada lugar toma la palabra más larga de la lista que calce.
// Lo que no está en la lista se deja como está (sin lectura: mejor ninguna que una equivocada).
export function segmentar(texto, indice) {
    const trozos = [];
    const sumar = trozo => {
        const ultimo = trozos.at(-1);
        if (!trozo.lectura && ultimo && !ultimo.lectura) ultimo.texto += trozo.texto;
        else trozos.push({ ...trozo });
    };
    let i = 0;
    while (i < texto.length) {
        const palabra = indice.get(texto[i])?.find(({ clave, suelto }) => texto.startsWith(clave, i) && !(suelto && estaPegado(texto, i)));
        if (palabra) {
            palabra.trozos.forEach(sumar);
            i += palabra.clave.length;
        } else {
            sumar({ texto: texto[i] });
            i++;
        }
    }
    return trozos;
}

// Los trozos otra vez como texto con marcas (para probar y revisar). Un "｜" marca dónde empieza un grupo cuando lo precede un kanji sin lectura.
export function aMarcado(trozos) {
    return trozos
        .map((trozo, n) =>
            trozo.lectura
                ? `${n > 0 && !trozos[n - 1].lectura && KANJI.test(trozos[n - 1].texto.at(-1)) ? '｜' : ''}${trozo.texto}《${trozo.lectura}》`
                : trozo.texto,
        )
        .join('');
}
