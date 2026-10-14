// -----------------------------------------------------------------------------------------------------------------
// PASO DE CARTA EN CARTA con una ventana de ataques o de línea evolutiva abierta: sin cerrarla a mano, se pasa a la misma ventana de la carta anterior o
// de la siguiente de la lista (las que esconden los filtros no cuentan). Se puede con las flechas ← → del teclado, con las flechitas a los costados de la
// ventana y, en el celular, deslizando el dedo hacia un costado empezando AFUERA de la ventana (hacia la izquierda va a la siguiente y hacia la derecha, a
// la anterior; un toque simple afuera sigue cerrando la ventana).
// No se activa si la ventana se abrió desde el zoom de la carta: ahí las cartas (y sus flechas, teclas y barridos) son las del zoom (zoom.js).
// -----------------------------------------------------------------------------------------------------------------
import { cartaEnZoom } from './zoom.js';
import { vibrar } from './audio.js';
import { ponerAyuda } from './util.js';
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

function pasar(direccion) {
    if (!paso) return;
    const { carta, sirve, abrir } = paso;
    const otra = vecina(carta, direccion, sirve);
    if (!otra) return;
    vibrar(8);
    desactivarPasoEntreCartas(); // (al cerrar la ventana de ahora, su willClose también lo hace: da igual)
    Swal.close();
    abrir(otra); // abre la ventana de la otra carta, que vuelve a activar el paso
}

// Pone las flechas a los costados de la ventana (si no hay lugar al lado, quedan un poco encima) y apaga la que no tiene a dónde ir
function ubicarFlechas() {
    if (!paso) return;
    const popup = Swal.getPopup();
    if (!popup) return;
    const rect = popup.getBoundingClientRect();
    const lado = document.documentElement.clientWidth < 600 ? 34 : TAMANO_DE_FLECHA;
    const separacion = 8;
    const izquierda = Math.max(4, rect.left - separacion - lado);
    const derecha = Math.max(4, document.documentElement.clientWidth - rect.right - separacion - lado);
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
    ubicarFlechas();
    // La ventana cambia de ancho (por ejemplo, al desplegar una lista de la línea evolutiva) y la pantalla de tamaño: las flechas la siguen
    const popup = Swal.getPopup();
    if (popup && 'ResizeObserver' in window) {
        paso.observador = new ResizeObserver(ubicarFlechas);
        paso.observador.observe(popup);
    }
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
