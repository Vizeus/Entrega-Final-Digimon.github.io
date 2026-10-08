// -----------------------------------------------------------------------------------------------------------------
// TOQUES QUE SOLO CIERRAN UN MENÚ
//
// En el celular hay tres desplegables que se cierran con un toque afuera: el menú ☰ de la barra, las listas "Info." de ese menú y las opciones
// de los filtros (se cierran en barra.js, info.js y filtros.js). Quien toca afuera con uno de ellos abierto quiere cerrarlo, y muchas veces el
// "afuera" que toca es una carta o un botoncito de una carta. Ese toque no tiene que hacer nada más: no elige la carta, no abre la ventana del
// botoncito, no suena ni vibra como si se hubiera tocado (el desplegable al cerrarse suena por su cuenta: ver activarSonidoDeDesplegables).
// Tocar cualquier otra cosa con un menú abierto (otro filtro, el buscador, un botón de la barra) sigue funcionando como siempre.
//
// Cómo: al apoyar el dedo (en la fase de captura, antes de que los menús se cierren) se anota si ese toque va a cerrar algún menú. Si es así, el
// clic que sigue no le llega a ninguna carta ni botoncito (se frena antes de que baje hasta ellos): se frena el clic y no solo el toque que
// empezó sobre una carta porque al cerrarse el menú la pantalla se reacomoda y el dedo, que había apoyado sobre el menú, puede terminar sobre una
// carta. Lo que no depende del clic (el sonido y la vibración de los botoncitos, la inclinación y el doble toque del zoom) le pregunta a
// toqueQueSoloCierraMenus() y se hace a un lado.
// Solo en la versión de celular (donde existen estos menús): en computadora todo queda como estaba.
// -----------------------------------------------------------------------------------------------------------------

import { PANTALLA_DE_CELULAR } from './util.js';

const ESPERA_DEL_CLIC = 600; // ms que se espera el clic después de levantar el dedo; si no llega (era un desplazamiento), el toque se olvida

let cierraMenus = false; // el toque que está en curso (o que acaba de terminar) cierra algún menú
let empezoEnLasCartas = false; // y empezó sobre las cartas
let olvidar = 0;
let ultimoClicFrenado = -Infinity; // cuándo se frenó el último clic (ver más abajo, el doble clic)

// ¿El toque de ahora (o el que acaba de terminar, mientras llega su clic) empezó sobre una carta o un botoncito de carta y solo cierra un menú?
export const toqueQueSoloCierraMenus = () => cierraMenus && empezoEnLasCartas;

// ¿Tocar acá cierra algún menú abierto? Las mismas reglas con las que se cierran: el ☰ (barra.js) se cierra con un toque fuera de su panel
// y de su botón, y cada lista "Info." (info.js) y cada filtro (filtros.js) con uno fuera de ellos
function cierraAlgunMenu(objetivo) {
    if (document.getElementById('navbar')?.classList.contains('menu-abierto') && !objetivo.closest('#menu-movil, #abrir-menu, .aviso-globo')) return true;
    return [...document.querySelectorAll('.menu-info.abierto, .f-grupo.abierto')].some(menu => !menu.contains(objetivo));
}

export function activarCierreDeMenus() {
    // En window y en captura: va antes que cualquier otro manejador, incluidos los que cierran los menús al apoyar el dedo
    window.addEventListener(
        'pointerdown',
        evento => {
            if (!evento.isPrimary) return; // (un segundo dedo no cambia de qué trata el toque)
            clearTimeout(olvidar);
            cierraMenus = PANTALLA_DE_CELULAR.matches && !!evento.target.closest && cierraAlgunMenu(evento.target);
            empezoEnLasCartas = cierraMenus && !!evento.target.closest('#listado-digimons');
        },
        true,
    );

    // Al levantar el dedo llega su clic enseguida; si no llega (la página se desplazó, el dedo se movió) se deja de esperarlo
    for (const nombre of ['pointerup', 'pointercancel']) {
        window.addEventListener(
            nombre,
            evento => {
                if (!evento.isPrimary || !cierraMenus) return;
                clearTimeout(olvidar);
                olvidar = setTimeout(() => {
                    cierraMenus = false;
                }, ESPERA_DEL_CLIC);
            },
            true,
        );
    }

    // El clic de ese toque no le llega a las cartas ni a sus botones (se frena en window, antes de que baje hasta ellos)
    window.addEventListener(
        'click',
        evento => {
            if (!cierraMenus || !evento.target.closest?.('#listado-digimons')) return;
            cierraMenus = false;
            clearTimeout(olvidar);
            ultimoClicFrenado = performance.now();
            evento.stopPropagation();
            evento.preventDefault();
        },
        true,
    );

    // El navegador cuenta el clic frenado igual: si enseguida se toca de nuevo la carta, ese segundo toque le llega como "doble clic" y ampliaría
    // la carta. El primero solo había cerrado el menú, así que ese doble clic no vale (el segundo toque queda como un toque común).
    window.addEventListener(
        'dblclick',
        evento => {
            if (performance.now() - ultimoClicFrenado > ESPERA_DEL_CLIC) return;
            evento.stopPropagation();
            evento.preventDefault();
        },
        true,
    );
}
