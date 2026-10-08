// -----------------------------------------------------------------------------------------------------------------
// INCLINACIÓN 3D DE LAS CARTAS
//
// La carta se inclina hacia el puntero (o hacia el dedo, manteniéndola apretada) y el reflejo lo sigue. Con Shift se anula
// (o al revés, con el botón de inclinación invertida), y con Shift la rueda del mouse sigue subiendo y bajando la página.
// -----------------------------------------------------------------------------------------------------------------

import { CON_MOUSE, emitir, guardarJSON, HAY_PANTALLA_TACTIL, leerJSON, ponerAyuda } from './util.js';
import { t } from './i18n.js';
import { listaDigimons } from './pagina.js';
import { PERSPECTIVA, reducirMovimiento } from './cartas.js';
import { zoomEsperaMovimiento, zoomExtra, zoomOcupado } from './zoom.js';
import { vibrar } from './audio.js';
import { toqueQueSoloCierraMenus } from './menus.js';

// Preferencia de la inclinación con el mouse (solo computadora): por defecto las cartas se inclinan al pasar el mouse y Shift apretada lo
// anula; con "invertida" es al revés (no se inclinan al pasar el mouse y solo lo hacen mientras se mantiene apretada Shift). Se cambia con
// el botón de la barra (#inclinacion-invertida, junto al de sonido) y, como el sonido, se guarda en el navegador de cada persona
// (localStorage) como un JSON {"invertida": true}, así la próxima vez que entre sigue como la dejó.
// Para volver a empezar (por ejemplo, para probarlo): localStorage.removeItem('digimon-inclinacion')
const INCLINACION_ALMACEN = 'digimon-inclinacion';

function leerInclinacionInvertida() {
    return leerJSON(INCLINACION_ALMACEN)?.invertida === true; // sin memoria (o con un dato roto) queda como siempre
}

function guardarInclinacionInvertida(invertida) {
    guardarJSON(INCLINACION_ALMACEN, { invertida });
}

// Inclinación 3D: la carta se inclina hacia donde apunta y el reflejo sigue al puntero (--mx y --my). Con mouse se inclina
// más en el frente que en el dorso para poder leer; con el dedo, solo se puede inclinar el frente para no interferir con el scroll.
// Sin "reducir movimiento". Con el mouse, mientras se mantiene apretada Shift
// las cartas no se inclinan ni brillan (el levante del hover, en cambio, sigue siempre: se pueden recorrer todas con el mouse sin que se
// incline ninguna). Al soltarla vuelve todo solo. Con la preferencia "invertida" (ver arriba), Shift hace lo contrario: sin Shift las
// cartas no se inclinan ni brillan y con Shift apretada sí.
// Con el dedo: se mantiene apretada la carta un instante y, sin soltar, al mover el dedo se inclina (mientras tanto la
// página no se desplaza). Un toque corto sigue siendo un toque normal (elegir la carta para el combate).
export function activarInclinacion() {
    const conMouse = CON_MOUSE.matches;
    const conDedo = HAY_PANTALLA_TACTIL;
    if (reducirMovimiento || (!conMouse && !conDedo)) return;

    listaDigimons.classList.add('tilt-on');

    const INCLINACION_FRENTE = 10; // grados máximos
    const INCLINACION_DORSO = 3;
    let cartaActual = null;
    let caja = null; // posición y tamaño de la carta cuando empezó a seguir al puntero
    let x = 0;
    let y = 0; // posición del puntero dentro de la carta, de -1 a 1 (hacia dónde se tiene que inclinar)

    // La inclinación se suaviza acá, cuadro a cuadro, y NO con una transición de CSS sobre "transform". Con la perspectiva,
    // el navegador dibuja una carta que tiene una animación de "transform" a menor resolución mientras dura: se veía
    // pixelada todo el rato que se movía el mouse sobre la carta (y mucho más con el zoom) y un instante al soltarla.
    // Sin animación de CSS, la carta se dibuja siempre a su resolución real.
    const TIEMPO_SEGUIR = 45; // ms que tarda la carta en alcanzar al puntero
    const TIEMPO_VOLVER = 140; // ms que tarda en enderezarse al soltarla (más lento, para que no sea un tirón)
    const suaves = new Map(); // carta → { x, y }: lo que se está dibujando (incluye las que se están enderezando)
    let cuadro = 0; // pedido de animationFrame pendiente
    let ultimoCuadro = 0;

    // Le avisa al cartel de ayuda de la inclinación (ver activarAvisoDeInclinacion) cuándo empieza y cuándo termina de inclinarse una carta
    let inclinacionAvisada = false;
    function avisarInclinacion() {
        const activa = !!cartaActual;
        if (activa === inclinacionAvisada) return;
        inclinacionAvisada = activa;
        emitir('inclinacion-cambio', { activa });
    }

    function pintar(carta, suave) {
        const maximo = carta.classList.contains('de-dorso') ? INCLINACION_DORSO : INCLINACION_FRENTE;
        carta.style.transform = `${PERSPECTIVA}rotateX(${(-suave.y * maximo).toFixed(2)}deg) rotateY(${(suave.x * maximo).toFixed(2)}deg)`;
        carta.style.setProperty('--mx', `${((suave.x + 1) * 50).toFixed(1)}%`);
        carta.style.setProperty('--my', `${((suave.y + 1) * 50).toFixed(1)}%`);
    }

    function enderezar(carta) {
        carta.style.transform = '';
        carta.style.removeProperty('--mx');
        carta.style.removeProperty('--my');
        suaves.delete(carta);
    }

    function animar(ahora) {
        cuadro = 0;
        const paso = Math.min(ahora - ultimoCuadro, 64);
        ultimoCuadro = ahora;
        for (const [carta, suave] of suaves) {
            if (carta.girando) {
                // mientras se da vuelta manda la animación del giro
                enderezar(carta);
                soltar(carta); // y deja de ser la carta que sigue al puntero: si no, al terminar el giro no volvía a inclinarse
                continue;
            }
            const siguiendo = carta === cartaActual;
            const k = 1 - Math.exp(-paso / (siguiendo ? TIEMPO_SEGUIR : TIEMPO_VOLVER));
            suave.x += ((siguiendo ? x : 0) - suave.x) * k;
            suave.y += ((siguiendo ? y : 0) - suave.y) * k;
            if (!siguiendo && Math.abs(suave.x) < 0.004 && Math.abs(suave.y) < 0.004) {
                enderezar(carta); // ya está derecha: se saca el transform y la carta deja de ser una capa 3D
                continue;
            }
            pintar(carta, suave);
        }
        if (suaves.size) cuadro = requestAnimationFrame(animar);
    }

    function arrancar() {
        if (cuadro) return;
        ultimoCuadro = performance.now();
        cuadro = requestAnimationFrame(animar);
    }

    // La carta deja de seguir al puntero; la animación la va enderezando
    function soltar(carta) {
        if (!carta) return;
        carta.classList.remove('tilt-activo');
        if (carta === cartaActual) {
            cartaActual = null;
            caja = null;
        }
        if (suaves.has(carta)) arrancar();
        avisarInclinacion();
    }

    // La carta empieza a seguir al puntero. Se usa la caja visible (getBoundingClientRect), que ya tiene en cuenta
    // el achicado de las cartas en celular
    function tomar(carta) {
        soltar(cartaActual);
        cartaActual = carta;
        const rect = carta.getBoundingClientRect();
        caja = { x: rect.left + scrollX, y: rect.top + scrollY, ancho: rect.width, alto: rect.height };
        carta.classList.add('tilt-activo');
        if (!suaves.has(carta)) suaves.set(carta, { x: 0, y: 0 });
        avisarInclinacion();
    }

    // ¿El puntero sigue en la zona de la carta que se está siguiendo? Es la caja con la que empezó (sin inclinar) más un margen: al
    // inclinarse, la carta aparta el borde que está cerca del puntero y este queda un instante afuera, aunque no se movió. Con la carta
    // ampliada el margen crece con su tamaño: ahí los bordes se apartan mucho más.
    function enLaZonaDeLaCarta(clienteX, clienteY) {
        if (!cartaActual || !caja) return false;
        const px = clienteX + scrollX;
        const py = clienteY + scrollY;
        const margenX = Math.max(12, caja.ancho * 0.055);
        const margenY = Math.max(22, caja.alto * 0.067);
        return px >= caja.x - margenX && px <= caja.x + caja.ancho + margenX && py >= caja.y - margenY && py <= caja.y + caja.alto + margenY;
    }

    function seguir(clienteX, clienteY) {
        if (!caja) return; // la carta está dándose vuelta y ya no sigue al dedo
        const limitar = valor => Math.max(-1, Math.min(1, valor));
        x = limitar(((clienteX + scrollX - caja.x) / caja.ancho) * 2 - 1);
        y = limitar(((clienteY + scrollY - caja.y) / caja.alto) * 2 - 1);
        arrancar();
    }

    if (conMouse) {
        let puntero = null; // última posición del mouse sobre las cartas (para retomar la inclinación al terminar un giro)
        // Mientras la inclinación está "anulada", la carta se endereza y no sigue al mouse, y con la clase "inclinacion-anulada" el CSS
        // también apaga el reflejo y la textura holográfica (que siguen al puntero). El levante del hover NO se apaga: sigue como siempre.
        // Se puede pasar el mouse por todas las cartas sin que ninguna se incline ni brille. Por defecto se anula mientras se mantiene
        // apretada Shift; con la preferencia
        // "invertida" es al revés: está anulada siempre, salvo mientras se mantiene apretada Shift. Al cambiar, todo se acomoda solo, sin
        // mover el mouse. Cada movimiento del mouse trae el estado de Shift (evento.shiftKey), así que si se soltó fuera de la ventana y
        // nos perdimos el aviso, se corrige solo.
        let shiftApretada = false;
        let invertida = leerInclinacionInvertida();
        const anulada = () => invertida !== shiftApretada; // (invertida y Shift apretada se compensan)

        // Si el mouse está sobre una carta, empieza a seguirlo desde donde está el puntero
        const retomar = () => {
            if (!puntero || zoomOcupado || zoomExtra || zoomEsperaMovimiento || anulada()) return;
            const carta = document.elementFromPoint(puntero.x, puntero.y)?.closest('#listado-digimons > li');
            if (!carta || carta.girando || carta.classList.contains('bailando')) return;
            tomar(carta);
            seguir(puntero.x, puntero.y);
        };

        // Deja todo como corresponde al estado de ahora: anulada, la carta que seguía al mouse se endereza (suave, como al salir de ella);
        // si no, retoma la inclinación
        const acomodar = () => {
            listaDigimons.classList.toggle('inclinacion-anulada', anulada());
            if (anulada()) soltar(cartaActual);
            else retomar();
        };

        const ponerShift = apretada => {
            if (apretada === shiftApretada) return;
            shiftApretada = apretada;
            acomodar();
        };

        listaDigimons.addEventListener('pointermove', evento => {
            if (evento.pointerType === 'touch' || zoomOcupado) return;
            puntero = { x: evento.clientX, y: evento.clientY };
            ponerShift(evento.shiftKey);
            if (anulada() || zoomExtra || zoomEsperaMovimiento) {
                // (con el zoom extra de la carta ampliada tampoco se inclina: ver "ZOOM EXTRA"; ni cuando se pasó de carta y el mouse no se movió: ver zoomEsperaMovimiento)
                soltar(cartaActual);
                return;
            }
            let carta = evento.target.closest('#listado-digimons > li');

            // Si la carta actual se inclinó o levantó y el puntero quedó un instante en el borde que se apartó,
            // no la soltamos de inmediato: verificamos si el puntero sigue dentro de su zona de interacción (caja base con tolerancia).
            // Esto evita que la carta vibre (se active y desactive a 60 fps) al entrar lentamente desde cualquier borde.
            if (!carta && enLaZonaDeLaCarta(evento.clientX, evento.clientY)) carta = cartaActual;

            if (!carta) {
                soltar(cartaActual);
                return;
            }
            if (carta.girando || carta.classList.contains('bailando')) {
                // mientras se da vuelta o baila (baile.js) no se inclina: tienen su propia animación
                soltar(cartaActual);
                return;
            }
            if (carta !== cartaActual) tomar(carta);
            seguir(evento.clientX, evento.clientY);
        });

        // Si se dio vuelta una carta con el mouse encima y no se lo movió de ahí, la inclinación sigue sin pedir que se salga y se vuelva a entrar.
        // Se mira qué hay bajo el puntero (y no ":hover"): al terminar el giro el navegador puede tardar en actualizar el "hover"
        document.addEventListener('giro-terminado', evento => {
            const carta = evento.detail;
            if (!puntero || zoomOcupado || zoomExtra || zoomEsperaMovimiento || anulada()) return;
            const debajo = document.elementFromPoint(puntero.x, puntero.y);
            if (!debajo || !carta.contains(debajo)) return;
            tomar(carta);
            seguir(puntero.x, puntero.y);
        });

        // Al devolver la carta ampliada a su tamaño normal (ver "ZOOM EXTRA"), la inclinación se retoma si el mouse sigue encima
        document.addEventListener('zoom-extra', acomodar);

        // El baile de las cartas (baile.js): al empezar, la carta que seguía al puntero se suelta; al terminar, se retoma si el mouse sigue encima
        document.addEventListener('baile-empezo', () => soltar(cartaActual));
        document.addEventListener('baile-terminado', acomodar);

        // Al apretar o soltar Shift, la inclinación se anula o se retoma según corresponda (ver "acomodar")
        document.addEventListener('keydown', evento => {
            if (evento.key === 'Shift') ponerShift(true);
        });

        document.addEventListener('keyup', evento => {
            if (evento.key === 'Shift') ponerShift(evento.shiftKey); // (por si queda la otra Shift apretada)
        });

        // Con la carta ampliada, lo que rodea a la carta es el fondo del zoom, que no es parte de la lista: al inclinarse y apartar su borde, el
        // puntero "sale de la lista" y los movimientos siguientes ya no llegan a ella. Si sigue en la zona de la carta, no se la suelta (si no,
        // se endereza, el puntero vuelve a quedar sobre ella, se inclina de nuevo... y titila); ver el pointermove de document, más abajo.
        listaDigimons.addEventListener('pointerleave', evento => {
            if (evento.pointerType === 'touch') return;
            if (enLaZonaDeLaCarta(evento.clientX, evento.clientY)) return;
            puntero = null;
            soltar(cartaActual);
        });

        // El puntero se mueve fuera de la lista mientras una carta lo seguía (el caso de recién): mientras siga en su zona, la carta lo sigue
        // igual que cuando el puntero queda un instante entre dos cartas; al salirse de la zona, se suelta
        document.addEventListener('pointermove', evento => {
            if (evento.pointerType === 'touch' || !cartaActual || evento.target.closest?.('#listado-digimons')) return; // dentro de la lista, lo atiende su pointermove
            if (zoomOcupado || anulada() || zoomExtra || zoomEsperaMovimiento || !enLaZonaDeLaCarta(evento.clientX, evento.clientY)) {
                puntero = null;
                soltar(cartaActual);
                return;
            }
            seguir(evento.clientX, evento.clientY);
        });
        // Si el puntero sale de la página, la carta se suelta
        document.documentElement.addEventListener('pointerleave', evento => {
            if (evento.pointerType === 'touch') return;
            puntero = null;
            soltar(cartaActual);
        });

        // El botón de la barra (junto al de sonido) invierte la inclinación. Solo existe en computadora: está escondido (hidden) y recién
        // acá, con mouse y sin "reducir movimiento", se muestra. Queda "hundido" (aria-pressed) cuando está invertida.
        const botonInversion = document.getElementById('inclinacion-invertida');
        if (botonInversion) {
            const mostrarModo = () => {
                const ayuda = t(invertida ? 'inclinacion.invertida' : 'inclinacion.normal');
                botonInversion.setAttribute('aria-pressed', String(invertida));
                ponerAyuda(botonInversion, ayuda);
            };
            botonInversion.hidden = false;
            botonInversion.addEventListener('click', () => {
                invertida = !invertida;
                guardarInclinacionInvertida(invertida);
                mostrarModo();
                acomodar();
            });
            // Si se cambia el idioma, la ayuda del botón se vuelve a escribir en el idioma nuevo
            document.addEventListener('idioma-cambiado', mostrarModo);
            mostrarModo();
        }
        acomodar(); // si la preferencia guardada es "invertida", las cartas arrancan sin reaccionar
    }

    if (conDedo) activarInclinacionConDedo({ tomar, seguir, soltar: () => soltar(cartaActual) });

    // Cuando la carta pasa al centro (o vuelve), la caja que se midió ya no vale: se suelta y se mide de nuevo
    document.addEventListener('zoom-cambio', () => soltar(cartaActual));
    // Con el zoom extra de la carta ampliada (ver "ZOOM EXTRA") la inclinación se cancela
    document.addEventListener('zoom-extra', () => {
        if (zoomExtra) soltar(cartaActual);
    });

    // Al tocar el botón de dar vuelta, la carta se endereza para poder girar
    listaDigimons.addEventListener(
        'click',
        evento => {
            if (evento.target.closest('.c-flip')) soltar(cartaActual);
        },
        true,
    );
}

const ESPERA_DEDO = 220; // ms que hay que mantener apretada la carta para que empiece a inclinarse
const TOLERANCIA_DEDO = 10; // px que se puede mover el dedo antes de eso (si se mueve más, es que quiere desplazar la página)
export let inclinandoConDedo = false; // true mientras hay una carta inclinándose con el dedo (gestos.js y avisos.js lo miran)

function activarInclinacionConDedo({ tomar, seguir, soltar }) {
    let espera = 0; // temporizador de "mantener apretado"
    let inicio = null; // dónde y en qué carta apoyó el dedo
    let inclinando = false;
    let evitarClic = false; // al soltar después de inclinar no se elige la carta

    function cancelar() {
        clearTimeout(espera);
        inicio = null;
        inclinandoConDedo = false;
        if (inclinando) {
            inclinando = false;
            soltar();
        }
    }

    listaDigimons.addEventListener(
        'touchstart',
        evento => {
            if (evento.touches.length !== 1) {
                cancelar();
                return;
            }
            const carta = evento.target.closest('#listado-digimons > li');
            if (
                !carta ||
                carta.classList.contains('de-dorso') ||
                carta.girando ||
                zoomOcupado ||
                zoomExtra ||
                evento.target.closest('button') ||
                toqueQueSoloCierraMenus()
            )
                return;
            const toque = evento.touches[0];
            inicio = { x: toque.clientX, y: toque.clientY };
            clearTimeout(espera);
            espera = setTimeout(() => {
                if (!inicio || carta.girando || carta.classList.contains('de-dorso')) {
                    cancelar();
                    return;
                }
                inclinando = true;
                inclinandoConDedo = true;
                tomar(carta);
                seguir(inicio.x, inicio.y);
                vibrar(10);
                emitir('inclinacion-con-dedo'); // el cartel de ayuda ya no tiene que contar cómo se hace
            }, ESPERA_DEDO);
        },
        { passive: true },
    );

    // No es pasivo porque, mientras se inclina la carta, hay que frenar el desplazamiento de la página
    listaDigimons.addEventListener(
        'touchmove',
        evento => {
            const toque = evento.touches[0];
            if (inclinando) {
                if (evento.cancelable) evento.preventDefault();
                seguir(toque.clientX, toque.clientY);
            } else if (inicio && Math.hypot(toque.clientX - inicio.x, toque.clientY - inicio.y) > TOLERANCIA_DEDO) {
                cancelar(); // está desplazando la página
            }
        },
        { passive: false },
    );

    const terminar = () => {
        const estabaInclinando = inclinando;
        cancelar();
        if (estabaInclinando) {
            evitarClic = true;
            setTimeout(() => {
                evitarClic = false;
            }, 450);
        }
    };
    listaDigimons.addEventListener('touchend', terminar);
    listaDigimons.addEventListener('touchcancel', terminar);

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

    // Mantener apretada una carta no abre el menú del sistema (guardar imagen, copiar...)
    listaDigimons.addEventListener('contextmenu', evento => {
        if (evento.target.closest('#listado-digimons > li')) evento.preventDefault();
    });
}

// Con Shift apretada, el navegador convierte la rueda del mouse en desplazamiento HORIZONTAL; como la página no se desplaza hacia los costados,
// no pasaba nada: con Shift (que anula la inclinación de las cartas) no se podía subir ni bajar. Acá la rueda con Shift se vuelve vertical.
// Se hace después de que el resto de los manejadores de la rueda tuvo su turno (setTimeout), para respetar a los que frenan el fondo (el zoom
// de una carta, los carteles del combate): si alguno la frenó, no se toca. Si debajo del puntero hay una zona que sí se desplaza hacia los
// costados (por ejemplo, un árbol de evolución ancho), se deja al navegador; si hay una zona con scroll vertical propio, se desplaza ella.
export function activarRuedaConShift() {
    const desplazaEn = (elemento, eje) => {
        const estilo = getComputedStyle(elemento);
        const valor = eje === 'x' ? estilo.overflowX : estilo.overflowY;
        if (valor !== 'auto' && valor !== 'scroll') return false;
        return eje === 'x' ? elemento.scrollWidth > elemento.clientWidth + 1 : elemento.scrollHeight > elemento.clientHeight + 1;
    };

    window.addEventListener(
        'wheel',
        evento => {
            if (!evento.shiftKey || evento.ctrlKey || evento.altKey || evento.metaKey) return;
            const unidad = evento.deltaMode === 1 ? 33 : evento.deltaMode === 2 ? 800 : 1; // (algunos navegadores cuentan en líneas o en páginas)
            const delta = (evento.deltaY || evento.deltaX) * unidad; // (según el navegador, el valor llega en deltaY o en deltaX)
            if (!delta) return;
            const destino = evento.target;
            setTimeout(() => {
                if (evento.defaultPrevented || !destino.isConnected) return;
                let vertical = null;
                for (
                    let el = destino instanceof Element ? destino : destino.parentElement;
                    el && el !== document.body && el !== document.documentElement;
                    el = el.parentElement
                ) {
                    if (desplazaEn(el, 'x')) return; // ahí Shift + rueda ya se desplaza hacia los costados
                    if (!vertical && desplazaEn(el, 'y')) vertical = el;
                }
                const raiz = document.documentElement;
                if (!vertical && raiz.scrollWidth > raiz.clientWidth + 1) return; // la página sí se desplaza hacia los costados
                (vertical ?? window).scrollBy({ top: delta, behavior: 'auto' });
            }, 0);
        },
        { passive: true },
    );
}

// Al hacer clic en un botón con el mouse (en especial con la tecla Shift mantenida, por ejemplo al usar la rueda con Shift),
// los botones no deben retener el aro de foco (:focus-visible) ni iniciar una selección de texto accidental.
// Con la navegación por teclado (Tab, Enter, Espacio) la accesibilidad y el foco visible siguen funcionando con total normalidad.
export function evitarFocoYSeleccionConShift() {
    document.addEventListener('mousedown', evento => {
        const boton = evento.target.closest('button, [role="button"]');
        if (!boton) return;
        if (evento.shiftKey) {
            evento.preventDefault();
            window.getSelection?.()?.removeAllRanges?.();
        }
    });

    document.addEventListener(
        'click',
        evento => {
            const boton = evento.target.closest('button, [role="button"]');
            if (!boton) return;
            if (evento.detail > 0 || evento.shiftKey) {
                if (document.activeElement === boton || boton.contains(document.activeElement)) {
                    boton.blur();
                }
                if (evento.shiftKey) {
                    window.getSelection?.()?.removeAllRanges?.();
                }
            }
        },
        true,
    );
}
