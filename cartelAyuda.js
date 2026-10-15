// -----------------------------------------------------------------------------------------------------------------
// CARTEL DE AYUDA (solo en japonés)
//
// El cartelito que sale al dejar el mouse sobre algo (un botón, una gema, un chip...) es el del navegador, hecho con el atributo title: es texto
// plano y no admite furigana. Solo con la página en japonés, este archivo lo cambia por uno propio, bien simple, que sí lo lleva:
//   · Con el furigana puesto, el texto va todo en kana (hiragana y katakana) y los kanji quedan chiquitos arriba.
//   · Con el furigana sacado, el texto va normal, con sus kanji, y la lectura en kana chiquita arriba.
// Los demás idiomas siguen con el cartelito del navegador. El resto del código no se entera: sigue poniendo title (ponerAyuda), y acá, mientras
// el mouse (o el foco del teclado) está sobre algo, ese title pasa un momento a data-titulo para que el navegador no muestre el suyo.
// -----------------------------------------------------------------------------------------------------------------

import { idioma } from './i18n.js';
import { furiganaPuesto, pedazosConLectura } from './furigana.js';

const ESPERA = 450; // ms con el mouse quieto sobre algo antes de que salga el cartel
const SEPARACION = 20; // px entre el mouse y el cartel
const MARGEN = 8; // px mínimos hasta el borde de la pantalla

let cartel = null;
let actual = null; // el elemento con title sobre el que está el mouse (o el foco)
let reloj = 0;
let puntero = { x: 0, y: 0 };

function crearCartel() {
    const caja = document.createElement('div');
    caja.id = 'cartel-ayuda';
    caja.setAttribute('role', 'tooltip');
    caja.dataset.sinFurigana = ''; // (furigana.js no lo toca: lo arma este archivo)
    document.body.append(caja);
    return caja;
}

// Escribe el texto en el cartel: los pedazos con lectura van en <ruby>, y cuál va arriba depende del botón de furigana
function escribirTexto(texto) {
    const pedazos = pedazosConLectura(texto) ?? [{ texto }];
    const kanaAbajo = furiganaPuesto();
    const partes = pedazos.map(({ texto: pedazo, lectura }) => {
        if (!lectura) return pedazo;
        const ruby = document.createElement('ruby');
        const rt = document.createElement('rt');
        ruby.append(kanaAbajo ? lectura : pedazo, rt);
        rt.dataset.l = kanaAbajo ? pedazo : lectura;
        return ruby;
    });
    cartel.replaceChildren(...partes);
}

function ubicar(elemento, conMouse) {
    const { width, height } = cartel.getBoundingClientRect();
    const caja = elemento.getBoundingClientRect();
    let izquierda = conMouse ? puntero.x - width / 2 : caja.left + caja.width / 2 - width / 2;
    let arriba = conMouse ? puntero.y + SEPARACION : caja.bottom + MARGEN;
    if (arriba + height > window.innerHeight - MARGEN) arriba = (conMouse ? puntero.y - SEPARACION : caja.top - MARGEN) - height;
    izquierda = Math.max(MARGEN, Math.min(izquierda, window.innerWidth - width - MARGEN));
    arriba = Math.max(MARGEN, arriba);
    cartel.style.translate = `${Math.round(izquierda)}px ${Math.round(arriba)}px`;
}

function mostrar(elemento, conMouse) {
    const texto = elemento.dataset.titulo;
    if (!texto || actual !== elemento || idioma !== 'ja') return;
    cartel ??= crearCartel();
    escribirTexto(texto);
    ubicar(elemento, conMouse);
    cartel.classList.add('visible');
}

// Saca el cartel y le devuelve su title al elemento (salvo que mientras tanto el código le haya puesto otro)
function cerrar() {
    clearTimeout(reloj);
    cartel?.classList.remove('visible');
    if (!actual) return;
    if (!actual.title && actual.dataset.titulo) actual.title = actual.dataset.titulo;
    delete actual.dataset.titulo;
    actual = null;
}

function elegir(elemento, conMouse) {
    if (elemento === actual) return;
    cerrar();
    if (!elemento || idioma !== 'ja' || !elemento.title) return;
    actual = elemento;
    elemento.dataset.titulo = elemento.title;
    elemento.removeAttribute('title');
    if (conMouse) reloj = setTimeout(() => mostrar(elemento, true), ESPERA);
    else mostrar(elemento, false);
}

export function activarCartelDeAyuda() {
    document.addEventListener('pointerover', evento => {
        if (evento.pointerType !== 'mouse') return;
        puntero = { x: evento.clientX, y: evento.clientY };
        const encontrado = evento.target.closest?.('[title]') ?? null;
        // (al elemento de ahora ya se le sacó el title: si el mouse se mueve dentro de él, el más cercano con title sería uno de afuera)
        if (actual?.contains(evento.target) && (!encontrado || encontrado.contains(actual))) return;
        elegir(encontrado, true);
    });
    document.addEventListener('pointermove', evento => {
        if (evento.pointerType === 'mouse') puntero = { x: evento.clientX, y: evento.clientY };
    });
    // Con el teclado: el cartel sale al llegar con el foco (solo si se navega con teclado) y se va al salir
    document.addEventListener('focusin', evento => {
        if (evento.target.matches?.(':focus-visible')) elegir(evento.target.closest?.('[title]'), false);
    });
    document.addEventListener('focusout', cerrar);
    document.addEventListener('pointerdown', cerrar, true);
    document.addEventListener('scroll', cerrar, true);
    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape') cerrar();
    });
    document.documentElement.addEventListener('pointerleave', cerrar);
    document.addEventListener('idioma-cambiado', cerrar);
}
