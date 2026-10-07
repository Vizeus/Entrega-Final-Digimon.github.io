// -----------------------------------------------------------------------------------------------------------------
// ZOOM DE LAS CARTAS
//
// Con doble clic la carta vuela al centro de la pantalla, grande. Con la rueda se agranda todavía más (zoom extra) y se puede
// arrastrar. Las flechas (o deslizar el dedo) pasan a la carta vecina.
// -----------------------------------------------------------------------------------------------------------------

import { CON_MOUSE, emitir, ponerAyuda } from './util.js';
import { t } from './i18n.js';
import { listaDigimons } from './pagina.js';
import { seleccionados, verificarSeleccion } from './combate.js';
import { reducirMovimiento, seleccionAntesDelClic } from './cartas.js';
import { activarZoomConDobleToque, activarZoomConPellizco } from './gestos.js';
import { vibrar } from './audio.js';
import { sonidoZoom } from './sonidos.js';

// -----------------------------------------------------------------------------------------------------------------
// ZOOM: con doble clic la carta "vuela" al centro de la pantalla, bien grande, y el resto se oscurece.
//   La carta NO se mueve del <ul>: se traslada y se agranda con las propiedades "translate" y "scale" (así en su lugar
//   queda un hueco del tamaño de la carta, con el fondo a la vista) y sigue funcionando la inclinación ("transform") y
//   el dar vuelta. Se cierra con Esc, con un clic afuera o con la ✕.
// -----------------------------------------------------------------------------------------------------------------
export let cartaEnZoom = null; // la carta que está en el centro (o volviendo a su lugar)
export let zoomOcupado = false; // mientras vuela, no se inclina, no se da vuelta y no se cierra
let cierrePendiente = false; // pidieron cerrar mientras todavía estaba llegando
export let zoomCerrando = false; // la carta ya está volviendo a su lugar: pedir cerrar otra vez no hace falta (ver cerrarZoom)

// Al pasar de una carta a otra dentro del zoom (con el teclado o con las flechas), la carta nueva suele quedar justo debajo del puntero, que
// no se movió. Sin esto el navegador le daba el "hover" (a veces tarde o de más) y aparecía el reflejo quieto en el medio. Ahora la carta nueva
// (clase "reflejo-quieto", ver el CSS) no se inclina ni brilla hasta que el mouse se mueve de verdad, aunque sea un píxel: un movimiento
// "falso" que el navegador manda sin mover el mouse (misma posición) no cuenta, ni el que ocurre mientras la carta todavía está llegando.
export let zoomEsperaMovimiento = false; // true mientras se espera ese movimiento (la inclinación lo mira: ver activarInclinacion)
let ultimoPuntero = null; // dónde estuvo el mouse la última vez que mandó un evento

function pedirMovimientoDelPuntero(carta) {
    if (!CON_MOUSE.matches) return; // solo con mouse: con el dedo no hay hover
    zoomEsperaMovimiento = true;
    carta.classList.add('reflejo-quieto');
}

function soltarReflejoQuieto() {
    zoomEsperaMovimiento = false;
    listaDigimons.querySelectorAll(':scope > li.reflejo-quieto').forEach(carta => carta.classList.remove('reflejo-quieto'));
}

export function activarReflejoQuieto() {
    // (en la fase de captura, para ir antes que la inclinación, que mira el mismo movimiento)
    document.addEventListener(
        'pointermove',
        evento => {
            if (evento.pointerType === 'touch') return;
            const seMovio = !ultimoPuntero || evento.clientX !== ultimoPuntero.x || evento.clientY !== ultimoPuntero.y;
            ultimoPuntero = { x: evento.clientX, y: evento.clientY };
            if (zoomEsperaMovimiento && seMovio && !zoomOcupado) soltarReflejoQuieto();
        },
        true,
    );
    document.addEventListener(
        'touchstart',
        () => {
            if (zoomEsperaMovimiento) soltarReflejoQuieto();
        },
        { capture: true, passive: true },
    ); // (pantalla táctil con mouse: el dedo manda)
}

const ZOOM_ANCHO = 0.9; // la carta ocupa hasta el 90 % del ancho de la ventana (80 % en celular, para dejar lugar a las flechas)...
const ZOOM_ALTO = 0.86; // ...y el 86 % del alto
const ZOOM_ANCHO_CELULAR = 0.8;
const ZOOM_MAXIMO = 4.5;
const ZOOM_MINIMO = 1.25;
export const TECLAS_DE_DESPLAZAMIENTO = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];

// Dónde está la carta en la grilla (sin el levante del hover ni la inclinación) y cuánto hay que moverla y agrandarla
function calcularZoom(carta) {
    carta.classList.add('zoom-midiendo');
    const caja = carta.getBoundingClientRect();
    const zoomCss = parseFloat(getComputedStyle(carta).zoom) || 1; // en celular las cartas se achican con "zoom"
    carta.classList.remove('zoom-midiendo');

    const ancho = document.documentElement.clientWidth;
    const alto = window.innerHeight;
    const anchoUtil = ancho * (ancho < 600 ? ZOOM_ANCHO_CELULAR : ZOOM_ANCHO);
    const escala = Math.max(ZOOM_MINIMO, Math.min(ZOOM_MAXIMO, anchoUtil / caja.width, (alto * ZOOM_ALTO) / caja.height));
    return {
        escala,
        anchoFinal: caja.width * escala, // lo que va a medir la carta de ancho en pantalla
        dx: (ancho / 2 - (caja.left + caja.width / 2)) / zoomCss,
        dy: (alto / 2 - (caja.top + caja.height / 2)) / zoomCss,
        // Para el zoom extra (ver más abajo): lo que mide la carta en su lugar (a escala 1), el "zoom" de CSS del celular y cuánto está
        // agrandada de más: "factor" es lo que tiene ahora, "objetivo" lo que se le pidió, y x e y cuánto se corrió del centro (px de pantalla;
        // "ix" e "iy" son lo que se correría si la carta pudiera quedar con huecos: ver ponerZoomExtra)
        anchoBase: caja.width,
        altoBase: caja.height,
        zoomCss,
        extra: { factor: 1, objetivo: 1, x: 0, y: 0, ix: 0, iy: 0 },
    };
}

// El color de la carta ya resuelto (--base usa variables que solo existen adentro de la carta)
function colorDeCarta(carta) {
    const muestra = document.createElement('i');
    muestra.style.cssText = 'position:absolute;visibility:hidden;color:var(--base)';
    carta.appendChild(muestra);
    const color = getComputedStyle(muestra).color;
    muestra.remove();
    return color;
}

function crearFondoZoom(carta) {
    const fondo = document.createElement('div');
    fondo.id = 'zoom-fondo';
    fondo.innerHTML = '<button type="button" class="zoom-cerrar">✕</button><p class="zoom-ayuda"></p>';
    const cerrar = fondo.querySelector('.zoom-cerrar');
    ponerAyuda(cerrar, t('zoom.cerrar'));
    fondo.querySelector('.zoom-ayuda').textContent = t('zoom.ayuda');
    fondo.style.setProperty('--zc', colorDeCarta(carta));
    fondo.addEventListener('click', () => {
        if (performance.now() - ultimoDeslizamiento < 500) return; // soltar el dedo después de deslizar no cierra el zoom
        cerrarZoom();
    });
    activarCambioConDedo(fondo);
    document.body.appendChild(fondo);
    return fondo;
}

// La carta se queda en el centro: translate y scale "importantes" para que no los pisen el hover ni la animación de flotar
// Además la carta queda como capa propia (will-change) ya dibujada a tamaño grande: si el navegador la tuviera que crear
// recién al empezar la inclinación (y deshacer al terminarla), por un instante la mostraría a baja resolución (pixelada).
function fijarZoom(carta) {
    const { escala, dx, dy } = zoomVigente(carta.datosZoom);
    carta.style.setProperty('translate', `${dx}px ${dy}px`, 'important');
    carta.style.setProperty('scale', String(escala), 'important');
    // Con el zoom extra no va el will-change: dejaría la carta dibujada al tamaño de antes y, agrandada, se vería borrosa
    if (carta.datosZoom.extra.factor > 1) carta.style.removeProperty('will-change');
    else carta.style.willChange = 'transform';
}

// Dónde está y cuánto mide la carta ampliada ahora, con el zoom extra (si lo tiene) incluido
function zoomVigente({ escala, dx, dy, extra, zoomCss }) {
    return { escala: escala * extra.factor, dx: dx + extra.x / zoomCss, dy: dy + extra.y / zoomCss };
}

function soltarZoom(carta) {
    carta.style.removeProperty('translate');
    carta.style.removeProperty('scale');
    carta.style.removeProperty('will-change');
}

// El scroll de la página queda quieto mientras hay zoom (sin tocar el overflow del body, que haría saltar la grilla).
// Solo se puede desplazar la descripción del dorso, que tiene su propio scroll.
export function zonaConScroll(destino, delta = 0, selector = '.c-cuerpo') {
    const zona = destino.closest?.(selector);
    if (!zona || zona.scrollHeight <= zona.clientHeight) return false;
    if (delta === 0) return true;
    return delta < 0 ? zona.scrollTop > 0 : zona.scrollTop + zona.clientHeight < zona.scrollHeight - 1;
}

const frenarRueda = evento => {
    // Si hay un cartel de SweetAlert abierto (ataques, evolución, etc.), permitimos su propio desplazamiento
    if (document.querySelector('.swal2-container')) return;
    // Sobre el frente de la carta ampliada, la rueda la agranda todavía más (ver "ZOOM EXTRA"). En el dorso no: ahí la rueda es para la descripción
    if (zoomExtraDisponible() && cartaEnZoom.contains(evento.target)) {
        evento.preventDefault();
        if (evento.deltaY) acercarConRueda(evento);
        return;
    }
    if (!zonaConScroll(evento.target, evento.deltaY)) evento.preventDefault();
};

const frenarToque = evento => {
    if (document.querySelector('.swal2-container')) return;
    if (!zonaConScroll(evento.target) && evento.cancelable) evento.preventDefault();
};

const alTeclearConZoom = evento => {
    // Si hay un cartel de SweetAlert abierto, SweetAlert maneja sus teclas (Escape para cerrar el cartel, etc.)
    if (document.querySelector('.swal2-container')) return;
    if (evento.key === 'Escape') {
        evento.preventDefault();
        cerrarZoom();
    } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') {
        evento.preventDefault();
        cambiarZoom(evento.key === 'ArrowRight' ? 1 : -1, evento.repeat);
    } else if (TECLAS_DE_DESPLAZAMIENTO.includes(evento.key) && !evento.target.closest?.('button')) {
        evento.preventDefault();
    }
};

const alRedimensionarConZoom = () => {
    if (!cartaEnZoom || zoomOcupado) return;
    limpiarZoomExtra(); // con otro tamaño de ventana, el zoom extra vuelve a lo normal
    soltarZoom(cartaEnZoom); // para medir dónde está la carta en la grilla (los estilos "importantes" de la carta no se pueden pisar)
    cartaEnZoom.datosZoom = calcularZoom(cartaEnZoom);
    fijarZoom(cartaEnZoom);
    actualizarFlechasZoom();
    emitir('zoom-cambio');
};

function bloquearDesplazamiento(bloquear) {
    const accion = bloquear ? 'addEventListener' : 'removeEventListener';
    window[accion]('wheel', frenarRueda, { passive: false });
    window[accion]('touchmove', frenarToque, { passive: false });
    window[accion]('keydown', alTeclearConZoom, true);
    window[accion]('resize', alRedimensionarConZoom);
}

// ZOOM EXTRA: con una carta ampliada y DE FRENTE (el dorso no: ahí la rueda y el pellizco son para la descripción), la rueda del mouse
// hacia arriba, con el puntero sobre la carta, la agranda todavía más, y hacia abajo la devuelve al tamaño normal. Lo que está bajo el
// puntero se queda bajo el puntero (se acerca a donde se mira). En celular se hace separando los dedos (y juntándolos vuelve), y mover los
// dos dedos a la vez la desplaza. Mientras está agrandada de más la carta no se inclina: la inclinación se cancela (y vuelve sola cuando
// se la devuelve al tamaño normal). Las flechas de los costados se esconden, y si se da vuelta la carta, se pasa a otra o se cierra el
// zoom, vuelve a lo normal.
export const ZOOM_EXTRA_MAXIMO = 3; // veces el tamaño del zoom normal
const ZOOM_EXTRA_RUEDA = 0.0016; // cuánto crece por cada unidad de la rueda (una muesca del mouse trae ~100: ×1,17)
const ZOOM_EXTRA_SUAVIZADO = 60; // ms que tarda en alcanzar lo pedido con la rueda
export let zoomExtra = false; // true mientras la carta ampliada está más grande que el zoom normal
let zoomExtraCuadro = 0; // pedido de animationFrame pendiente
let zoomExtraUltimoCuadro = 0;
let zoomExtraAncla = { x: 0, y: 0 }; // el punto de la pantalla que se queda quieto al agrandar (el puntero)
const zoomExtraTerminados = []; // quienes esperan a que termine de volver a lo normal (ver volverAlZoomNormal)

// ¿Se puede agrandar de más la carta ampliada? Solo si ya llegó al centro, no se está dando vuelta y está de frente
export const zoomExtraDisponible = () =>
    !!cartaEnZoom?.datosZoom && !zoomOcupado && !zoomCerrando && !cartaEnZoom.girando && !cartaEnZoom.classList.contains('de-dorso');

// Pone el zoom extra de la carta en "factor". "anclaVieja" es el punto de la pantalla que estaba sobre cierto lugar de la carta, y "anclaNueva"
// adónde tiene que quedar ese mismo lugar (es el mismo punto con la rueda; con el pellizco los dedos se pueden mover mientras se separan).
// La carta nunca deja huecos de la pantalla hacia un lado: puede correrse solo hasta que el borde llega al de la pantalla (y si es más chica
// que la pantalla, queda centrada). Pero se sigue calculando adónde estaría sin ese tope ("ix", "iy"), así acercar mirando cerca de un borde
// (la rueda) deja ese borde a la vista aunque la carta todavía fuera más chica que la pantalla al empezar a acercar. Con el pellizco, en
// cambio, la carta sigue a los dedos tal cual: ahí lo de sin el tope se descarta ("directo").
export function ponerZoomExtra(carta, factor, anclaVieja, anclaNueva = anclaVieja, directo = false) {
    const datos = carta.datosZoom;
    const extra = datos.extra;
    const nuevo = Math.max(1, Math.min(ZOOM_EXTRA_MAXIMO, factor));
    const razon = nuevo / extra.factor;
    const ancho = document.documentElement.clientWidth;
    const alto = window.innerHeight;
    const escala = datos.escala * nuevo;
    const sobraX = Math.max(0, (datos.anchoBase * escala - ancho) / 2); // cuánto sobra la carta de la pantalla en cada eje
    const sobraY = Math.max(0, (datos.altoBase * escala - alto) / 2);
    const viejaX = anclaVieja.x - ancho / 2;
    const viejaY = anclaVieja.y - alto / 2;
    const nuevaX = anclaNueva.x - ancho / 2;
    const nuevaY = anclaNueva.y - alto / 2;
    if (nuevo === 1) {
        extra.ix = extra.iy = extra.x = extra.y = 0;
    } else {
        extra.ix = nuevaX - (viejaX - extra.ix) * razon;
        extra.iy = nuevaY - (viejaY - extra.iy) * razon;
        extra.x = Math.max(-sobraX, Math.min(sobraX, extra.ix));
        extra.y = Math.max(-sobraY, Math.min(sobraY, extra.iy));
        if (directo) {
            extra.ix = extra.x;
            extra.iy = extra.y;
        }
    }
    extra.factor = nuevo;
    fijarZoom(carta);
    avisarZoomExtra();
}

// Cuando la carta pasa a estar (o deja de estar) agrandada de más: las flechas se esconden, y se avisa (la inclinación se cancela o se retoma)
function avisarZoomExtra() {
    const ahora = !!cartaEnZoom?.datosZoom && cartaEnZoom.datosZoom.extra.factor > 1;
    if (ahora === zoomExtra) return;
    zoomExtra = ahora;
    document.getElementById('zoom-flechas')?.classList.toggle('zoom-extra', zoomExtra);
    marcarCartaConZoomExtra(zoomExtra ? cartaEnZoom : null);
    emitir('zoom-extra');
}

// La carta agrandada de más lleva la clase "zoom-extra-activo": con ella el CSS le apaga el reflejo y la textura holográfica (igual que
// la inclinación, que se cancela). Se le saca a cualquier otra carta que la tuviera.
function marcarCartaConZoomExtra(carta) {
    listaDigimons.querySelectorAll(':scope > li.zoom-extra-activo').forEach(otra => {
        if (otra !== carta) otra.classList.remove('zoom-extra-activo');
    });
    carta?.classList.add('zoom-extra-activo');
}

function animarZoomExtra(ahora) {
    zoomExtraCuadro = 0;
    const carta = cartaEnZoom;
    if (!carta?.datosZoom || zoomOcupado) {
        limpiarZoomExtra();
        return;
    }
    const extra = carta.datosZoom.extra;
    const paso = Math.min(ahora - zoomExtraUltimoCuadro, 64);
    zoomExtraUltimoCuadro = ahora;
    let factor = extra.factor + (extra.objetivo - extra.factor) * (1 - Math.exp(-paso / ZOOM_EXTRA_SUAVIZADO));
    if (Math.abs(extra.objetivo - factor) < 0.003) factor = extra.objetivo;
    ponerZoomExtra(carta, factor, zoomExtraAncla);
    if (extra.factor !== extra.objetivo) {
        zoomExtraCuadro = requestAnimationFrame(animarZoomExtra);
    } else {
        zoomExtraTerminados.splice(0).forEach(resolver => resolver());
    }
}

// Le pide a la carta que vaya (suavemente) a ese zoom extra, achicándose o agrandándose alrededor de "ancla"
function pedirZoomExtra(carta, objetivo, ancla) {
    const extra = carta.datosZoom.extra;
    extra.objetivo = Math.max(1, Math.min(ZOOM_EXTRA_MAXIMO, objetivo));
    zoomExtraAncla = ancla;
    if (reducirMovimiento) {
        ponerZoomExtra(carta, extra.objetivo, ancla);
        zoomExtraTerminados.splice(0).forEach(resolver => resolver());
    } else if (!zoomExtraCuadro) {
        zoomExtraUltimoCuadro = performance.now();
        zoomExtraCuadro = requestAnimationFrame(animarZoomExtra);
    }
}

function acercarConRueda(evento) {
    const unidad = evento.deltaMode === 1 ? 33 : evento.deltaMode === 2 ? 800 : 1; // (algunos navegadores cuentan en líneas o en páginas)
    const delta = evento.deltaY * unidad * (evento.ctrlKey ? 6 : 1); // (con Ctrl llega el pellizco del trackpad, que manda valores chicos)
    const extra = cartaEnZoom.datosZoom.extra;
    pedirZoomExtra(cartaEnZoom, extra.objetivo * Math.exp(-delta * ZOOM_EXTRA_RUEDA), { x: evento.clientX, y: evento.clientY });
}

// Corre la carta agrandada de más "dx" y "dy" píxeles de pantalla (es lo que usa el arrastre con el mouse). Igual que con el pellizco,
// la carta sigue al puntero tal cual ("ix" e "iy" quedan donde está) y no deja huecos de pantalla: se corre solo hasta que su borde
// llega al de la pantalla (ver ponerZoomExtra).
function moverZoomExtra(carta, dx, dy) {
    const datos = carta.datosZoom;
    const extra = datos.extra;
    const escala = datos.escala * extra.factor;
    const sobraX = Math.max(0, (datos.anchoBase * escala - document.documentElement.clientWidth) / 2);
    const sobraY = Math.max(0, (datos.altoBase * escala - window.innerHeight) / 2);
    extra.x = extra.ix = Math.max(-sobraX, Math.min(sobraX, extra.x + dx));
    extra.y = extra.iy = Math.max(-sobraY, Math.min(sobraY, extra.y + dy));
    fijarZoom(carta);
}

// Con el mouse, la carta agrandada de más se puede AGARRAR: se aprieta el botón izquierdo sobre su frente y, sin soltar, se arrastra para
// verla de un lado a otro (solo con la rueda costaba mucho apuntar justo adonde se quería mirar). El cursor pasa a ser una mano (abierta
// sobre la carta y cerrada al agarrarla: ver "zoom-arrastrando" en el CSS). Los botones de la carta no la agarran, y soltar después de
// arrastrar no cierra el zoom aunque el mouse termine sobre el fondo. Con el dedo se corre con dos dedos (ver el pellizco).
const ARRASTRE_MINIMO = 3; // px que hay que mover el mouse antes de que cuente como arrastre (un clic quieto no corre nada)

export function activarArrastreDeZoomExtra() {
    let arrastre = null; // { carta, id, x, y, movio }: el mouse que tiene agarrada la carta

    const terminar = () => {
        if (!arrastre) return;
        const { carta, id, movio } = arrastre;
        arrastre = null;
        carta.classList.remove('zoom-arrastrando');
        if (carta.hasPointerCapture?.(id)) carta.releasePointerCapture(id);
        if (movio) ultimoDeslizamiento = performance.now(); // soltar después de arrastrar no cierra el zoom (ver crearFondoZoom)
    };

    listaDigimons.addEventListener('pointerdown', evento => {
        if (evento.pointerType === 'touch' || evento.button !== 0) return;
        if (!zoomExtra || !zoomExtraDisponible() || !cartaEnZoom.contains(evento.target)) return;
        if (evento.target.closest('button, a, .c-evo, .c-ataques')) return;
        terminar();
        arrastre = { carta: cartaEnZoom, id: evento.pointerId, x: evento.clientX, y: evento.clientY, movio: false };
        cartaEnZoom.setPointerCapture(evento.pointerId); // así sigue agarrada aunque el mouse se pase de la carta (o de la ventana)
        cartaEnZoom.classList.add('zoom-arrastrando');
        evento.preventDefault(); // no selecciona texto ni arrastra la imagen
    });

    listaDigimons.addEventListener('pointermove', evento => {
        if (!arrastre || evento.pointerId !== arrastre.id) return;
        if (!zoomExtra || cartaEnZoom !== arrastre.carta || evento.buttons === 0) {
            // (sin botones: se soltó fuera de la ventana y no nos enteramos)
            terminar();
            return;
        }
        const dx = evento.clientX - arrastre.x;
        const dy = evento.clientY - arrastre.y;
        if (!arrastre.movio && Math.hypot(dx, dy) < ARRASTRE_MINIMO) return;
        arrastre.movio = true;
        arrastre.x = evento.clientX;
        arrastre.y = evento.clientY;
        moverZoomExtra(arrastre.carta, dx, dy);
    });

    for (const tipo of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listaDigimons.addEventListener(tipo, evento => {
            if (arrastre && evento.pointerId === arrastre.id) terminar();
        });
    }

    // Si la carta deja de estar agrandada de más, se da vuelta, se cambia o se cierra el zoom, ya no hay nada que agarrar
    document.addEventListener('zoom-extra', () => {
        if (!zoomExtra) terminar();
    });
    document.addEventListener('zoom-cambio', terminar);

    // Que el navegador no arranque su propio arrastre de la imagen
    listaDigimons.addEventListener('dragstart', evento => {
        if (zoomExtra && cartaEnZoom?.contains(evento.target)) evento.preventDefault();
    });
}

// Devuelve la carta al tamaño normal y avisa cuando llegó (se usa antes de darla vuelta)
export function volverAlZoomNormal(carta) {
    return new Promise(resolver => {
        if (!carta.datosZoom || carta.datosZoom.extra.factor === 1) {
            resolver();
            return;
        }
        zoomExtraTerminados.push(resolver);
        pedirZoomExtra(carta, 1, { x: document.documentElement.clientWidth / 2, y: window.innerHeight / 2 });
    });
}

// Corta lo que esté en marcha y deja el zoom extra como "no hay" (la carta que estaba agrandada de más ya no lo está, o se va)
function limpiarZoomExtra() {
    cancelAnimationFrame(zoomExtraCuadro);
    zoomExtraCuadro = 0;
    zoomExtraTerminados.splice(0).forEach(resolver => resolver());
    if (cartaEnZoom?.datosZoom) cartaEnZoom.datosZoom.extra.objetivo = cartaEnZoom.datosZoom.extra.factor;
    if (zoomExtra) {
        zoomExtra = false;
        document.getElementById('zoom-flechas')?.classList.remove('zoom-extra');
        marcarCartaConZoomExtra(null);
        emitir('zoom-extra');
    }
}

// Flechas a los costados de la carta ampliada para pasar a la anterior o a la siguiente sin salir del zoom
// (también con las flechas ← → del teclado). Las cartas que esconden los filtros no cuentan.
function cartaVecina(carta, direccion) {
    let vecina = direccion > 0 ? carta.nextElementSibling : carta.previousElementSibling;
    while (vecina && (vecina.tagName !== 'LI' || vecina.classList.contains('filtrada'))) {
        vecina = direccion > 0 ? vecina.nextElementSibling : vecina.previousElementSibling;
    }
    return vecina;
}

// En celulares también se pasa de carta deslizando el dedo hacia un costado, pero empezando AFUERA de la carta (sobre el fondo):
// hacia la izquierda va a la siguiente y hacia la derecha a la anterior. Si empieza sobre la carta, ese barrido la da vuelta;
// y un toque simple afuera sigue cerrando el zoom.
const DESLIZAR_DISTANCIA = 45; // px que tiene que recorrer el dedo hacia un costado
let ultimoDeslizamiento = 0;

function activarCambioConDedo(fondo) {
    let gesto = null; // { x0, y0, resuelto }: el dedo que está apoyado en el fondo

    fondo.addEventListener(
        'touchstart',
        evento => {
            gesto = null;
            if (evento.touches.length !== 1 || evento.target.closest('button')) return;
            const toque = evento.touches[0];
            gesto = { x0: toque.clientX, y0: toque.clientY, resuelto: false };
        },
        { passive: true },
    );

    fondo.addEventListener(
        'touchmove',
        evento => {
            if (!gesto || gesto.resuelto) return;
            if (evento.touches.length !== 1) {
                gesto = null;
                return;
            }
            const toque = evento.touches[0];
            const dx = toque.clientX - gesto.x0;
            const dy = toque.clientY - gesto.y0;
            if (Math.abs(dx) >= DESLIZAR_DISTANCIA && Math.abs(dx) > Math.abs(dy) * 1.5) {
                gesto.resuelto = true;
                ultimoDeslizamiento = performance.now();
                vibrar(8);
                cambiarZoom(dx < 0 ? 1 : -1);
            }
        },
        { passive: true },
    );

    const terminar = () => {
        gesto = null;
    };
    fondo.addEventListener('touchend', terminar);
    fondo.addEventListener('touchcancel', terminar);
}

const ICONO_FLECHA = puntos =>
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${puntos}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function crearFlechasZoom() {
    const flechas = document.createElement('div');
    flechas.id = 'zoom-flechas';
    flechas.innerHTML =
        `<button type="button" class="zoom-flecha zoom-anterior">${ICONO_FLECHA('M15 5l-7 7 7 7')}</button>` +
        `<button type="button" class="zoom-flecha zoom-siguiente">${ICONO_FLECHA('M9 5l7 7-7 7')}</button>`;
    const anterior = flechas.querySelector('.zoom-anterior');
    const siguiente = flechas.querySelector('.zoom-siguiente');
    ponerAyuda(anterior, t('zoom.anterior'));
    ponerAyuda(siguiente, t('zoom.siguiente'));
    anterior.addEventListener('click', () => cambiarZoom(-1));
    siguiente.addEventListener('click', () => cambiarZoom(1));
    document.body.appendChild(flechas);
    actualizarFlechasZoom();
    void flechas.offsetWidth; // para que aparezcan con un fundido
    flechas.classList.add('abierto');
}

// Pone las flechas pegadas a los costados de la carta (en celular, en el margen que queda) y apaga la que no tiene a dónde ir
function actualizarFlechasZoom() {
    const flechas = document.getElementById('zoom-flechas');
    if (!flechas || !cartaEnZoom) return;
    const ancho = document.documentElement.clientWidth;
    const celular = ancho < 600;
    const lado = celular ? 34 : 48;
    const separacion = celular ? 3 : 10;
    const margen = celular ? 3 : 8;
    const distancia = Math.max(margen, ancho / 2 - cartaEnZoom.datosZoom.anchoFinal / 2 - separacion - lado);
    flechas.style.setProperty('--flecha', `${lado}px`);
    flechas.style.setProperty('--fl-izq', `${distancia}px`);
    flechas.style.setProperty('--fl-der', `${distancia}px`);
    flechas.querySelector('.zoom-anterior').disabled = !cartaVecina(cartaEnZoom, -1);
    flechas.querySelector('.zoom-siguiente').disabled = !cartaVecina(cartaEnZoom, 1);
}

// Pasa el zoom a la carta anterior (-1) o a la siguiente (1): la actual se va hacia un costado y la otra entra por el opuesto
// Si se pide otro cambio mientras todavía se está yendo la carta anterior, no hace falta esperar: se apura lo que queda de esa
// transición y se sigue enseguida (y la nueva dura menos). Así se pueden pasar muchas cartas seguidas rápido.
let cambioEnCurso = null; // la transición de carta que está en marcha: { acelerar(), listo }
let cambiosEsperando = 0; // pedidos que esperan a que termine la transición en marcha

// "repetida": el pedido viene de dejar apretada una tecla; esos no se acumulan (si no, seguiría pasando cartas después de soltarla)
async function cambiarZoom(direccion, repetida = false) {
    let apurado = false;
    while (zoomOcupado && cambioEnCurso) {
        if (cambiosEsperando >= (repetida ? 1 : 8)) return;
        apurado = true;
        cambiosEsperando++;
        cambioEnCurso.acelerar();
        await cambioEnCurso.listo;
        cambiosEsperando--;
    }
    const vieja = cartaEnZoom;
    if (!vieja || zoomOcupado) return;
    const nueva = cartaVecina(vieja, direccion);
    if (!nueva) return;
    zoomOcupado = true;
    let terminarCambio = null;
    emitir('zoom-cambio');
    sonidoZoom(true);

    const zoomCss = parseFloat(getComputedStyle(vieja).zoom) || 1;
    const salto = (direccion * document.documentElement.clientWidth * 0.55) / zoomCss;
    const antes = zoomVigente(vieja.datosZoom); // (con el zoom extra que tenga)
    // La que se va, si no mostraba el reflejo (porque la carta recién había aparecido y el mouse no se movió, o porque estaba agrandada de más),
    // se va igual sin mostrarlo: el puntero sigue encima de ella y, sin esa marca, el "hover" se lo prendería justo cuando se está yendo
    const seVaSinReflejo = vieja.classList.contains('reflejo-quieto') || vieja.classList.contains('zoom-extra-activo');
    limpiarZoomExtra(); // la nueva entra con el zoom normal
    nueva.datosZoom = calcularZoom(nueva);
    const despues = nueva.datosZoom;
    cartaEnZoom = nueva;
    nueva.classList.add('zoom-activa');
    if (seVaSinReflejo) vieja.classList.add('reflejo-quieto'); // (se la saca cuando termina de irse)
    pedirMovimientoDelPuntero(nueva); // aparece sin inclinación ni reflejo hasta que el mouse se mueva
    document.getElementById('zoom-fondo')?.style.setProperty('--zc', colorDeCarta(nueva));
    soltarZoom(vieja);

    if (reducirMovimiento) {
        vieja.classList.remove('zoom-activa', 'reflejo-quieto');
        vieja.datosZoom = null;
    } else {
        const sale = vieja.animate(
            [
                { translate: `${antes.dx}px ${antes.dy}px`, scale: antes.escala, opacity: 1 },
                { translate: `${antes.dx - salto}px ${antes.dy}px`, scale: antes.escala * 0.92, opacity: 0 },
            ],
            { duration: apurado ? 110 : 170, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', fill: 'forwards' },
        );
        const entra = nueva.animate(
            [
                { translate: `${despues.dx + salto}px ${despues.dy}px`, scale: despues.escala * 0.92, opacity: 0 },
                { translate: `${despues.dx}px ${despues.dy}px`, scale: despues.escala, opacity: 1 },
            ],
            { duration: apurado ? 170 : 270, delay: apurado ? 20 : 50, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)', fill: 'both' },
        );
        cambioEnCurso = {
            listo: new Promise(resolver => {
                terminarCambio = resolver;
            }),
            acelerar: () => {
                sale.updatePlaybackRate(3.5);
                entra.updatePlaybackRate(3.5);
            },
        };
        try {
            await Promise.all([sale.finished, entra.finished]);
        } catch (error) {
            // Si alguien cancela una animación, seguimos igual
        }
        fijarZoom(nueva);
        entra.cancel();
        sale.cancel();
        vieja.classList.remove('zoom-activa', 'reflejo-quieto');
        vieja.datosZoom = null;
    }
    if (reducirMovimiento) fijarZoom(nueva);

    // Que la carta quede a la vista en la grilla para cuando se cierre el zoom (si no, se corre la página hasta ella)
    nueva.classList.add('zoom-midiendo');
    soltarZoom(nueva);
    const caja = nueva.getBoundingClientRect();
    nueva.classList.remove('zoom-midiendo');
    const barra = document.getElementById('navbar')?.getBoundingClientRect().bottom ?? 0;
    if (caja.top < barra || caja.bottom > window.innerHeight) {
        window.scrollBy({ top: caja.top + caja.height / 2 - (barra + window.innerHeight) / 2, behavior: 'instant' });
    }
    nueva.datosZoom = calcularZoom(nueva);
    fijarZoom(nueva);

    actualizarFlechasZoom();
    zoomOcupado = false;
    cambioEnCurso = null;
    terminarCambio?.();
    emitir('zoom-cambio');
    if (cierrePendiente) cerrarZoom();
}

export async function abrirZoom(carta) {
    if (cartaEnZoom || zoomOcupado) return;
    cartaEnZoom = carta;
    zoomOcupado = true;
    cierrePendiente = false; // un pedido de cierre viejo no tiene que cerrar este zoom nuevo apenas llegue
    document.activeElement?.blur?.();
    soltarReflejoQuieto();
    emitir('zoom-cambio'); // la inclinación suelta la carta

    const fondo = crearFondoZoom(carta);
    carta.classList.add('zoom-activa');
    carta.datosZoom = calcularZoom(carta);
    const { escala, dx, dy } = carta.datosZoom;
    bloquearDesplazamiento(true);
    sonidoZoom(true);

    void fondo.offsetWidth; // para que el fondo se desvanezca en vez de aparecer de golpe
    fondo.classList.add('abierto');

    if (reducirMovimiento) {
        fijarZoom(carta);
    } else {
        const destino = `${dx}px ${dy}px`;
        const vuelo = carta.animate(
            [
                { offset: 0, translate: '0px 0px', scale: 1, rotate: '0deg', easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' },
                { offset: 0.35, rotate: '-4deg', easing: 'ease-in-out' },
                { offset: 0.72, translate: destino, scale: escala * 1.05, rotate: '1.5deg', easing: 'ease-in-out' },
                { offset: 1, translate: destino, scale: escala, rotate: '0deg' },
            ],
            { duration: 680, fill: 'forwards' },
        );
        try {
            await vuelo.finished;
        } catch (error) {
            // Si alguien cancela el vuelo (por ejemplo al cerrar de golpe), seguimos igual
        }
        if (cartaEnZoom === carta) fijarZoom(carta);
        vuelo.cancel();
    }

    crearFlechasZoom();
    zoomOcupado = false;
    fondo.querySelector('.zoom-cerrar').focus({ preventScroll: true });
    emitir('zoom-cambio'); // ahora la inclinación mide la carta ya grande
    if (cierrePendiente) cerrarZoom();
}

export async function cerrarZoom({ rapido = false } = {}) {
    const carta = cartaEnZoom;
    if (!carta) return;
    // Si ya se está cerrando (un segundo clic afuera, o Esc de nuevo, mientras la carta vuelve) no hay nada más que hacer. Antes ese
    // segundo pedido quedaba anotado como "cierre pendiente" y, como nadie lo atendía, se cumplía en el PRÓXIMO zoom: la carta
    // llegaba al centro y se volvía a ir sola.
    if (zoomCerrando) return;
    if (zoomOcupado) {
        cierrePendiente = true;
        return;
    }
    cierrePendiente = false;
    zoomOcupado = true;
    zoomCerrando = true;
    emitir('zoom-cambio');

    const { escala, dx, dy } = zoomVigente(carta.datosZoom); // vuelve desde donde está, con el zoom extra que tenga
    limpiarZoomExtra();
    const fondo = document.getElementById('zoom-fondo');
    fondo?.classList.remove('abierto');
    document.getElementById('zoom-flechas')?.classList.remove('abierto');
    soltarZoom(carta);

    let vuelta;
    if (!rapido && !reducirMovimiento) {
        sonidoZoom(false);
        vuelta = carta.animate(
            [
                { translate: `${dx}px ${dy}px`, scale: escala, rotate: '0deg' },
                { translate: '0px 0px', scale: 1, rotate: '0deg' },
            ],
            { duration: 480, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'both' },
        );
        try {
            await vuelta.finished;
        } catch (error) {
            // Si alguien cancela la vuelta, seguimos igual
        }
    }

    vuelta?.cancel();
    carta.classList.remove('zoom-activa');
    soltarReflejoQuieto(); // la carta vuelve a la grilla como cualquier otra
    carta.datosZoom = null;
    cartaEnZoom = null;
    fondo?.remove();
    document.getElementById('zoom-flechas')?.remove();
    bloquearDesplazamiento(false);
    zoomOcupado = false;
    zoomCerrando = false;
    cierrePendiente = false;
    emitir('zoom-cambio');
}

// Vuelve la selección para el combate a como estaba antes del primer clic del doble clic
export function restaurarSeleccion(estado) {
    seleccionados.forEach(carta => carta.classList.remove('seleccionado'));
    seleccionados.splice(0, seleccionados.length, ...estado);
    estado.forEach(carta => carta.classList.add('seleccionado'));
    verificarSeleccion();
}

export function activarZoom() {
    listaDigimons.addEventListener('dblclick', evento => {
        if (evento.target.closest('button')) return;
        const carta = evento.target.closest('#listado-digimons > li');
        if (!carta || cartaEnZoom) return;
        // Los dos clics del doble clic eligieron y desearon la carta (y, con 2 elegidas, pudieron sacar a otra): se deshace
        if (seleccionAntesDelClic.carta === carta) restaurarSeleccion(seleccionAntesDelClic.estado);
        abrirZoom(carta);
    });

    // Un doble clic no selecciona el texto de la carta
    listaDigimons.addEventListener('mousedown', evento => {
        if (evento.detail > 1 && !cartaEnZoom && !evento.target.closest('button') && evento.target.closest('#listado-digimons > li')) {
            evento.preventDefault();
        }
    });

    // Las ventanas de evolución y de ataques se abren directamente sobre la carta en grande, sin salir del modo zoom.
    // Solo si el zoom todavía está en plena transición (llegando o yéndose) se ignora el toque.
    document.addEventListener(
        'click',
        evento => {
            const boton = cartaEnZoom && evento.target.closest('.c-evo, .c-ataques');
            if (!boton) return;
            if (zoomOcupado) {
                evento.stopPropagation();
                evento.preventDefault();
            }
        },
        true,
    );

    activarZoomConPellizco();
    activarZoomConDobleToque();
}
