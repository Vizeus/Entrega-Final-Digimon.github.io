// -----------------------------------------------------------------------------------------------------------------
// FURIGANA (la lectura en kana, chiquita, arriba de los kanji)
//
// Solo cuando la página está en japonés. En Japón los textos para chicos (y Digimon lo es) llevan furigana sobre los kanji, y acá va sobre todos.
// No se toca ningún texto del código: este archivo mira la página (con un MutationObserver) y, a cada texto con kanji que aparece, le pone
// <ruby> sobre los grupos de kanji que están en la lista de lecturas (furiganaJa.js, armada por herramientas/furigana.mjs; la búsqueda, que es la
// misma que usa esa herramienta, está en furiganaMotor.js). Lo que no está en la lista se queda sin furigana: mejor ninguno que uno equivocado.
//
// La lectura no es un texto de la página sino el atributo data-l del <rt> (el CSS la escribe con ::before): así el texto de los elementos sigue
// siendo el de siempre (textContent, buscar en la página, copiar, el lector de pantalla) y el resto del código no se entera de que hay furigana.
// La lista de lecturas pesa bastante y solo sirve en japonés, así que se baja recién cuando la página se pone en japonés.
// -----------------------------------------------------------------------------------------------------------------

import { idioma, t } from './i18n.js';
import { KANJI, armarIndice, segmentar } from './furiganaMotor.js';
import { guardarTexto, leerTexto, ponerAyuda } from './util.js';

const CLAVE_GUARDADA = 'digimon-furigana';

// Lugares donde no se pone furigana: lo que no es texto para leer (scripts, estilos) y lo que no admite etiquetas (cuadros de texto y opciones de listas)
const ETIQUETAS_SIN_FURIGANA = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'OPTION', 'SELECT', 'TITLE', 'RT', 'RP', 'SVG', 'CANVAS']);

let indice = null; // el índice de búsqueda (se arma al bajar la lista)
let sinFurigana = new Set(); // textos enteros que no llevan (los nombres de ataques que solo existen en chino)
let cargando = null;
let observador = null;

// ---- Poner el furigana a un texto ----------------------------------------------------------------------------------------------

function sePuedeAnotar(nodo) {
    const padre = nodo.parentElement;
    return Boolean(padre) && !ETIQUETAS_SIN_FURIGANA.has(padre.tagName.toUpperCase()) && !padre.closest('ruby, [data-sin-furigana]');
}

function crearRuby(base, lectura) {
    const ruby = document.createElement('ruby');
    ruby.append(base);
    const rt = document.createElement('rt');
    rt.dataset.l = lectura;
    ruby.append(rt);
    return ruby;
}

function anotarTexto(nodo) {
    const texto = nodo.nodeValue;
    if (!KANJI.test(texto) || !sePuedeAnotar(nodo) || sinFurigana.has(texto.trim())) return;
    const trozos = segmentar(texto, indice);
    if (!trozos.some(trozo => trozo.lectura)) return;
    const fragmento = document.createDocumentFragment();
    for (const trozo of trozos) fragmento.append(trozo.lectura ? crearRuby(trozo.texto, trozo.lectura) : trozo.texto);
    nodo.replaceWith(fragmento);
}

function anotarDentroDe(raiz) {
    if (raiz.nodeType === Node.TEXT_NODE) {
        anotarTexto(raiz);
        return;
    }
    if (raiz.nodeType !== Node.ELEMENT_NODE && raiz.nodeType !== Node.DOCUMENT_NODE) return;
    const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const nodos = [];
    while (recorrido.nextNode()) nodos.push(recorrido.currentNode); // (primero se juntan: reemplazar un nodo mientras se recorre rompe el recorrido)
    nodos.forEach(anotarTexto);
}

// Saca todo el furigana (al pasar a otro idioma): cada <ruby> vuelve a ser el texto de sus kanji
function quitarTodo() {
    for (const ruby of document.querySelectorAll('ruby')) ruby.replaceWith(ruby.firstChild ?? '');
    document.body.normalize(); // (junta de nuevo los pedazos de texto que quedaron sueltos)
}

// ---- Mirar la página mientras está en japonés ----------------------------------------------------------------------------------

// Lo que se agrega a la página, o el texto que se cambia, se anota apenas pasa. Mientras se anota, el observador se desconecta: así no se mira
// a sí mismo (y no hay que filtrar lo que él mismo escribió).
function atenderCambios(cambios) {
    observador.disconnect();
    for (const cambio of cambios) {
        if (cambio.type === 'characterData') anotarTexto(cambio.target);
        else cambio.addedNodes.forEach(anotarDentroDe);
    }
    observar();
}

function observar() {
    observador.observe(document.body, { childList: true, subtree: true, characterData: true });
}

// Baja la lista de lecturas (una sola vez)
function cargarLecturas() {
    cargando ??= import('./furiganaJa.js').then(({ LECTURAS_JA, SIN_FURIGANA_JA }) => {
        indice = armarIndice(LECTURAS_JA);
        sinFurigana = new Set(SIN_FURIGANA_JA);
    });
    return cargando;
}

async function empezar() {
    try {
        await cargarLecturas();
    } catch {
        cargando = null; // sin la lista no hay furigana, pero la página sigue igual
        return;
    }
    if (idioma !== 'ja') return; // (si en lo que bajaba se cambió de idioma, ya no hace falta)
    observador ??= new MutationObserver(atenderCambios);
    observador.disconnect();
    anotarDentroDe(document.body);
    observar();
}

function terminar() {
    observador?.disconnect();
    quitarTodo();
}

// Para el cartel de ayuda (cartelAyuda.js): el texto partido en pedazos, con o sin lectura (null si la lista todavía no bajó o si es un texto sin furigana)
export function pedazosConLectura(texto) {
    if (!indice || sinFurigana.has(texto.trim())) return null;
    return segmentar(texto, indice);
}

// ---- Botón: con o sin furigana ----------------------------------------------------------------------------------------------------

// El botón (en la barra, junto a los de sonido y tema) solo se ve en japonés. La elección se recuerda; sin elegir, el furigana está puesto. Quitarlo es ocultar las lecturas con CSS
// (no hay que tocar la página), así que se ve al instante.
export function furiganaPuesto() {
    return leerTexto(CLAVE_GUARDADA) !== 'no';
}

function mostrarEstado() {
    const puesto = furiganaPuesto();
    document.documentElement.dataset.furigana = puesto ? 'si' : 'no';
    const boton = document.getElementById('cambiar-furigana');
    if (!boton) return;
    boton.hidden = idioma !== 'ja';
    boton.setAttribute('aria-pressed', String(!puesto)); // ("hundido" = sin furigana, como el botón de inclinación invertida)
    ponerAyuda(boton, t(puesto ? 'furigana.quitar' : 'furigana.poner'));
}

function alternarFurigana() {
    guardarTexto(CLAVE_GUARDADA, furiganaPuesto() ? 'no' : 'si');
    mostrarEstado();
}

export function activarFurigana() {
    mostrarEstado();
    document.getElementById('cambiar-furigana')?.addEventListener('click', alternarFurigana);
    document.addEventListener('idioma-cambiado', () => {
        mostrarEstado();
        if (idioma === 'ja') empezar();
        else terminar();
    });
    if (idioma === 'ja') empezar();
}
