// -----------------------------------------------------------------------------------------------------------------
// GESTOS CON EL DEDO (pantallas táctiles)
//
// Doble toque y pellizco para el zoom, barrido rápido para dar vuelta la carta (y las flechas de ayuda, que se dejan de
// mostrar cuando ya se aprendió), barrido vertical para salir del zoom y el toque con "hundimiento" de los botones del dorso.
// (Y la espera del clic de los botoncitos del frente de la carta, para que un doble toque o un doble clic los tome como pedido de zoom: eso vale
// también con el mouse.)
// -----------------------------------------------------------------------------------------------------------------

import { emitir, guardarTexto, hayMarcaDeSesion, HAY_PANTALLA_TACTIL, leerTexto, marcarSegundoDeUnDoble, ponerMarcaDeSesion } from './util.js';
import { listaDigimons } from './pagina.js';
import { seleccionados } from './combate.js';
import { voltearCarta } from './cartas.js';
import {
    ZOOM_EXTRA_MAXIMO,
    abrirZoom,
    cartaEnZoom,
    cerrarZoom,
    ponerZoomExtra,
    puedeCerrarseConDobleToque,
    restaurarSeleccion,
    volverAlZoomNormal,
    zonaConScroll,
    zoomExtra,
    zoomExtraDisponible,
    zoomOcupado,
} from './zoom.js';
import { inclinandoConDedo } from './inclinacion.js';
import { vibrar } from './audio.js';
import { toqueQueSoloCierraMenus } from './menus.js';

// En celulares la carta también se amplía con doble toque (dos toques cortos seguidos sobre la misma carta). Igual que con el
// doble clic, el primer toque ya eligió la carta y el segundo la desmarcó: al ampliar se deja la selección como estaba antes.
// Y con la carta ya ampliada, un doble toque sobre ella la devuelve a su lugar (ahí los toques no eligen la carta, así que no hay nada que deshacer;
// y no cuenta sobre los botones ni los botoncitos de la carta, que tienen su propia función).
// (Se detecta acá y no con "dblclick" porque no todos los navegadores del celular lo mandan con un doble toque.)
const DOBLE_TOQUE_ESPERA = 320; // ms máximos entre el final de un toque y el principio del siguiente
const DOBLE_TOQUE_DISTANCIA = 30; // px máximos entre los dos toques
const TOQUE_DURACION = 250; // ms máximos que el dedo puede estar apoyado para que cuente como toque (más es una presión larga)
const TOQUE_MOVIMIENTO = 12; // px máximos que se puede mover el dedo durante un toque

// Un doble toque (o doble clic) sobre un botoncito del frente de la carta (la gema, el nivel, el atributo o el elemento) también quiere ampliar la carta:
// abrir la ventana de información del botoncito y cerrarla enseguida no tiene sentido. Como el primer clic ya abriría esa ventana, el clic del
// botoncito espera un instante (lo que dura la espera del doble toque, más un pequeño margen) a ver si llega el segundo: si llega, se amplía la
// carta y la ventana no se abre; si no, la ventana se abre como siempre. Con el dedo el segundo toque se reconoce acá (ver abajo); con el mouse
// lo reconoce el navegador (es el clic con "detail" 2, y después llega el "dblclick" que amplía la carta, en zoom.js). Los botones del dorso y
// los clics de teclado no esperan nada.
// Ese segundo toque tampoco suena ni vibra otra vez (el primero ya lo hizo): se anota con marcarSegundoDeUnDoble() para quien suena o vibra.
const CHIPS_DEL_FRENTE = '#listado-digimons > li :is(.c-gema, .c-nivel, .c-atributo, .c-elem)';
const ESPERA_DEL_CHIP = DOBLE_TOQUE_ESPERA + 40; // ms que espera el clic de un botoncito
const CLIC_DESPUES_DEL_TOQUE = 700; // ms máximos entre que se levanta el dedo y el clic que le sigue para que cuente como "hecho con el dedo"

let pendiente = null; // { chip, carta, espera }: el clic de un botoncito del frente que espera a ver si es el primero de un doble toque
let reenviando = false;
let descartarClicHasta = 0; // hasta cuándo se descarta el clic de un botoncito: es el del segundo toque de un doble toque
let ultimoToqueTerminado = -Infinity; // cuándo se levantó el dedo la última vez
let ultimoDobleClicEnBotoncito = -Infinity; // cuándo el mouse hizo el último doble clic sobre un botoncito del frente (ver zoom.js)

// ¿El doble clic que acaba de llegar (el "dblclick") fue sobre un botoncito del frente de una carta? Sus dos clics no eligieron la carta
export const fueDobleClicEnBotoncito = () => performance.now() - ultimoDobleClicEnBotoncito < 500;

// Le entrega al botoncito su clic, que estaba esperando (si ya se lo entregó o no hay, no hace nada)
const soltarPendiente = () => {
    if (!pendiente) return;
    const { chip, espera } = pendiente;
    pendiente = null;
    clearTimeout(espera);
    reenviando = true;
    try {
        chip.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, view: window, detail: 1 }));
    } finally {
        reenviando = false;
    }
};

// Vale con dedo y con mouse (también en las pantallas sin tacto)
export function activarEsperaDeBotoncitos() {
    // ¿El toque que empieza es el segundo de un doble toque sobre un botoncito? Lo es si el anterior fue otro toque corto, hace poco y cerca, sobre
    // un botoncito de la misma carta (los mismos números que el doble toque de la carta, más abajo)
    let anterior = null; // { carta, x, y, t, fin }: el último apoyo sobre un botoncito del frente
    window.addEventListener(
        'pointerdown',
        evento => {
            if (!evento.isPrimary) return;
            const carta = evento.button === 0 ? evento.target.closest?.(CHIPS_DEL_FRENTE)?.closest('#listado-digimons > li') : null;
            const previo = anterior;
            anterior = carta && { carta, x: evento.clientX, y: evento.clientY, t: evento.timeStamp, fin: -Infinity };
            marcarSegundoDeUnDoble(
                !!previo &&
                    previo.carta === carta &&
                    !cartaEnZoom &&
                    !zoomOcupado &&
                    evento.timeStamp - previo.fin <= DOBLE_TOQUE_ESPERA &&
                    Math.hypot(evento.clientX - previo.x, evento.clientY - previo.y) <= DOBLE_TOQUE_DISTANCIA,
            );
            // Con el mouse, tocar otra cosa mientras un botoncito espera su segundo clic es no esperarlo más: la ventana se abre ya
            // (con el dedo lo hace el principio de cada toque: ver activarZoomConDobleToque)
            if (pendiente && evento.pointerType === 'mouse' && !pendiente.chip.contains(evento.target)) soltarPendiente();
        },
        true,
    );
    window.addEventListener(
        'pointerup',
        evento => {
            if (!evento.isPrimary || !anterior) return;
            const corto =
                evento.timeStamp - anterior.t <= TOQUE_DURACION && Math.hypot(evento.clientX - anterior.x, evento.clientY - anterior.y) <= TOQUE_MOVIMIENTO;
            if (corto) anterior.fin = evento.timeStamp;
            else anterior = null;
        },
        true,
    );
    window.addEventListener(
        'pointercancel',
        () => {
            anterior = null;
        },
        true,
    );

    // (En window y en captura: va antes que el manejador que abre las ventanas de los botoncitos, en cartas.js)
    window.addEventListener(
        'click',
        evento => {
            if (reenviando || evento.detail === 0 || cartaEnZoom || zoomOcupado) return; // (detail 0: clic del teclado o de un lector de pantalla)
            const conDedo = evento.timeStamp - ultimoToqueTerminado <= CLIC_DESPUES_DEL_TOQUE;
            if (!conDedo && evento.detail > 1 && pendiente && pendiente.carta === evento.target.closest?.('#listado-digimons > li')) {
                // Con el mouse, el segundo clic de un doble clic sobre la carta cuyo botoncito esperaba: la ventana no se abre y el "dblclick" que sigue amplía
                // la carta. (El clic puede llegar a la carta y no al botoncito: la carta se inclina con el puntero y el botoncito se corre entre que se
                // aprieta y se suelta.)
                clearTimeout(pendiente.espera);
                pendiente = null;
                ultimoDobleClicEnBotoncito = performance.now();
                evento.stopPropagation();
                evento.preventDefault();
                return;
            }
            const chip = evento.target.closest?.(CHIPS_DEL_FRENTE);
            if (!chip) return;
            const carta = chip.closest('#listado-digimons > li');
            evento.stopPropagation();
            evento.preventDefault();
            if (conDedo && performance.now() < descartarClicHasta) return; // el segundo toque de un doble toque: la carta se amplía y la ventana no se abre
            soltarPendiente();
            pendiente = { chip, carta, espera: setTimeout(soltarPendiente, ESPERA_DEL_CHIP) };
        },
        true,
    );
}

export function activarZoomConDobleToque() {
    if (!HAY_PANTALLA_TACTIL) return;
    let apoyado = null; // { carta, t, x, y, estado, cerrar }: el dedo que está apoyado ahora ("cerrar": la carta ya estaba ampliada)
    let anterior = null; // { carta, tFin, x, y, estado, cerrar }: el último toque corto

    document.addEventListener(
        'touchstart',
        evento => {
            apoyado = null;
            const toque = evento.touches[0];
            const carta = evento.touches.length === 1 ? toque.target.closest?.('#listado-digimons > li') : null;
            const cerrar = !!cartaEnZoom; // con una carta ampliada el doble toque es para devolverla a su lugar; si no, para ampliarla
            // (un toque que solo cierra un menú abierto no cuenta como el primero de un doble toque: ver menus.js)
            const sirve = cerrar
                ? carta === cartaEnZoom && puedeCerrarseConDobleToque(toque.target)
                : !!carta && !zoomOcupado && !toque.target.closest('button') && !toqueQueSoloCierraMenus();
            if (!sirve) {
                anterior = null;
                soltarPendiente();
                return;
            }
            // "estado" es la selección de antes del primer toque (el clic de ese toque llega recién al soltar el dedo)
            const esSegundo = anterior && anterior.carta === carta && anterior.cerrar === cerrar && evento.timeStamp - anterior.tFin <= DOBLE_TOQUE_ESPERA;
            // Puede ser el segundo toque de un doble toque sobre un botoncito: se deja de esperar el tiempo del primero, y se decide cuando termine este
            if (esSegundo && pendiente?.carta === carta) clearTimeout(pendiente.espera);
            apoyado = { carta, t: evento.timeStamp, x: toque.clientX, y: toque.clientY, estado: esSegundo ? anterior.estado : seleccionados.slice(), cerrar };
        },
        { passive: true },
    );

    document.addEventListener(
        'touchmove',
        evento => {
            if (!apoyado) return;
            const toque = evento.touches[0];
            if (Math.hypot(toque.clientX - apoyado.x, toque.clientY - apoyado.y) > TOQUE_MOVIMIENTO) {
                apoyado = null;
                anterior = null;
                soltarPendiente(); // (no era el segundo toque: el del botoncito sigue su camino)
            }
        },
        { passive: true },
    );

    document.addEventListener(
        'touchend',
        evento => {
            ultimoToqueTerminado = evento.timeStamp;
            const toque = apoyado;
            apoyado = null;
            if (!toque) return;
            if (evento.timeStamp - toque.t > TOQUE_DURACION) {
                // presión larga (la inclinación): no cuenta como toque
                anterior = null;
                soltarPendiente();
                return;
            }
            const previo = anterior;
            const esDoble =
                previo &&
                previo.carta === toque.carta &&
                previo.cerrar === toque.cerrar &&
                toque.t - previo.tFin <= DOBLE_TOQUE_ESPERA &&
                Math.hypot(toque.x - previo.x, toque.y - previo.y) <= DOBLE_TOQUE_DISTANCIA;
            if (!esDoble) {
                anterior = { carta: toque.carta, tFin: evento.timeStamp, x: toque.x, y: toque.y, estado: toque.estado, cerrar: toque.cerrar };
                soltarPendiente(); // (si venía otro botoncito esperando, este toque no lo anuló)
                return;
            }
            anterior = null;
            if (toque.cerrar) {
                // Doble toque sobre la carta ampliada: vuelve a su lugar (también acá se espera un instante, a que el clic del segundo toque termine de procesarse)
                setTimeout(() => {
                    if (cartaEnZoom !== toque.carta || zoomOcupado) return;
                    vibrar(12);
                    cerrarZoom();
                }, 60);
                return;
            }
            // Doble toque: la carta se amplía. Si el primer toque fue en un botoncito, su ventana no se abre ni se abre la del segundo (que llega justo ahora)
            if (pendiente) clearTimeout(pendiente.espera);
            pendiente = null;
            descartarClicHasta = performance.now() + CLIC_DESPUES_DEL_TOQUE;
            // Se espera un instante a que el segundo toque termine de procesarse como clic, y ahí se deshace lo que hicieron los dos
            setTimeout(() => {
                restaurarSeleccion(previo.estado);
                if (cartaEnZoom || zoomOcupado) return;
                vibrar(12);
                abrirZoom(toque.carta);
            }, 60);
        },
        { passive: true },
    );

    document.addEventListener(
        'touchcancel',
        () => {
            apoyado = null;
            anterior = null;
            soltarPendiente();
        },
        { passive: true },
    );
}

// Con el dedo la carta también se amplía con el gesto de zoom (dos dedos que se separan sobre la carta) y vuelve
// a su lugar juntando los dedos. Tocar afuera o la ✕ también la cierra, como siempre.
// Con la carta ya ampliada y de frente, separar los dedos la agranda todavía más (ver "ZOOM EXTRA") y solo mientras se mantiene el pellizco: al
// soltar los dedos (o uno solo) vuelve sola al tamaño normal del zoom. Si ya está en su tamaño normal, juntar los dedos la cierra, como siempre.
// En el dorso, juntar los dedos cierra y separarlos no hace nada.
// (El CSS deja las cartas con touch-action: pan-y: se pueden desplazar hacia arriba y abajo, pero el navegador no amplía la
// página con ese pellizco y los dedos le llegan al código.)
const PELLIZCO_ABRIR = 1.3; // los dedos se separaron un 30%
const PELLIZCO_CERRAR = 0.75; // los dedos se juntaron un 25%

export function activarZoomConPellizco() {
    let pellizco = null; // { carta, distancia, resuelto }: el gesto de dos dedos que está en curso

    const distanciaEntreDedos = toques => Math.hypot(toques[0].clientX - toques[1].clientX, toques[0].clientY - toques[1].clientY);
    const medioEntreDedos = toques => ({
        x: (toques[0].clientX + toques[1].clientX) / 2,
        y: (toques[0].clientY + toques[1].clientY) / 2,
    });

    document.addEventListener(
        'touchstart',
        evento => {
            pellizco = null;
            if (evento.touches.length !== 2) return;
            const [a, b] = evento.touches;
            if (cartaEnZoom) {
                // "previo" es donde estaban los dedos en el último movimiento (el zoom extra sigue a los dedos paso a paso); "cerrable" es si
                // este gesto puede cerrar el zoom: no si ya se empezó con la carta agrandada de más (juntar los dedos es para devolverla)
                pellizco = {
                    carta: null,
                    distancia: distanciaEntreDedos(evento.touches),
                    resuelto: false,
                    previo: { distancia: distanciaEntreDedos(evento.touches), medio: medioEntreDedos(evento.touches) },
                    cerrable: !zoomExtra,
                };
                return;
            }
            // Los dos dedos tienen que estar en la misma carta (o el segundo en el espacio entre cartas)
            const cartaA = a.target.closest?.('#listado-digimons > li');
            const cartaB = b.target.closest?.('#listado-digimons > li');
            if (cartaA && (cartaB === cartaA || !cartaB)) {
                pellizco = { carta: cartaA, distancia: distanciaEntreDedos(evento.touches), resuelto: false };
            }
        },
        { passive: true },
    );

    document.addEventListener(
        'touchmove',
        evento => {
            if (!pellizco || pellizco.resuelto || evento.touches.length !== 2 || pellizco.distancia < 10) return;
            const proporcion = distanciaEntreDedos(evento.touches) / pellizco.distancia;
            if (evento.cancelable) evento.preventDefault();
            if (!pellizco.carta && zoomExtraDisponible()) {
                // zoom extra: la carta sigue a los dedos (se agranda con la separación y se corre con el movimiento)
                const distancia = distanciaEntreDedos(evento.touches);
                const medio = medioEntreDedos(evento.touches);
                const carta = cartaEnZoom;
                const extra = carta.datosZoom.extra;
                const factor = Math.max(1, Math.min(ZOOM_EXTRA_MAXIMO, (extra.factor * distancia) / pellizco.previo.distancia));
                extra.objetivo = factor;
                ponerZoomExtra(carta, factor, pellizco.previo.medio, medio, true);
                pellizco.previo = { distancia, medio };
                if (zoomExtra) pellizco.cerrable = false; // ya se usó para agrandar: juntar los dedos ahora es devolverla, no cerrar
            }
            if (!pellizco.carta && pellizco.cerrable && proporcion <= PELLIZCO_CERRAR) {
                pellizco.resuelto = true;
                cerrarZoom();
            } else if (pellizco.carta && proporcion >= PELLIZCO_ABRIR && !cartaEnZoom && !zoomOcupado) {
                pellizco.resuelto = true;
                vibrar(12);
                abrirZoom(pellizco.carta);
            }
        },
        { passive: false },
    );

    const terminar = evento => {
        if (evento.touches.length >= 2) return;
        // Se terminó un pellizco hecho con la carta ya ampliada: si la agrandó de más, vuelve sola al tamaño normal (el zoom extra dura lo que dura el pellizco)
        const eraPellizcoConLaCartaAmpliada = pellizco && !pellizco.carta;
        pellizco = null;
        if (eraPellizcoConLaCartaAmpliada && zoomExtra && cartaEnZoom) volverAlZoomNormal(cartaEnZoom);
    };
    document.addEventListener('touchend', terminar);
    document.addEventListener('touchcancel', terminar);

    // iPhone: el pellizco sobre una carta (o con la carta ampliada) no tiene que ampliar la página
    for (const tipo of ['gesturestart', 'gesturechange']) {
        document.addEventListener(
            tipo,
            evento => {
                if (cartaEnZoom || evento.target.closest?.('#listado-digimons > li')) evento.preventDefault();
            },
            { passive: false },
        );
    }
}

// En celulares la carta también se da vuelta con un barrido rápido de un dedo hacia un costado (además del botón de la
// esquina). Si antes se mantuvo apretada para inclinarla, el barrido tiene que ser mucho más rápido (ver más abajo).
// La carta gira hacia donde va el dedo.
const BARRIDO_DISTANCIA = 40; // px que tiene que recorrer el dedo hacia el costado en los últimos instantes
const BARRIDO_VELOCIDAD = 0.7; // px por milisegundo: tiene que ser un movimiento rápido
const BARRIDO_VENTANA = 90; // ms que se miran para calcular la distancia y la velocidad
// Mientras la carta se está inclinando con el dedo (mantenida apretada), se mueve el dedo de un lado a otro para ver el
// brillo, y sin querer se daba vuelta. Entonces, en ese caso, el barrido tiene que ser muchísimo más rápido y más largo
// (si se da vuelta sin querer: subir estos números; si cuesta darla vuelta a propósito: bajarlos)
const BARRIDO_DISTANCIA_INCLINANDO = 70; // px
const BARRIDO_VELOCIDAD_INCLINANDO = 1.8; // px por milisegundo (más de 2 veces la normal)

// Ocultamiento inteligente de las flechas de flip en móvil:
// 4 flips con el dedo las ocultan por el resto de esa sesión. Al completar esto en 5 sesiones distintas, se ocultan para siempre.
const ALMACEN_FLIPS_SESION = 'digimon-flips-sesion';
const ALMACEN_SESION_FLIPS_COMPLETADA = 'digimon-flips-sesion-completada';
const ALMACEN_SESIONES_FLIPS_COMPLETADAS = 'digimon-flips-sesiones-completadas';
const MIN_FLIPS_SESION_PARA_OCULTAR = 4;
const MIN_SESIONES_FLIPS_PARA_OCULTAR_SIEMPRE = 5;
let sesionFlipContada = false;

// Un número guardado en el navegador: 0 si no hay nada, si está roto o si el navegador no deja guardar
const leerNumero = (clave, donde) => Math.max(0, Number.parseInt(leerTexto(clave, donde) ?? '0', 10) || 0);

function aplicarOcultarFlechasFlip() {
    document.body.classList.add('sin-flechas-flip-movil');
}

function registrarSesionDeFlipsCompletada() {
    if (sesionFlipContada) return;
    sesionFlipContada = true;
    if (hayMarcaDeSesion(ALMACEN_SESION_FLIPS_COMPLETADA)) return;
    const completadas = Math.min(leerNumero(ALMACEN_SESIONES_FLIPS_COMPLETADAS) + 1, MIN_SESIONES_FLIPS_PARA_OCULTAR_SIEMPRE);
    guardarTexto(ALMACEN_SESIONES_FLIPS_COMPLETADAS, String(completadas));
    ponerMarcaDeSesion(ALMACEN_SESION_FLIPS_COMPLETADA);
    if (completadas >= MIN_SESIONES_FLIPS_PARA_OCULTAR_SIEMPRE) aplicarOcultarFlechasFlip();
}

export function gestionarVisitasYFlechasMovil() {
    // Solo se vuelve permanente después de completar los 4 flips en 5 sesiones distintas
    if (leerNumero(ALMACEN_SESIONES_FLIPS_COMPLETADAS) >= MIN_SESIONES_FLIPS_PARA_OCULTAR_SIEMPRE) {
        aplicarOcultarFlechasFlip();
        return;
    }

    // Si ya completó los 4 flips en esta sesión, oculta las flechas y registra el logro si todavía no estaba contado
    if (hayMarcaDeSesion(ALMACEN_SESION_FLIPS_COMPLETADA)) sesionFlipContada = true;
    if (leerNumero(ALMACEN_FLIPS_SESION, 'sesion') >= MIN_FLIPS_SESION_PARA_OCULTAR) {
        aplicarOcultarFlechasFlip();
        registrarSesionDeFlipsCompletada();
    }
}

function registrarFlipConDedo() {
    emitir('flip-con-dedo');
    const flips = leerNumero(ALMACEN_FLIPS_SESION, 'sesion') + 1;
    guardarTexto(ALMACEN_FLIPS_SESION, String(flips), 'sesion');
    if (flips >= MIN_FLIPS_SESION_PARA_OCULTAR) {
        aplicarOcultarFlechasFlip();
        registrarSesionDeFlipsCompletada();
    }
}

// ---- Botones del dorso con el dedo ("⚔️ Ataques" y "🧬 Evolución") ----------------------------------------------------------------
// En el celular estos botones no esperan al "click" del navegador: el navegador lo manda tarde (a veces cientos de milisegundos después de
// levantar el dedo) y, justo después de dar vuelta la carta, a veces ni lo manda y había que tocar dos veces. Con el dedo, el botón se activa
// al LEVANTARLO (si no se movió: si se arrastró, era para desplazar la página) y se frena el "click" que mandaría el navegador, que ya
// no hace falta. Con el mouse y con el teclado sigue andando el "click" de siempre.
// Además el botón se hunde (clase "hundido", mismos estilos que :active): el :active del navegador no alcanza en celular, porque en un
// toque corto casi no llega a verse. Así el hundimiento dura como mínimo TOQUE_HUNDIDO_MINIMO ms y la ventana se abre un instante
// después de que se ve.
const TOQUE_HUNDIDO_MINIMO = 120; // ms que el botón se ve hundido, aunque el toque haya sido más corto
const TOQUE_TOLERANCIA = 12; // px que puede moverse el dedo y que siga contando como toque (más es un desplazamiento)

export function activarBotonDelDorso(boton, accion) {
    let toque = null; // { x, y, desde } mientras el dedo está apoyado en el botón
    let sinClicHasta = 0; // hasta cuándo se ignora el "click" que manda el navegador después de un toque (ya se atendió al levantar el dedo)
    let levantando = 0;

    const hundir = () => {
        clearTimeout(levantando);
        boton.classList.add('hundido');
    };
    const levantar = desde => {
        clearTimeout(levantando);
        levantando = setTimeout(() => boton.classList.remove('hundido'), Math.max(0, TOQUE_HUNDIDO_MINIMO - (performance.now() - desde)));
    };
    const abrir = () => {
        if (cartaEnZoom && zoomOcupado) return; // con la carta ampliada yendo o viniendo, el toque se ignora (como el "click" en la fase de captura)
        accion();
    };
    const soltarToque = () => {
        if (!toque) return;
        levantar(toque.desde);
        toque = null;
    };

    boton.addEventListener(
        'touchstart',
        evento => {
            if (evento.touches.length !== 1) {
                soltarToque();
                return;
            }
            const dedo = evento.touches[0];
            toque = { x: dedo.clientX, y: dedo.clientY, desde: performance.now() };
            hundir();
        },
        { passive: true },
    );

    boton.addEventListener(
        'touchmove',
        evento => {
            if (!toque) return;
            const dedo = evento.touches[0];
            if (Math.hypot(dedo.clientX - toque.x, dedo.clientY - toque.y) > TOQUE_TOLERANCIA) soltarToque();
        },
        { passive: true },
    );

    boton.addEventListener('touchend', evento => {
        if (!toque) return;
        const { desde } = toque;
        toque = null;
        levantar(desde);
        if (evento.cancelable) evento.preventDefault(); // sin "click" ni mouse simulado después
        sinClicHasta = performance.now() + 800;
        setTimeout(abrir, Math.max(0, TOQUE_HUNDIDO_MINIMO * 0.6 - (performance.now() - desde)));
    });

    boton.addEventListener('touchcancel', soltarToque);

    boton.addEventListener('click', evento => {
        evento.stopPropagation(); // que no cuente como elegir la carta para el combate
        if (performance.now() < sinClicHasta) {
            // el toque ya lo atendió: este "click" es el que el navegador manda de todos modos
            evento.preventDefault();
            return;
        }
        abrir();
    });
}

export function activarVoltearConDedo() {
    if (!HAY_PANTALLA_TACTIL) return;
    let gesto = null; // { carta, x0, y0, muestras, resuelto }: el dedo que está apoyado en una carta
    let evitarClic = false; // al soltar después del barrido no se elige la carta

    document.addEventListener(
        'touchstart',
        evento => {
            gesto = null;
            if (evento.touches.length !== 1) return;
            const toque = evento.touches[0];
            const carta = toque.target.closest?.('#listado-digimons > li');
            if (!carta || toque.target.closest('button')) return;
            gesto = {
                carta,
                x0: toque.clientX,
                y0: toque.clientY,
                muestras: [{ t: evento.timeStamp, x: toque.clientX, y: toque.clientY }],
                resuelto: false,
            };
        },
        { passive: true },
    );

    document.addEventListener(
        'touchmove',
        evento => {
            if (!gesto || gesto.resuelto) return;
            if (evento.touches.length !== 1) {
                gesto = null;
                return;
            }
            const toque = evento.touches[0];
            const muestras = gesto.muestras;
            muestras.push({ t: evento.timeStamp, x: toque.clientX, y: toque.clientY });
            while (muestras.length > 2 && evento.timeStamp - muestras[0].t > BARRIDO_VENTANA) muestras.shift();

            // Si el dedo va decididamente hacia un costado, la página no se desplaza
            const dxTotal = toque.clientX - gesto.x0;
            const dyTotal = toque.clientY - gesto.y0;
            if (evento.cancelable && Math.abs(dxTotal) > 10 && Math.abs(dxTotal) > Math.abs(dyTotal)) evento.preventDefault();

            const primera = muestras[0];
            const ultima = muestras[muestras.length - 1];
            const dx = ultima.x - primera.x;
            const dy = ultima.y - primera.y;
            const ms = Math.max(1, ultima.t - primera.t);
            const distanciaMinima = inclinandoConDedo ? BARRIDO_DISTANCIA_INCLINANDO : BARRIDO_DISTANCIA;
            const velocidadMinima = inclinandoConDedo ? BARRIDO_VELOCIDAD_INCLINANDO : BARRIDO_VELOCIDAD;
            if (Math.abs(dx) >= distanciaMinima && Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) / ms >= velocidadMinima) {
                gesto.resuelto = true;
                evitarClic = true;
                setTimeout(() => {
                    evitarClic = false;
                }, 450);
                vibrar(8);
                voltearCarta(gesto.carta, dx > 0 ? 1 : -1);
                registrarFlipConDedo();
            }
        },
        { passive: false },
    );

    const terminar = () => {
        gesto = null;
    };
    document.addEventListener('touchend', terminar);
    document.addEventListener('touchcancel', terminar);

    listaDigimons.addEventListener(
        'click',
        evento => {
            if (!evitarClic) return;
            evitarClic = false;
            evento.stopPropagation();
            evento.preventDefault();
        },
        true,
    );
}

// Con la carta ampliada, un barrido de un dedo hacia arriba o hacia abajo que empieza SOBRE la carta la devuelve a su lugar (el barrido hacia un
// costado la da vuelta, como siempre). Cuenta de dos maneras: un movimiento rápido (los mismos números que para dar vuelta la carta) o un arrastre
// largo y bien vertical aunque sea lento. Si antes se la mantuvo apretada para inclinarla, mover el dedo es parte de la inclinación: ahí solo
// cuenta un barrido muchísimo más rápido y largo (los números de la inclinación, como para dar vuelta). En el dorso, si empieza sobre la
// descripción y esta se puede desplazar, ese barrido es para desplazarla y no cierra.
const SALIR_DISTANCIA_LARGO = 80; // px de arrastre vertical desde donde se apoyó el dedo (si sube este número, cuesta más salir arrastrando despacio)

export function activarSalirDelZoomConBarrido() {
    if (!HAY_PANTALLA_TACTIL) return;
    let gesto = null; // { x0, y0, muestras, resuelto }: el dedo que está apoyado en la carta ampliada

    document.addEventListener(
        'touchstart',
        evento => {
            gesto = null;
            if (evento.touches.length !== 1 || !cartaEnZoom || zoomOcupado || zoomExtra) return;
            const toque = evento.touches[0];
            if (!cartaEnZoom.contains(toque.target) || zonaConScroll(toque.target) || document.querySelector('.swal2-container')) return;
            gesto = { x0: toque.clientX, y0: toque.clientY, muestras: [{ t: evento.timeStamp, x: toque.clientX, y: toque.clientY }], resuelto: false };
        },
        { passive: true },
    );

    document.addEventListener(
        'touchmove',
        evento => {
            if (!gesto || gesto.resuelto) return;
            if (evento.touches.length !== 1 || !cartaEnZoom || zoomOcupado || zoomExtra) {
                gesto = null;
                return;
            }
            const toque = evento.touches[0];
            const muestras = gesto.muestras;
            muestras.push({ t: evento.timeStamp, x: toque.clientX, y: toque.clientY });
            while (muestras.length > 2 && evento.timeStamp - muestras[0].t > BARRIDO_VENTANA) muestras.shift();

            const primera = muestras[0];
            const ultima = muestras[muestras.length - 1];
            const dx = ultima.x - primera.x;
            const dy = ultima.y - primera.y;
            const ms = Math.max(1, ultima.t - primera.t);
            const distanciaMinima = inclinandoConDedo ? BARRIDO_DISTANCIA_INCLINANDO : BARRIDO_DISTANCIA;
            const velocidadMinima = inclinandoConDedo ? BARRIDO_VELOCIDAD_INCLINANDO : BARRIDO_VELOCIDAD;
            const rapido = Math.abs(dy) >= distanciaMinima && Math.abs(dy) > Math.abs(dx) * 2 && Math.abs(dy) / ms >= velocidadMinima;
            const dxTotal = toque.clientX - gesto.x0;
            const dyTotal = toque.clientY - gesto.y0;
            const largo = !inclinandoConDedo && Math.abs(dyTotal) >= SALIR_DISTANCIA_LARGO && Math.abs(dyTotal) > Math.abs(dxTotal) * 2;
            if (rapido || largo) {
                gesto.resuelto = true;
                vibrar(8);
                cerrarZoom();
            }
        },
        { passive: true },
    );

    const terminar = () => {
        gesto = null;
    };
    document.addEventListener('touchend', terminar);
    document.addEventListener('touchcancel', terminar);
}
