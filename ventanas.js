// -----------------------------------------------------------------------------------------------------------------
// VENTANAS (SweetAlert2): información, ataques, línea evolutiva y combate
//
//   1. LA PÁGINA QUEDA QUIETA CON UNA VENTANA ABIERTA (celular): ver activarPaginaQuietaConVentanas, más abajo.
//   2. TODAS TIENEN SU CRUZ de cerrar arriba a la derecha, del mismo estilo (ver conCruzDeCierre).
//   3. EL BOTÓN "ATRÁS" (el del sistema en Android, el del navegador o el gesto de volver) CIERRA LA VENTANA: ver activarCierreDeVentanas.
//   4. LOS DESPLEGABLES NO MUEVEN SU BOTÓN: ver mantenerEnSuLugar.
// -----------------------------------------------------------------------------------------------------------------

import { DICCIONARIO, t } from './i18n.js';

Object.assign(DICCIONARIO.es, { 'ventana.cerrar': 'Cerrar la ventana' });
Object.assign(DICCIONARIO.en, { 'ventana.cerrar': 'Close window' });

// ---- 1. La página queda quieta con una ventana abierta (celular) -----------------------------------------------------------
// Mientras hay una ventana abierta (ataques, línea evolutiva, información o combate) la página de atrás no se desplaza con el dedo: lo
// único que se mueve es lo que tiene scroll propio dentro de la ventana (la ventana entera, cuando es más alta que la pantalla). Si ese scroll
// ya llegó al final, el dedo tampoco arrastra a la página (se frena ahí). La página tenía que quedar libre de overflow (ver _base.scss:
// SweetAlert le pone overflow hidden al body y, sin esa regla, la grilla saltaría al aparecer y desaparecer la barra de scroll), así que
// el freno se hace acá, en el movimiento del dedo, igual que con el zoom de una carta (zoom.js) y con el combate (combate.js).
// El combate además lo mantiene entre un cartel y el siguiente, cuando no hay ninguna ventana abierta por un instante.
// En computadora no cambia nada: el freno es solo del dedo.
const hayVentana = () => document.querySelector('.swal2-container') !== null;

// ¿Algo de adentro de la ventana, de donde está el dedo hasta el borde de la ventana, se puede desplazar hacia donde va el dedo?
// "dx" y "dy" son lo que se movió el dedo: con el dedo hacia abajo (dy > 0) el contenido sube, o sea, se desplaza hacia arriba.
function sePuedeDesplazarAdentro(destino, dx, dy) {
    const contenedor = destino.closest?.('.swal2-container');
    if (!contenedor) return false; // el dedo no está sobre la ventana: la página no se mueve
    const vertical = Math.abs(dy) >= Math.abs(dx);
    for (let elemento = destino; elemento && elemento !== contenedor.parentElement; elemento = elemento.parentElement) {
        const estilo = getComputedStyle(elemento);
        if (vertical) {
            const conScroll = /auto|scroll/.test(estilo.overflowY) && elemento.scrollHeight > elemento.clientHeight + 1;
            if (conScroll && (dy > 0 ? elemento.scrollTop > 0 : elemento.scrollTop + elemento.clientHeight < elemento.scrollHeight - 1)) return true;
        } else {
            const conScroll = /auto|scroll/.test(estilo.overflowX) && elemento.scrollWidth > elemento.clientWidth + 1;
            if (conScroll && (dx > 0 ? elemento.scrollLeft > 0 : elemento.scrollLeft + elemento.clientWidth < elemento.scrollWidth - 1)) return true;
        }
    }
    return false;
}

export function activarPaginaQuietaConVentanas() {
    let anterior = null; // { x, y }: dónde estaba el dedo en el movimiento anterior

    window.addEventListener(
        'touchstart',
        evento => {
            anterior = evento.touches.length === 1 ? { x: evento.touches[0].clientX, y: evento.touches[0].clientY } : null;
        },
        { passive: true },
    );

    const soltar = () => {
        anterior = null;
    };
    window.addEventListener('touchend', soltar, { passive: true });
    window.addEventListener('touchcancel', soltar, { passive: true });

    window.addEventListener(
        'touchmove',
        evento => {
            if (!anterior || evento.touches.length !== 1 || !hayVentana()) return; // (con dos dedos es un pellizco: no se toca)
            const toque = evento.touches[0];
            const dx = toque.clientX - anterior.x;
            const dy = toque.clientY - anterior.y;
            anterior = { x: toque.clientX, y: toque.clientY };
            if (dx === 0 && dy === 0) return;
            if (!sePuedeDesplazarAdentro(evento.target, dx, dy) && evento.cancelable) evento.preventDefault();
        },
        { passive: false },
    );
}

// ---- 2. La cruz de cerrar -----------------------------------------------------------------------------------------------------
// Todas las ventanas llevan la misma cruz roja arriba a la derecha (los estilos están en _ventanas.scss). Cerrarla es lo mismo que tocar afuera o
// apretar Esc: en el combate, anularlo. En una ventana más alta que la pantalla la cruz no se va con el desplazamiento: se queda a la vista.
const CRUZ = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>';

// Las opciones de Swal.fire que le ponen su cruz a la ventana ("etiqueta": lo que dice al dejar el puntero encima y lo que lee un lector de pantalla)
export const conCruzDeCierre = (etiqueta = t('ventana.cerrar')) => ({ showCloseButton: true, closeButtonHtml: CRUZ, closeButtonAriaLabel: etiqueta });

// SweetAlert deja la cruz como un elemento más de la ventana. Para que se quede a la vista cuando la ventana es más alta que la pantalla (y se
// desplaza), se la mete en un "riel": una columna angosta pegada al borde derecho de la ventana, de su alto, donde la cruz se queda pegada arriba
// ("position: sticky", en _ventanas.scss) mientras la ventana se desplaza por debajo. También se le pone el texto de ayuda para el puntero.
function prepararLaCruz(contenedor) {
    const ventana = contenedor.querySelector('.swal2-popup');
    const cruz = ventana?.querySelector(':scope > .swal2-close');
    if (!cruz) return;
    if (!cruz.title) cruz.title = cruz.getAttribute('aria-label') ?? '';
    const riel = document.createElement('div');
    riel.className = 'ventana-riel';
    ventana.append(riel);
    riel.append(cruz);
}

// ---- 3. El botón "atrás" cierra la ventana --------------------------------------------------------------------------------------
// Con una ventana abierta se agrega una entrada al historial del navegador: al volver atrás (el botón o gesto de Android, el del navegador...) se
// gasta esa entrada y la ventana se cierra, en vez de salir de la página. Si la ventana se cierra de otra forma (la cruz, tocar afuera, Esc o un
// botón), se saca esa entrada sobrante con un "atrás" nuestro, así la persona no tiene que volver dos veces para salir de la página.
// Una ventana puede ser reemplazada por la siguiente con un instante sin ninguna entre medio (los carteles del combate, un enlace dentro de una
// ventana de información): la entrada se saca recién si un momento después sigue sin haber ventana. Todas las ventanas seguidas usan la misma.
const ESPERA_PARA_SACAR_LA_ENTRADA = 250; // ms sin ventana para considerar que se cerró de verdad

export function activarCierreDeVentanas() {
    let entradaPuesta = false; // hay una entrada nuestra en el historial
    let atrasNuestro = false; // el próximo "popstate" lo provocamos nosotros al sacar la entrada: no es la persona volviendo
    let espera = 0;

    const revisar = () => {
        clearTimeout(espera);
        if (hayVentana()) {
            if (!entradaPuesta) {
                history.pushState({ ventana: true }, '');
                entradaPuesta = true;
            }
            return;
        }
        if (!entradaPuesta) return;
        espera = setTimeout(() => {
            if (hayVentana() || !entradaPuesta) return;
            entradaPuesta = false;
            atrasNuestro = true;
            history.back();
        }, ESPERA_PARA_SACAR_LA_ENTRADA);
    };

    new MutationObserver(mutaciones => {
        for (const { addedNodes } of mutaciones) {
            for (const nodo of addedNodes) {
                if (nodo.classList?.contains('swal2-container')) prepararLaCruz(nodo);
            }
        }
        revisar();
    }).observe(document.body, { childList: true });

    window.addEventListener('popstate', () => {
        if (atrasNuestro) {
            atrasNuestro = false;
            return;
        }
        entradaPuesta = false; // la persona volvió: la entrada ya se gastó
        if (hayVentana()) Swal.close();
    });
}

// ---- 4. Los desplegables no mueven su botón -------------------------------------------------------------------------------------
// Las ventanas están centradas en la pantalla: cuando un desplegable de adentro se abre (un ataque, "¿Por qué hay evoluciones raras?") la ventana
// crece y se vuelve a centrar, y el botón que se acaba de tocar se corre de lugar. Obliga a perseguir el botón con el mouse o el dedo para volver a
// cerrarlo. Con esta función el botón se queda donde estaba y lo que cambia lo hace por debajo: se hace el cambio ("cambio" es lo que abre o cierra el
// desplegable) y, si el botón se corrió, se lo devuelve a su lugar:
//   1. Si la ventana se corrió sola (porque su alto cambió y se volvió a centrar), se la vuelve a poner donde estaba.
//   2. Si el botón se corrió dentro de la ventana (porque lo de arriba cambió de alto), se corrige con el desplazamiento de lo que lo contiene (una lista
//      con scroll, la ventana si es más alta que la pantalla, el panel del menú ☰ del celular).
//   3. Si todavía falta (no había por dónde desplazar), se corre la ventana.
// Cuando el desplegable se cierra, todo vuelve a su lugar (la ventana queda otra vez centrada). Ver también centrarVentana.
const MARGEN_DE_LA_VENTANA = 8; // px que como mínimo queda libre arriba cuando se corre una ventana

const conDesplazamientoVertical = elemento => /auto|scroll/.test(getComputedStyle(elemento).overflowY) && elemento.scrollHeight > elemento.clientHeight + 1;

// Corre la ventana "desplazamiento" píxeles de la pantalla hacia abajo (negativo: hacia arriba), sin dejarla subir por encima del borde de arriba.
// Algunas ventanas están agrandadas con "zoom" (la línea evolutiva en pantallas grandes): lo que se le escribe a la ventana se agranda con ella,
// y lo que se mide en la pantalla no
function correrVentana(ventana, desplazamiento) {
    const agrandada = ventana.offsetHeight ? ventana.getBoundingClientRect().height / ventana.offsetHeight : 1;
    const escribir = corrimiento => {
        ventana.dataset.corrimiento = String(corrimiento);
        ventana.style.translate = `0 ${corrimiento}px`;
    };
    const corrimiento = Number(ventana.dataset.corrimiento || 0) + desplazamiento / agrandada;
    escribir(corrimiento);
    const sobra = MARGEN_DE_LA_VENTANA - ventana.getBoundingClientRect().top;
    if (sobra > 0) escribir(corrimiento + sobra / agrandada);
}

export function mantenerEnSuLugar(elemento, cambio) {
    const ventana = elemento.closest('.swal2-popup');
    const altura = () => elemento.getBoundingClientRect().top;
    const antes = altura();
    const ventanaAntes = ventana?.getBoundingClientRect().top ?? 0;
    cambio();
    const desvio = () => altura() - antes; // positivo: el botón bajó
    if (Math.abs(desvio()) < 0.5) return;

    // 1. La ventana se corrió sola
    if (ventana) {
        const corridaSola = ventana.getBoundingClientRect().top - ventanaAntes;
        if (Math.abs(corridaSola) >= 0.5) correrVentana(ventana, -corridaSola);
    }

    // 2. El botón se corrió dentro de la ventana
    const limite = elemento.closest('.swal2-container, .menu-movil');
    for (let contenedor = elemento.parentElement; contenedor && Math.abs(desvio()) >= 0.5; contenedor = contenedor.parentElement) {
        if (conDesplazamientoVertical(contenedor)) contenedor.scrollTop += desvio();
        if (contenedor === limite) break;
    }

    // 3. Todavía falta
    if (ventana && Math.abs(desvio()) >= 0.5) correrVentana(ventana, -desvio());
}

// Devuelve la ventana a su lugar (centrada en la pantalla): cuando su contenido se rearma de cero (por ejemplo, al pasar a otro digimon en la línea
// evolutiva) o cambia el tamaño de la pantalla
export function centrarVentana(ventana = document.querySelector('.swal2-popup')) {
    if (!ventana) return;
    delete ventana.dataset.corrimiento;
    ventana.style.translate = '';
}

window.addEventListener('resize', () => document.querySelectorAll('.swal2-popup[data-corrimiento]').forEach(ventana => centrarVentana(ventana)));
