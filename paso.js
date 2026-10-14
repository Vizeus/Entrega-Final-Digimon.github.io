// -----------------------------------------------------------------------------------------------------------------
// PASO DE CARTA EN CARTA con una ventana de ataques o de línea evolutiva abierta: sin cerrarla a mano, se pasa a la misma ventana de la carta anterior o
// de la siguiente de la lista (las que esconden los filtros no cuentan). Se puede con las flechas ← → del teclado, con las flechitas a los costados de la
// ventana y, en el celular, deslizando el dedo hacia un costado empezando AFUERA de la ventana (hacia la izquierda va a la siguiente y hacia la derecha, a
// la anterior; un toque simple afuera sigue cerrando la ventana).
// Al pasar, la ventana se va y la otra entra por el costado opuesto, con el movimiento y el sonido que tiene el cambio de carta del zoom.
// No se activa si la ventana se abrió desde el zoom de la carta: ahí las cartas (y sus flechas, teclas y barridos) son las del zoom (zoom.js).
// -----------------------------------------------------------------------------------------------------------------
import { cartaEnZoom } from './zoom.js';
import { vibrar } from './audio.js';
import { sonidoZoom } from './sonidos.js';
import { reducirMovimiento } from './cartas.js';
import { anchoVisible, ponerAyuda } from './util.js';
import { t } from './i18n.js';

const DESLIZAR_DISTANCIA = 45; // px que tiene que recorrer el dedo hacia un costado
const TAMANO_DE_FLECHA = 44; // px (en celular, un poco menos)
const ICONO_FLECHA = puntos =>
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${puntos}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let paso = null; // { carta, sirve, abrir, flechas, observador }: la ventana que está abierta y desde dónde se puede pasar

function vecina(carta, direccion, sirve) {
    let otra = direccion > 0 ? carta.nextElementSibling : carta.previousElementSibling;
    while (otra && (otra.tagName !== 'LI' || otra.classList.contains('filtrada') || !sirve(otra))) {
        otra = direccion > 0 ? otra.nextElementSibling : otra.previousElementSibling;
    }
    return otra;
}

// El movimiento y el sonido son los mismos que al pasar de carta con el zoom (zoom.js, cambiarZoom): la ventana de ahora se va hacia el costado
// contrario al que se va, achicándose y desvaneciéndose, y la de la otra carta entra por el opuesto, con el mismo "chiss" de cartulina.
const SALIDA = { duration: 170, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', fill: 'forwards' };
const ENTRADA = { duration: 270, delay: 50, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)', fill: 'both' };
const ESCALA_FUERA = 0.92; // cuánto se achica la ventana mientras entra o sale
let entradaLateral = 0; // 1 o -1: la ventana que se abre ahora es la de la carta vecina y entra por ese lado (0: una ventana común, con su animación de siempre)
let pasando = false; // la ventana de ahora todavía se está yendo

// Cuánto se corre una ventana hacia un costado (como las cartas del zoom: un poco más de la mitad de la pantalla)
function saltoLateral(popup, direccion) {
    return (direccion * anchoVisible() * 0.55) / (parseFloat(getComputedStyle(popup).zoom) || 1);
}

async function pasar(direccion) {
    if (!paso || pasando) return;
    const { carta, sirve, abrir } = paso;
    const otra = vecina(carta, direccion, sirve);
    if (!otra) return;
    vibrar(8);
    sonidoZoom(true);
    const popup = Swal.getPopup();
    if (popup && !reducirMovimiento) {
        pasando = true;
        try {
            await popup.animate(
                [
                    { translate: '0 0', scale: 1, opacity: 1 },
                    { translate: `${-saltoLateral(popup, direccion)}px 0`, scale: ESCALA_FUERA, opacity: 0 },
                ],
                SALIDA,
            ).finished;
        } catch (error) {
            // Si alguien cancela la animación, seguimos igual
        }
        pasando = false;
        if (!paso || paso.carta !== carta) return; // (mientras tanto se cerró la ventana)
        entradaLateral = direccion;
    }
    desactivarPasoEntreCartas(); // (al cerrar la ventana de ahora, su willClose también lo hace: da igual)
    Swal.close();
    abrir(otra); // abre la ventana de la otra carta, que vuelve a activar el paso
}

// Pone las flechas a los costados de la ventana (si no hay lugar al lado, quedan un poco encima) y apaga la que no tiene a dónde ir.
// Se mide contra el ancho de la capa de las flechas (la de pantalla completa, igual a la de la ventana) y no contra el de la pantalla: con la ventana
// abierta, document.documentElement.clientWidth cuenta el hueco de la barra de scroll que la página reserva, y la flecha derecha quedaba encima de la ventana.
// La ventana también se mide cuando termina su animación de apertura (mientras crece, su rectángulo es más chico, y el ResizeObserver no avisa
// porque lo que cambia es una transformación y no su tamaño).
function ubicarFlechas() {
    if (!paso || paso.entrando) return; // (si la ventana está entrando por el costado, se ubican al terminar: ahora su rectángulo está corrido)
    const popup = Swal.getPopup();
    if (!popup) return;
    const rect = popup.getBoundingClientRect();
    const anchoDeLaCapa = paso.flechas.clientWidth;
    const lado = anchoDeLaCapa < 600 ? 34 : TAMANO_DE_FLECHA;
    const separacion = 8;
    const izquierda = Math.max(4, rect.left - separacion - lado);
    const derecha = Math.max(4, anchoDeLaCapa - rect.right - separacion - lado);
    paso.flechas.style.setProperty('--flecha', `${lado}px`);
    paso.flechas.style.setProperty('--fl-izq', `${izquierda}px`);
    paso.flechas.style.setProperty('--fl-der', `${derecha}px`);
    paso.flechas.querySelector('.paso-anterior').disabled = !vecina(paso.carta, -1, paso.sirve);
    paso.flechas.querySelector('.paso-siguiente').disabled = !vecina(paso.carta, 1, paso.sirve);
}

function crearFlechas() {
    const flechas = document.createElement('div');
    flechas.id = 'paso-flechas';
    flechas.innerHTML =
        `<button type="button" class="paso-flecha paso-anterior">${ICONO_FLECHA('M15 5l-7 7 7 7')}</button>` +
        `<button type="button" class="paso-flecha paso-siguiente">${ICONO_FLECHA('M9 5l7 7-7 7')}</button>`;
    const anterior = flechas.querySelector('.paso-anterior');
    const siguiente = flechas.querySelector('.paso-siguiente');
    ponerAyuda(anterior, t('zoom.anterior'));
    ponerAyuda(siguiente, t('zoom.siguiente'));
    anterior.addEventListener('click', () => pasar(-1));
    siguiente.addEventListener('click', () => pasar(1));
    document.body.appendChild(flechas);
    return flechas;
}

const alTeclear = evento => {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
    if (evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return;
    if (evento.target.closest?.('input, textarea, select, [contenteditable="true"]')) return; // (con el cursor en una caja de texto, las flechas son suyas)
    evento.preventDefault();
    if (!evento.repeat) pasar(evento.key === 'ArrowRight' ? 1 : -1);
};

// El dedo apoyado afuera de la ventana: si se desliza hacia un costado, se pasa de carta
let gesto = null; // { x0, y0, resuelto }
const alApoyarElDedo = evento => {
    gesto = null;
    if (evento.touches.length !== 1 || evento.target.closest('.swal2-popup, #paso-flechas, button')) return;
    gesto = { x0: evento.touches[0].clientX, y0: evento.touches[0].clientY, resuelto: false };
};
const alMoverElDedo = evento => {
    if (!gesto || gesto.resuelto) return;
    if (evento.touches.length !== 1) {
        gesto = null;
        return;
    }
    const dx = evento.touches[0].clientX - gesto.x0;
    const dy = evento.touches[0].clientY - gesto.y0;
    if (Math.abs(dx) >= DESLIZAR_DISTANCIA && Math.abs(dx) > Math.abs(dy) * 1.5) {
        gesto.resuelto = true;
        pasar(dx < 0 ? 1 : -1);
    }
};
const alSoltarElDedo = () => {
    gesto = null;
};

// Lo llaman las ventanas de ataques y de línea evolutiva al abrirse. "sirve": qué cartas tienen esa ventana (por ejemplo, las que tienen ataques);
// "abrir": abre la ventana de otra carta.
export function activarPasoEntreCartas(carta, { sirve = () => true, abrir }) {
    desactivarPasoEntreCartas();
    if (cartaEnZoom) return;
    paso = { carta, sirve, abrir, flechas: crearFlechas(), observador: null };
    const popupNuevo = Swal.getPopup();
    const direccionDeEntrada = entradaLateral;
    entradaLateral = 0;
    if (direccionDeEntrada && popupNuevo && !reducirMovimiento) {
        // Entra por un costado en vez de con la animación de apertura de siempre. Las flechas se ubican con la ventana ya en su lugar (antes de moverla).
        popupNuevo.style.animation = 'none';
        ubicarFlechas();
        const marco = paso;
        marco.entrando = true;
        const entrada = popupNuevo.animate(
            [
                { translate: `${saltoLateral(popupNuevo, direccionDeEntrada)}px 0`, scale: ESCALA_FUERA, opacity: 0 },
                { translate: '0 0', scale: 1, opacity: 1 },
            ],
            ENTRADA,
        );
        entrada.finished
            .catch(() => {}) // (si alguien la cancela, se sigue igual)
            .then(() => {
                entrada.cancel(); // (ya está en su lugar: no hace falta que la animación se quede sujetando los valores)
                marco.entrando = false;
                if (paso === marco) ubicarFlechas();
            });
    } else {
        ubicarFlechas();
    }
    // La ventana cambia de ancho (por ejemplo, al desplegar una lista de la línea evolutiva) y la pantalla de tamaño: las flechas la siguen
    const popup = Swal.getPopup();
    if (popup && 'ResizeObserver' in window) {
        paso.observador = new ResizeObserver(ubicarFlechas);
        paso.observador.observe(popup);
    }
    popup?.addEventListener('animationend', ubicarFlechas); // (termina la animación de apertura: ahora sí mide lo que ocupa de verdad)
    window.addEventListener('resize', ubicarFlechas);
    document.addEventListener('keydown', alTeclear);
    document.addEventListener('touchstart', alApoyarElDedo, { passive: true });
    document.addEventListener('touchmove', alMoverElDedo, { passive: true });
    document.addEventListener('touchend', alSoltarElDedo);
    document.addEventListener('touchcancel', alSoltarElDedo);
}

// Lo llama cada ventana al cerrarse (willClose)
export function desactivarPasoEntreCartas() {
    if (!paso) return;
    paso.observador?.disconnect();
    paso.flechas.remove();
    paso = null;
    gesto = null;
    window.removeEventListener('resize', ubicarFlechas);
    document.removeEventListener('keydown', alTeclear);
    document.removeEventListener('touchstart', alApoyarElDedo);
    document.removeEventListener('touchmove', alMoverElDedo);
    document.removeEventListener('touchend', alSoltarElDedo);
    document.removeEventListener('touchcancel', alSoltarElDedo);
}
