// -----------------------------------------------------------------------------------------------------------------
// LA PÁGINA QUEDA QUIETA CON UNA VENTANA ABIERTA (celular)
//
// Mientras hay una ventana abierta (ataques, línea evolutiva, información o combate) la página de atrás no se desplaza con el dedo: lo
// único que se mueve es lo que tiene scroll propio dentro de la ventana (una descripción larga, el árbol evolutivo...). Si ese scroll
// ya llegó al final, el dedo tampoco arrastra a la página (se frena ahí). La página tenía que quedar libre de overflow (ver _base.scss:
// SweetAlert le pone overflow hidden al body y, sin esa regla, la grilla saltaría al aparecer y desaparecer la barra de scroll), así que
// el freno se hace acá, en el movimiento del dedo, igual que con el zoom de una carta (zoom.js) y con el combate (combate.js).
// El combate además lo mantiene entre un cartel y el siguiente, cuando no hay ninguna ventana abierta por un instante.
// En computadora no cambia nada: el freno es solo del dedo.
// -----------------------------------------------------------------------------------------------------------------

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
