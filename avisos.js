// -----------------------------------------------------------------------------------------------------------------
// AVISOS DE AYUDA
//
// Los cartelitos que explican cómo se usa la página (combate, zoom, gestos, inclinación, zoom extra), el aviso del contador
// después del primer combate y la "llamada" de los botones redondos (sonido e inclinación). Recuerdan qué ya vio cada persona.
// -----------------------------------------------------------------------------------------------------------------

import { CON_DEDO, CON_MOUSE, PANTALLA_DE_CELULAR, emitir, guardarJSON, hayMarcaDeSesion, leerJSON, ponerMarcaDeSesion } from './util.js';
import { t } from './i18n.js';
import { botonIniciarCombate, contadorSeleccion, listaDigimons } from './pagina.js';
import { combateEnCurso, seleccionados } from './combate.js';
import { cartaEnZoom, zoomCerrando, zoomExtra } from './zoom.js';
import { inclinandoConDedo } from './inclinacion.js';
import { AUDIO_AVISO_DURACION, ubicarBotonDeAudio } from './audio.js';

// -----------------------------------------------------------------------------------------------------------------
// AVISO DEL CONTADOR: una sola vez por sesión del navegador, cuando termina el primer combate (o se lo cierra a medio camino), de
// la bolita "2/2" de la barra sale un minicartel con una flechita que cuenta que ahí se puede tocar para quitar la selección de las
// cartas, o tocar las cartas de a una para soltarlas. Se va solo a los pocos segundos y antes si la persona cambia la selección,
// empieza otro combate, amplía una carta o (en celular) la barra se esconde al bajar por la lista.
// Solo en las primeras 3 visitas (se usa el mismo contador de visitas de los avisos de ayuda, ver registrarVisitaDeAvisos): desde la
// cuarta vez que entra a la página ya no sale.
// -----------------------------------------------------------------------------------------------------------------
const AVISO_CONTADOR_SESION = 'digimon-aviso-contador'; // sessionStorage: recargar la página no lo vuelve a mostrar, abrirla de nuevo sí
export const AVISO_CONTADOR_ESPERA = 300; // ms después de que se cierra el último cartel del combate (además de lo que tarde en irse)
const AVISO_CONTADOR_DURACION = 9000; // ms que queda a la vista
const AVISO_CONTADOR_VISITAS_MAXIMAS = 3; // desde la cuarta visita ya no sale
let avisoContadorVisto = false;
let avisoDelContador = null;
let temporizadorAvisoContador = 0;
let vigilanteDeLaBarra = null;

avisoContadorVisto = hayMarcaDeSesion(AVISO_CONTADOR_SESION); // sin memoria solo se recuerda mientras la página siga abierta

function escribirAvisoDelContador() {
    if (!avisoDelContador) return;
    const conDedo = CON_DEDO.matches;
    avisoDelContador.querySelector('.aviso-texto').textContent = t(conDedo ? 'aviso.contador.dedos' : 'aviso.contador.mouse');
}

// Debajo del contador, con la flechita justo debajo de él (el cartel se corre para no salirse de la pantalla)
function ubicarAvisoDelContador() {
    if (!avisoDelContador) return;
    const margen = 8;
    const boton = contadorSeleccion.getBoundingClientRect();
    const ancho = avisoDelContador.offsetWidth;
    const centro = boton.left + boton.width / 2;
    const izquierda = Math.max(margen, Math.min(centro - ancho / 2, window.innerWidth - ancho - margen));
    avisoDelContador.style.left = `${Math.round(izquierda)}px`;
    avisoDelContador.style.top = `${Math.round(boton.bottom + 12)}px`;
    avisoDelContador.style.setProperty('--punta', `${Math.round(centro - izquierda)}px`);
}

export function quitarAvisoDelContador() {
    if (!avisoDelContador) return;
    const aviso = avisoDelContador;
    avisoDelContador = null;
    clearTimeout(temporizadorAvisoContador);
    vigilanteDeLaBarra?.disconnect();
    vigilanteDeLaBarra = null;
    aviso.classList.remove('visible'); // se vuelve a achicar hacia el contador
    setTimeout(() => aviso.remove(), 500);
}

export function mostrarAvisoDelContador(reintentos = 15) {
    if (memoriaAvisos.visitas > AVISO_CONTADOR_VISITAS_MAXIMAS) return; // ya entró 4 veces o más: no hace falta
    if (avisoContadorVisto || avisoDelContador || seleccionados.length === 0) return;
    if (document.querySelector('.combate-contenedor')) {
        // el último cartel todavía se está desvaneciendo: se espera a que se vaya del todo
        if (reintentos > 0) setTimeout(() => mostrarAvisoDelContador(reintentos - 1), 150);
        return;
    }
    const barra = document.getElementById('navbar');
    if (barra.classList.contains('barra-escondida')) return; // el contador no se ve: queda para el próximo combate
    avisoContadorVisto = true;
    ponerMarcaDeSesion(AVISO_CONTADOR_SESION);

    avisoDelContador = document.createElement('div');
    avisoDelContador.id = 'aviso-contador';
    avisoDelContador.className = 'aviso-contador';
    avisoDelContador.setAttribute('role', 'status');
    avisoDelContador.innerHTML = '<span class="aviso-icono" aria-hidden="true">👆</span><span class="aviso-texto"></span>';
    escribirAvisoDelContador();
    avisoDelContador.addEventListener('click', quitarAvisoDelContador);
    document.body.appendChild(avisoDelContador);
    ubicarAvisoDelContador();
    void avisoDelContador.offsetWidth; // para que la entrada se anime
    avisoDelContador.classList.add('visible');
    temporizadorAvisoContador = setTimeout(quitarAvisoDelContador, AVISO_CONTADOR_DURACION);

    // En celular, si la barra se esconde el contador sale de la pantalla y el cartel quedaría colgando
    vigilanteDeLaBarra = new MutationObserver(() => {
        if (barra.classList.contains('barra-escondida')) quitarAvisoDelContador();
    });
    vigilanteDeLaBarra.observe(barra, { attributes: true, attributeFilter: ['class'] });
}

// Al seleccionar o deseleccionar cartas el cartel NO se cancela: queda los segundos para que se pueda leer,
// a menos que la persona toque directamente el botón contador (o empiece otro combate o amplíe una carta).
document.addEventListener('seleccion-cambio', ubicarAvisoDelContador);
botonIniciarCombate.addEventListener('click', quitarAvisoDelContador);
document.addEventListener('zoom-cambio', () => {
    if (cartaEnZoom) quitarAvisoDelContador();
});
document.addEventListener('idioma-cambiado', () => {
    escribirAvisoDelContador();
    ubicarAvisoDelContador();
});
window.addEventListener('resize', ubicarAvisoDelContador);
// La barra también cambia de alto sin que cambie la ventana (por ejemplo, cuando el bloque de carga desaparece)
if ('ResizeObserver' in window) new ResizeObserver(ubicarAvisoDelContador).observe(document.getElementById('navbar'));

// AVISOS DE AYUDA: cartelitos discretos (arriba a la derecha, debajo de la barra) que aparecen unos segundos después de abrir la
// página. Si entraran junto con el resto de la carga parecerían parte de la página y pasarían desapercibidos. No tapan nada (dejan
// pasar el mouse y los toques) y se van solos a los pocos segundos. Los tiempos se cuentan desde que aparece la primera carta:
//   - 2 s: (solo celular) qué hay que hacer, "Elige 2 digimons...". En computadora la consigna ya está a la vista en la barra;
//          en celular está dentro del menú ☰.
//   - 5 s: cómo ampliar una carta y, en pantallas táctiles, cómo inclinarla y darla vuelta. Con mouse habla del doble clic; en
//          pantallas táctiles son dos cartelitos separados: el doble toque o pellizco, y que si se mantiene apretada la carta y se mueve
//          el dedo, brilla y se inclina, y con un barrido rápido se da vuelta (dicho sin palabras técnicas).
//   - 2 s después de ampliar la primera carta: (solo pantallas táctiles) cómo cerrarla y cómo pasar a otra deslizando el dedo, en dos
//          cartelitos separados. Salen una sola vez por visita, y no si se cierra la carta antes de que entren.
// Si hay más de uno a la vez, se apilan (el primero arriba). Cada consejo es independiente: se va apenas la persona hace lo que
// cuenta (y ni aparece si ya lo hizo antes de que entre). Si ya hizo todo, el aviso no aparece. Mientras hay una carta ampliada
// los avisos pasan por encima del zoom, para que se lean.
// MEMORIA DE LOS AVISOS: se guarda en el navegador de cada persona (localStorage), como un JSON, así los avisos no se repiten
// cada vez que vuelve a entrar:
//   { "visitas": 3, "hecho": { "combate": true, "zoom": true, "inclinar": false, "gestos": true } }
//   - "hecho": lo que la persona ya hizo (eligió las 2 cartas, amplió una, inclinó una con el dedo) o ya vio ("gestos", que se
//     muestra una sola vez). Un aviso que ya no hace falta no vuelve a salir.
//   - "visitas": cuántas veces entró. Entrar una séptima vez todavía los muestra; desde la octava no sale ninguno (ya los conoce).
//     Cuenta una por sesión del navegador: recargar la página con la pestaña abierta no suma.
// Si el navegador no deja guardar (modo privado, datos bloqueados), todo sigue andando como si fuera la primera vez.
// Para empezar de cero (por ejemplo, para probarlos): localStorage.removeItem('digimon-avisos')
const AVISOS_ALMACEN = 'digimon-avisos';
const AVISOS_VISITAS_MAXIMAS = 7;
let memoriaAvisos = { visitas: 0, hecho: {} };

function guardarMemoriaAvisos() {
    guardarJSON(AVISOS_ALMACEN, memoriaAvisos);
}

// Lee lo guardado y suma la visita. Devuelve true si todavía hay que mostrar avisos
function registrarVisitaDeAvisos() {
    const guardado = leerJSON(AVISOS_ALMACEN); // si no se puede leer (o está dañado), se empieza de cero
    if (guardado && typeof guardado === 'object') {
        memoriaAvisos.visitas = Number.isFinite(guardado.visitas) ? guardado.visitas : 0;
        if (guardado.hecho && typeof guardado.hecho === 'object') memoriaAvisos.hecho = guardado.hecho;
    }
    const visitaNueva = !hayMarcaDeSesion(AVISOS_ALMACEN); // una por sesión: recargar no cuenta (sin memoria de sesión cuenta cada carga)
    ponerMarcaDeSesion(AVISOS_ALMACEN);
    if (visitaNueva) {
        memoriaAvisos.visitas += 1;
        guardarMemoriaAvisos();
    }
    return memoriaAvisos.visitas <= AVISOS_VISITAS_MAXIMAS;
}

const avisoHecho = clave => memoriaAvisos.hecho[clave] === true;

function marcarAvisoHecho(clave) {
    if (avisoHecho(clave)) return;
    memoriaAvisos.hecho[clave] = true;
    guardarMemoriaAvisos();
}

const AVISO_COMBATE_ESPERA = 2000; // ms desde que aparece la primera carta
const AVISO_COMBATE_DURACION = 7000; // ms que queda a la vista
const AVISO_ZOOM_ESPERA = 5000; // ms desde que aparece la primera carta (3 s después del de combate, para que se lean de a uno)
const AVISO_ZOOM_ESPERA_DEDO = 2000; // ms desde que termina de salir el aviso de combate (solo celular)
const AVISO_ZOOM_DURACION = 7000; // ms que queda a la vista el consejo (computadora: uno solo)
const AVISO_ZOOM_DURACION_DEDO = 14000; // ms que duran los consejos móviles
const AVISO_VOLTEAR_DURACION_EXTRA = 3000; // el consejo del barrido dura 3 s más que los demás
const AVISO_GESTOS_ESPERA = 2000; // ms desde que se amplía la carta (solo celular)
const AVISO_GESTOS_DURACION = 10500; // ms que quedan a la vista (son dos cartelitos, uno por consejo)

let cajaDeAvisos = null; // el contenedor donde se apilan los avisos (se crea con el primero)

function ubicarAvisos() {
    if (!cajaDeAvisos) return;
    // Debajo de la barra, que cambia de alto según el ancho de la pantalla. Se cuenta con el alto de la barra y no con dónde está
    // en este momento: en celular la barra se esconde al bajar y, si el aviso entra en ese momento, quedaría fuera de la pantalla
    cajaDeAvisos.style.top = `${Math.round(document.getElementById('navbar').getBoundingClientRect().height) + 12}px`;
}

// Con una carta ampliada el fondo del zoom tapa todo: los avisos pasan por encima mientras dura
function avisosSobreElZoom() {
    cajaDeAvisos?.classList.toggle('sobre-zoom', !!cartaEnZoom);
}

function ponerAviso(aviso) {
    if (!cajaDeAvisos) {
        cajaDeAvisos = document.createElement('div');
        cajaDeAvisos.id = 'avisos-ayuda';
        document.body.appendChild(cajaDeAvisos);
    }
    cajaDeAvisos.appendChild(aviso);
    ubicarAvisos();
    avisosSobreElZoom();
    void aviso.offsetWidth; // para que la entrada se anime
    aviso.classList.add('visible');
}

// Se desvanece y se achica (así los que quedan abajo suben sin saltar) y después se saca
function quitarAviso(aviso) {
    aviso.classList.remove('visible');
    aviso.classList.add('saliendo');
    setTimeout(() => aviso.remove(), 600); // cuando termina de achicarse
}

function crearAviso(id, lineas) {
    const aviso = document.createElement('div');
    aviso.id = id;
    aviso.className = 'aviso-ayuda';
    aviso.setAttribute('role', 'status');
    aviso.innerHTML = lineas
        .map(
            ({ clave, icono, texto }) =>
                `<p class="aviso-linea" data-clave="${clave}" data-texto="${texto}"><span class="aviso-icono" aria-hidden="true">${icono}</span><span class="aviso-texto"></span></p>`,
        )
        .join('');
    return aviso;
}

function escribirAviso(aviso) {
    aviso?.querySelectorAll('.aviso-linea').forEach(linea => {
        linea.querySelector('.aviso-texto').textContent = t(linea.dataset.texto);
    });
}

export function activarAvisosDeAyuda() {
    const hayAvisos = registrarVisitaDeAvisos(); // (también cuenta la visita, así que se llama siempre)
    // Cómo se acomodan los carteles vale para todos, también para los que salen en visitas más allá de la sexta (el de la inclinación)
    document.addEventListener('zoom-cambio', avisosSobreElZoom);
    window.addEventListener('resize', ubicarAvisos);
    // La barra también cambia de alto sin que cambie la ventana (por ejemplo, cuando el bloque de carga desaparece)
    if ('ResizeObserver' in window) new ResizeObserver(ubicarAvisos).observe(document.getElementById('navbar'));
    if (!hayAvisos) return; // ya entró más de 6 veces: no hace falta ninguno de los avisos de cómo se usa la página
    activarAvisoCombate();
    activarAvisoZoom();
    activarAvisoGestosDelZoom();
}

// Con la carta ya ampliada: cómo cerrarla y cómo pasar a otra (los gestos de los que no hay ninguna pista a la vista, porque en pantallas
// táctiles el textito de "Esc para cerrar" no se muestra). Solo pantallas táctiles, y una sola vez por visita: si la persona cierra la
// carta antes de que entre, todavía no lo vio y sale con la próxima que amplíe.
function activarAvisoGestosDelZoom() {
    if (!CON_DEDO.matches) return;
    let yaSeMostro = avisoHecho('gestos'); // también si salió en una visita anterior
    let enZoom = false; // hay una carta ampliada (y no se está cerrando)
    let espera = 0;
    let temporizador = 0;
    let avisos = []; // un cartelito por consejo (los que están a la vista)

    const cerrar = () => {
        clearTimeout(espera);
        clearTimeout(temporizador);
        avisos.forEach(quitarAviso);
        avisos = [];
    };

    document.addEventListener('zoom-cambio', () => {
        const abierto = !!cartaEnZoom && !zoomCerrando;
        if (abierto === enZoom) return; // también sale al pasar de una carta a otra o al girar el celular: no es un zoom nuevo
        enZoom = abierto;
        if (!abierto) {
            // se cerró la carta: lo que cuenta ya no sirve
            cerrar();
            return;
        }
        if (yaSeMostro) return;
        espera = setTimeout(() => {
            if (!enZoom || yaSeMostro) return;
            yaSeMostro = true;
            marcarAvisoHecho('gestos');
            // Dos cartelitos separados (cerrar, y pasar a otra carta), uno debajo del otro: no una sola burbuja con dos líneas
            avisos = [
                { clave: 'cerrar', icono: '👆', texto: 'aviso.zoom.cerrar' },
                { clave: 'deslizar', icono: '↔️', texto: 'aviso.zoom.deslizar' },
            ].map(consejo => {
                const aviso = crearAviso(`aviso-gestos-zoom-${consejo.clave}`, [consejo]);
                escribirAviso(aviso);
                ponerAviso(aviso);
                return aviso;
            });
            temporizador = setTimeout(cerrar, AVISO_GESTOS_DURACION);
        }, AVISO_GESTOS_ESPERA);
    });
    document.addEventListener('idioma-cambiado', () => avisos.forEach(escribirAviso));
}

// Cartel de ayuda de la inclinación con el mouse (solo computadora: existe únicamente si hay inclinación con el mouse, o sea, el botón de la
// barra está a la vista). Es un globito que sale del propio botón y cuenta que se puede anular la inclinación manteniendo apretada Shift y que
// ese botón la invierte; mientras sale, el botón salta y lanza ondas (la misma llamada que el botón de sonido en su primer sonido: "llamando").
// Una sola vez por sesión del navegador. Cuándo sale depende de cuántas sesiones lleva la persona en la página (el mismo contador de visitas
// de los avisos de ayuda), y es cada vez más tarde:
//     sesiones 1 a 5:   a los 15 s de inclinación acumulada   (con la inclinación invertida: a los 20 s de cargar la página)
//     sesiones 6 a 9:   a los 45 s                            (55 s)
//     sesiones 10 a 14: a 1:20 min                            (1:35 min)
//     de la 15 en adelante: no sale más
// Con la inclinación invertida las cartas casi no se inclinan (solo con Shift), así que ahí no se espera a que se inclinen: sale a los tantos
// segundos de haber cargado la página. Si la persona ya mostró que conoce Shift (la mantuvo apretada más de 3 s o la apretó más de 2 veces
// con el mouse sobre las cartas, en esta visita o en otra), el cartel no la explica: solo habla del botón. Si hace clic en el botón, ya lo
// encontró: el cartel deja de hacer falta en lo que queda de la sesión.
const INCLINACION_AVISO_SESION = 'digimon-aviso-inclinacion'; // sessionStorage: en esta sesión ya salió
const INCLINACION_ANIMACION_SOLA_SESION = 'digimon-animacion-inclinacion-sola'; // sessionStorage: animación sola ya salió
const INCLINACION_AVISO_TRAMOS = [
    // de la sesión más alta a la más baja: vale el primero cuyo "desde" no supera el número de sesión
    { desde: 10, acumulado: 80000, carga: 95000 }, // ms de inclinación acumulada, y ms desde la carga si está invertida
    { desde: 6, acumulado: 45000, carga: 55000 },
    { desde: 1, acumulado: 15000, carga: 20000 },
];
const INCLINACION_AVISO_ULTIMA_SESION = 14;
const INCLINACION_AVISO_DURACION = 10000; // ms a la vista (explica Shift y el botón)
const INCLINACION_AVISO_DURACION_BREVE = 7000; // ms a la vista (solo el botón)
const SHIFT_CONOCIDA_TIEMPO = 3000; // la conoce si la mantuvo apretada más de 3 s...
const SHIFT_CONOCIDA_VECES = 2; // ...o la apretó más de 2 veces

function inclinacionAvisoYaSalio() {
    return hayMarcaDeSesion(INCLINACION_AVISO_SESION);
}

function inclinacionAnimacionSolaYaSalio() {
    return hayMarcaDeSesion(INCLINACION_ANIMACION_SOLA_SESION);
}

function marcarInclinacionAnimacionSolaHecha() {
    ponerMarcaDeSesion(INCLINACION_ANIMACION_SOLA_SESION);
}

export function activarAvisoDeInclinacion() {
    const boton = document.getElementById('inclinacion-invertida');
    if (!boton || boton.hidden) return; // sin inclinación con el mouse (celular, o "reducir movimiento") no hay nada que contar
    const sesion = memoriaAvisos.visitas;
    const tramo = INCLINACION_AVISO_TRAMOS.find(({ desde }) => sesion >= desde) ?? INCLINACION_AVISO_TRAMOS.at(-1);
    const estaInvertida = () => boton.getAttribute('aria-pressed') === 'true';
    const invertidaAlCargar = estaInvertida();

    let terminado = sesion > INCLINACION_AVISO_ULTIMA_SESION || inclinacionAvisoYaSalio(); // ya salió, o ya no hace falta el cartel
    let esperaCarga = 0; // modo invertido: desde la carga de la página
    let esperaTilt = 0; // modo normal: cuando la inclinación acumulada llega al tiempo
    let reintento = 0;

    // --- ¿La persona ya sabe usar Shift con las cartas? Cuenta solo con el mouse sobre las cartas (no cuando escribe mayúsculas en un campo) ---
    let sobreLasCartas = false;
    let shiftDesde = 0; // desde cuándo la mantiene apretada sobre las cartas (0: no la mantiene)
    let shiftTiempo = 0; // ms que la mantuvo apretada sobre las cartas
    let shiftVeces = 0; // veces que la apretó sobre las cartas

    const conoceShift = () => {
        const tiempo = shiftTiempo + (shiftDesde ? performance.now() - shiftDesde : 0);
        if (tiempo > SHIFT_CONOCIDA_TIEMPO || shiftVeces > SHIFT_CONOCIDA_VECES) marcarAvisoHecho('shift'); // queda guardado: ya la conoce
        return avisoHecho('shift');
    };

    const soltarShift = () => {
        if (!shiftDesde) return;
        shiftTiempo += performance.now() - shiftDesde;
        shiftDesde = 0;
        conoceShift();
    };

    listaDigimons.addEventListener('pointermove', evento => {
        if (evento.pointerType === 'touch') return;
        sobreLasCartas = true;
        if (!evento.shiftKey)
            soltarShift(); // (también corrige si se soltó fuera de la ventana y no nos enteramos)
        else if (!shiftDesde) shiftDesde = performance.now(); // llegó a las cartas con Shift ya apretada
    });
    listaDigimons.addEventListener('pointerleave', () => {
        sobreLasCartas = false;
        soltarShift();
    });
    window.addEventListener('blur', soltarShift);
    document.addEventListener('keydown', evento => {
        if (evento.key !== 'Shift' || evento.repeat || !sobreLasCartas) return;
        if (document.activeElement?.matches?.('input, textarea, select')) return;
        shiftVeces += 1;
        if (!shiftDesde) shiftDesde = performance.now();
        conoceShift();
    });
    document.addEventListener('keyup', evento => {
        if (evento.key === 'Shift') soltarShift();
    });

    // --- El cartel: un globito que sale del botón (ver "LLAMADA DE LOS BOTONES REDONDOS"). Al tocar el botón se va ---
    const mostrar = () => {
        clearTimeout(reintento);
        if (terminado) return;
        // Con la pestaña en segundo plano nadie vería el botón, así que se espera. El zoom, el combate y los carteles de información ya no hacen
        // esperar (el botón sube por encima), ni tampoco el globito del botón de sonido (si coinciden, se reparten a los costados)
        if (document.hidden) {
            reintento = setTimeout(mostrar, 500);
            return;
        }
        terminado = true;
        clearTimeout(esperaCarga);
        clearTimeout(esperaTilt);
        ponerMarcaDeSesion(INCLINACION_AVISO_SESION);
        marcarInclinacionAnimacionSolaHecha();
        const sabeShift = conoceShift();
        const clave = `aviso.inclinacion.${estaInvertida() ? 'invertida' : 'normal'}${sabeShift ? '.boton' : ''}`; // (la variante queda fija aunque se invierta mientras está)
        llamarLaAtencion(boton, {
            icono: '🖱️',
            texto: () => t(clave),
            duracion: sabeShift ? INCLINACION_AVISO_DURACION_BREVE : INCLINACION_AVISO_DURACION,
        });
    };

    // Solo la animación del botón (saltos y ondas), por única vez por sesión, sin el cartel
    const animarBotonSinCartel = () => {
        if (inclinacionAnimacionSolaYaSalio()) return;
        marcarInclinacionAnimacionSolaHecha();
        if (llamadasActivas.has(boton)) return;

        let devolver = null;
        if (boton.parentElement !== document.body && hayCortinaSobreLaBarra()) {
            devolver = subirBotonSobreLaCortina(boton);
        }
        let vigiliaAnim = 0;
        const vigilarCortinaAnim = () => {
            const tapada = hayCortinaSobreLaBarra();
            if (!devolver && boton.parentElement !== document.body && tapada) {
                devolver = subirBotonSobreLaCortina(boton);
            } else if (devolver && !tapada) {
                devolver();
                devolver = null;
            }
            vigiliaAnim = requestAnimationFrame(vigilarCortinaAnim);
        };
        vigiliaAnim = requestAnimationFrame(vigilarCortinaAnim);

        boton.classList.remove('llamando');
        void boton.offsetWidth;
        boton.classList.add('llamando');

        setTimeout(() => {
            cancelAnimationFrame(vigiliaAnim);
            boton.classList.remove('llamando');
            devolver?.();
            devolver = null;
        }, AUDIO_AVISO_DURACION);
    };

    // Tercera condición de aparición: clic en los botones inferiores del frente de la carta (tipo o elemento).
    // Si el cartel aún no salió en la sesión, sale con el cartel; si ya había pasado, sale solo la animación del botón.
    document.addEventListener('click-chip-carta', () => {
        if (!terminado && !inclinacionAvisoYaSalio()) {
            mostrar();
        } else {
            animarBotonSinCartel();
        }
    });

    // --- Cuándo: con la inclinación normal, al juntar el tiempo de inclinación con el mouse; con la invertida, a los tantos segundos de cargar ---
    let inclinando = false; // hay una carta inclinándose con el mouse (la que se inclina con el dedo no cuenta)
    let acumulado = 0; // ms de inclinación con el mouse en esta carga de la página
    let desde = 0; // desde cuándo corre el tramo de inclinación de ahora (0: no corre)

    const sumarTramo = () => {
        if (!desde) return;
        acumulado += performance.now() - desde;
        desde = 0;
        clearTimeout(esperaTilt);
    };

    const empezarTramo = () => {
        if (desde || terminado || invertidaAlCargar) return;
        desde = performance.now();
        esperaTilt = setTimeout(mostrar, Math.max(0, tramo.acumulado - acumulado));
    };

    document.addEventListener('inclinacion-cambio', evento => {
        // lo avisa activarInclinacion
        inclinando = evento.detail.activa && !inclinandoConDedo;
        if (inclinando) empezarTramo();
        else sumarTramo();
    });
    // Con la pestaña en segundo plano no se cuenta
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) sumarTramo();
        else if (inclinando) empezarTramo();
    });
    if (!terminado && invertidaAlCargar) esperaCarga = setTimeout(mostrar, tramo.carga);

    // Hizo clic en el botón: ya lo encontró
    boton.addEventListener('click', () => {
        terminado = true;
        clearTimeout(esperaCarga);
        clearTimeout(esperaTilt);
        clearTimeout(reintento);
        terminarLlamada(boton);
        marcarInclinacionAnimacionSolaHecha();
    });
}

// Cartel del zoom extra (solo computadora): al ampliar la primera carta de la sesión cuenta, en una línea, que con el mouse sobre la carta la
// rueda hacia arriba la agranda todavía más y hacia abajo vuelve (ver "ZOOM EXTRA"). Una sola vez por sesión del navegador (si se cierra la
// carta antes de que entre, todavía no lo vio y sale con la próxima), y solo en las primeras 5 sesiones de la persona (el mismo contador de
// visitas de los avisos de ayuda): a partir de la sexta no sale más. Se va si la persona hace lo que cuenta, o al cerrar la carta.
const ZOOM_EXTRA_AVISO_SESION = 'digimon-aviso-zoom-extra'; // sessionStorage: en esta sesión ya salió
const ZOOM_EXTRA_AVISO_ULTIMA_SESION = 5;
const ZOOM_EXTRA_AVISO_ESPERA = 1500; // ms desde que se abre el zoom (la carta llega al centro a los 0,7 s)
const ZOOM_EXTRA_AVISO_DURACION = 8000; // ms a la vista

export function activarAvisoDeZoomExtra() {
    if (!CON_MOUSE.matches) return; // en celular no
    if (memoriaAvisos.visitas > ZOOM_EXTRA_AVISO_ULTIMA_SESION) return;
    let salio = hayMarcaDeSesion(ZOOM_EXTRA_AVISO_SESION);
    let enZoom = false; // hay una carta ampliada (y no se está cerrando)
    let espera = 0;
    let cierre = 0;
    let aviso = null;

    const cerrar = () => {
        clearTimeout(espera);
        clearTimeout(cierre);
        if (aviso) quitarAviso(aviso);
        aviso = null;
    };

    document.addEventListener('zoom-cambio', () => {
        const abierto = !!cartaEnZoom && !zoomCerrando;
        if (abierto === enZoom) return; // también sale al pasar de una carta a otra: no es un zoom nuevo
        enZoom = abierto;
        if (!abierto) {
            // se cerró la carta: lo que cuenta ya no sirve
            cerrar();
            return;
        }
        if (salio) return;
        espera = setTimeout(() => {
            if (!enZoom || salio) return;
            salio = true;
            ponerMarcaDeSesion(ZOOM_EXTRA_AVISO_SESION);
            aviso = crearAviso('aviso-zoom-extra', [{ clave: 'zoom-extra', icono: '🔍', texto: 'aviso.zoomExtra' }]);
            escribirAviso(aviso);
            ponerAviso(aviso);
            cierre = setTimeout(cerrar, ZOOM_EXTRA_AVISO_DURACION);
        }, ZOOM_EXTRA_AVISO_ESPERA);
    });
    document.addEventListener('zoom-extra', () => {
        // ya lo está haciendo: el cartel se va
        if (zoomExtra) cerrar();
    });
    document.addEventListener('idioma-cambiado', () => escribirAviso(aviso));
}

// Primero: qué hay que hacer. Solo en celular (hasta 700px, donde la consigna queda escondida dentro del menú ☰)
function activarAvisoCombate() {
    let aviso = null;
    let temporizador = 0;
    let cerrado = false;
    let secuenciaFinalizada = false;

    const finalizarSecuencia = () => {
        if (secuenciaFinalizada) return;
        secuenciaFinalizada = true;
        emitir('aviso-combate-finalizado');
    };

    const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        clearTimeout(temporizador);
        if (aviso) {
            quitarAviso(aviso);
            aviso = null;
            setTimeout(finalizarSecuencia, 600); // esperar que termine la animación de salida antes del siguiente consejo
        } else {
            finalizarSecuencia();
        }
    };

    const mostrar = () => {
        if (cerrado || aviso) return;
        if (!PANTALLA_DE_CELULAR.matches || avisoHecho('combate') || seleccionados.length >= 2) {
            // en computadora ya se ve en la barra; si ya eligió las 2 (ahora o en otra visita), no hay nada que pedirle
            cerrado = true;
            finalizarSecuencia();
            return;
        }
        aviso = crearAviso('aviso-combate', [{ clave: 'combate', icono: '⚔️', texto: 'combate.consigna' }]);
        escribirAviso(aviso);
        ponerAviso(aviso);
        temporizador = setTimeout(cerrar, AVISO_COMBATE_DURACION);
    };

    document.addEventListener('carta-agregada', () => setTimeout(mostrar, AVISO_COMBATE_ESPERA), { once: true });
    document.addEventListener('seleccion-cambio', () => {
        if (seleccionados.length < 2) return;
        marcarAvisoHecho('combate'); // ya eligió las 2
        cerrar();
    });
    document.addEventListener('idioma-cambiado', () => escribirAviso(aviso));
}

// Después: cómo ampliar una carta (y en pantallas táctiles, cómo inclinarla y darla vuelta). Cada consejo es un cartelito aparte:
// se apilan (el primero arriba), tienen su propio tiempo y cada uno se va cuando la persona ya hizo lo que cuenta.
function activarAvisoZoom() {
    const conDedo = CON_DEDO.matches;
    // "clave" es lo que la persona tiene que hacer; "texto" es la clave de la traducción
    const consejos = conDedo
        ? [
              { clave: 'zoom', icono: '👆', texto: 'aviso.zoom.dedos' },
              { clave: 'inclinar', icono: '✨', texto: 'aviso.inclinar.dedo' },
              { clave: 'voltear', icono: '↔️', texto: 'aviso.voltear.dedo' },
          ]
        : [{ clave: 'zoom', icono: '💡', texto: 'aviso.zoom.mouse' }];
    const hecho = new Set(consejos.map(consejo => consejo.clave).filter(avisoHecho)); // lo que la persona ya hizo (también en visitas anteriores)
    const avisos = new Map(); // clave del consejo -> su cartelito (los que están a la vista)
    const temporizadores = new Map();
    let cerrado = false;

    const quitar = clave => {
        const aviso = avisos.get(clave);
        if (!aviso) return;
        clearTimeout(temporizadores.get(clave));
        temporizadores.delete(clave);
        avisos.delete(clave);
        quitarAviso(aviso);
        if (!avisos.size) cerrado = true;
    };

    // La persona hizo lo que cuenta ese consejo: su cartelito se va (el otro se queda)
    const yaLoHizo = clave => {
        hecho.add(clave);
        marcarAvisoHecho(clave);
        quitar(clave);
    };

    const mostrar = () => {
        if (cerrado || avisos.size) return;
        const pendientes = consejos.filter(consejo => !hecho.has(consejo.clave));
        if (!pendientes.length) {
            cerrado = true; // ya hizo todo: no hay nada que contarle
            return;
        }
        pendientes.forEach(consejo => {
            const aviso = crearAviso(`aviso-zoom-${consejo.clave}`, [consejo]);
            escribirAviso(aviso);
            ponerAviso(aviso);
            avisos.set(consejo.clave, aviso);
            const duracion = conDedo ? AVISO_ZOOM_DURACION_DEDO + (consejo.clave === 'voltear' ? AVISO_VOLTEAR_DURACION_EXTRA : 0) : AVISO_ZOOM_DURACION;
            temporizadores.set(
                consejo.clave,
                setTimeout(() => quitar(consejo.clave), duracion),
            );
        });
    };

    // En móvil, los consejos aparecen después del cartel de selección para que no se solapen.
    // En computadora, solo hay un aviso y conserva su espera desde la primera carta.
    if (conDedo) {
        document.addEventListener(
            'aviso-combate-finalizado',
            () => {
                setTimeout(mostrar, AVISO_ZOOM_ESPERA_DEDO);
            },
            { once: true },
        );
    } else {
        document.addEventListener('carta-agregada', () => setTimeout(mostrar, AVISO_ZOOM_ESPERA), { once: true });
    }
    document.addEventListener('zoom-cambio', () => {
        if (cartaEnZoom) yaLoHizo('zoom'); // hay una carta ampliada (o cerrándose): ya sabe cómo hacerlo
    });
    document.addEventListener('inclinacion-con-dedo', () => yaLoHizo('inclinar')); // lo avisa activarInclinacionConDedo
    document.addEventListener('flip-con-dedo', () => yaLoHizo('voltear'));
    document.addEventListener('idioma-cambiado', () => avisos.forEach(escribirAviso));
}

// -----------------------------------------------------------------------------------------------------------------
// LLAMADA DE LOS BOTONES REDONDOS (sonido e inclinación): cuando el botón salta y lanza ondas ("llamando"), de él sale un globito con una
// flechita (como el del contador de cartas elegidas) que cuenta para qué sirve. Mientras dura, en computadora el botón tiene que verse y
// poder tocarse aunque haya algo encima de la barra: el zoom de una carta, un cartel del combate o uno de información (todos son una cortina
// oscura y desenfocada por encima de ella). Si lo hay, el botón sale un momento de la barra y queda por encima de la cortina, en el mismo
// lugar de la pantalla (en la barra se deja un hueco del mismo tamaño para que nada se corra); al terminar, vuelve a su lugar. No importa
// cuándo aparezca la cortina: se mira cuadro a cuadro mientras dura la llamada. En celular el botón de sonido ya flota por encima de todo
// y el de inclinación no existe, así que ahí solo está el globito.
// -----------------------------------------------------------------------------------------------------------------
const GLOBO_DEL_BOTON_DURACION = 7000; // ms a la vista (el de inclinación elige el suyo: explica más)
const GLOBO_DEL_BOTON_DURACION_DOBLE = 16000; // ms: si coinciden dos carteles (ej. sonido e inclinación al voltear), más tiempo para leer ambos

// ¿Hay algo por encima de la barra? El zoom de una carta (#zoom-fondo) o un cartel de SweetAlert (los del combate y los de información)
const hayCortinaSobreLaBarra = () => !!(cartaEnZoom || combateEnCurso || document.querySelector('#zoom-fondo, .swal2-container'));

// Saca el botón de la barra y lo deja por encima de la cortina. Devuelve la función que lo vuelve a su lugar.
function subirBotonSobreLaCortina(boton) {
    const caja = boton.getBoundingClientRect();
    const teniaElFoco = document.activeElement === boton;
    const computed = getComputedStyle(boton);
    const hueco = document.createElement('span');
    hueco.setAttribute('aria-hidden', 'true');
    hueco.dataset.hueco = boton.id; // (el CSS de la barra lo cuenta como si el botón siguiera ahí)
    hueco.style.cssText = `flex: none; width: ${caja.width}px; height: ${caja.height}px; margin: ${computed.margin}; order: ${computed.order};`;
    boton.parentElement.insertBefore(hueco, boton);
    document.body.append(boton);
    if (teniaElFoco) boton.focus({ preventScroll: true });
    // Mientras está afuera acompaña al hueco cuadro a cuadro: si la barra se acomoda (por ejemplo, termina de cargar), no se despega
    let cuadro;
    const acompañar = () => {
        if (!hueco.isConnected) return;
        const lugar = hueco.getBoundingClientRect();
        boton.style.top = `${lugar.top}px`;
        boton.style.left = `${lugar.left}px`;
        cuadro = requestAnimationFrame(acompañar);
    };
    acompañar();
    return () => {
        cancelAnimationFrame(cuadro);
        const tieneElFoco = document.activeElement === boton;
        if (hueco.isConnected) {
            hueco.replaceWith(boton);
        } else {
            if (boton.id === 'silenciar') ubicarBotonDeAudio();
        }
        boton.style.removeProperty('top');
        boton.style.removeProperty('left');
        if (tieneElFoco) boton.focus({ preventScroll: true });
    };
}

const llamadasActivas = new Map(); // botón → { globo, devolver, temporizador }: los botones que están llamando la atención ahora
let vigiliaDeLlamadas = 0; // pedido de animationFrame pendiente

// Dónde va el globito: debajo del botón si está en la mitad de arriba de la pantalla (la barra) y arriba de él si está en la de abajo (el botón de
// sonido flotante del celular), con la flechita justo sobre el botón (el globito se corre para no salirse de la pantalla).
// "lado" dice cómo se acomoda respecto del botón: 'centro' (lo normal: centrado en él), o, cuando los dos botones redondos llaman a la vez
// y sus globitos se taparían, 'izquierda' (el globito se extiende hacia la izquierda, con la flechita en su punta derecha) y 'derecha'
// (al revés): así caben los dos uno al lado del otro, cada uno con la flechita sobre su botón.
// (La caja del botón se mide por su centro y su tamaño de reposo: mientras llama se agranda y se mueve, y el globito no tiene que bailar con él.)
const GLOBO_PUNTA_AL_BORDE = 28; // px entre la flechita y el borde del globito cuando se acomoda a un costado

function ubicarGloboDelBoton(boton, globo, lado = 'centro') {
    const margen = 8;
    const caja = boton.getBoundingClientRect();
    const ancho = globo.offsetWidth;
    const alto = globo.offsetHeight;
    const centro = caja.left + caja.width / 2;
    const centroVertical = caja.top + caja.height / 2;
    const mitadDelAlto = boton.offsetHeight / 2;
    let izquierda = centro - ancho / 2;
    if (lado === 'izquierda') izquierda = centro + GLOBO_PUNTA_AL_BORDE - ancho;
    else if (lado === 'derecha') izquierda = centro - GLOBO_PUNTA_AL_BORDE;
    izquierda = Math.round(Math.max(margen, Math.min(izquierda, window.innerWidth - ancho - margen)));
    const debajo = centroVertical < window.innerHeight / 2;
    const separacion = PANTALLA_DE_CELULAR.matches ? 12 : 15;
    const arriba = Math.round(debajo ? centroVertical + mitadDelAlto + separacion : centroVertical - mitadDelAlto - separacion - alto);
    const punta = `${Math.round(centro - izquierda)}px`;
    if (globo.style.left !== `${izquierda}px`) globo.style.left = `${izquierda}px`;
    if (globo.style.top !== `${arriba}px`) globo.style.top = `${arriba}px`;
    if (globo.style.getPropertyValue('--punta') !== punta) globo.style.setProperty('--punta', punta);
    globo.classList.toggle('sobre-el-boton', !debajo);
}

export function revisarLlamadas() {
    const tapada = hayCortinaSobreLaBarra();
    for (const [boton, llamada] of llamadasActivas) {
        if (!boton.isConnected) {
            terminarLlamada(boton);
            continue;
        }
        // Algo tapa la barra (o apareció justo ahora): el botón sube por encima. Solo si está en la barra: en celular, el de sonido ya flota
        if (!llamada.devolver && boton.parentElement !== document.body && tapada) {
            llamada.devolver = subirBotonSobreLaCortina(boton);
        } else if (llamada.devolver && !tapada) {
            // Se cerró la cortina (el zoom o el cartel): el botón vuelve inmediatamente a su lugar en la barra
            llamada.devolver();
            llamada.devolver = null;
        }
    }
    // Si los dos botones llaman a la vez, los globitos se reparten a los costados (el del botón de la izquierda hacia la izquierda y el otro
    // hacia la derecha) para no taparse; si no, cada uno va centrado en su botón
    const llamadas = [...llamadasActivas];
    if (llamadas.length > 1) llamadas.sort(([a], [b]) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    llamadas.forEach(([boton, llamada], i) => {
        ubicarGloboDelBoton(boton, llamada.globo, llamadas.length < 2 ? 'centro' : i === 0 ? 'izquierda' : 'derecha');
    });
}

function vigilarLlamadas() {
    vigiliaDeLlamadas = 0;
    revisarLlamadas();
    if (llamadasActivas.size) vigiliaDeLlamadas = requestAnimationFrame(vigilarLlamadas);
}

function escribirGloboDelBoton(llamada) {
    llamada.globo.querySelector('.aviso-texto').textContent = llamada.texto();
}

// El botón salta y lanza ondas (animación "llamando", 2,6 s) y sale el globito: "icono" va antes del texto y "texto" es una función que
// devuelve la explicación en el idioma de ahora. El globito (y el botón arriba de la cortina, si hace falta) dura "duracion" ms.
export function llamarLaAtencion(boton, { icono, texto, duracion = GLOBO_DEL_BOTON_DURACION }) {
    terminarLlamada(boton);

    const globo = document.createElement('div');
    globo.className = 'aviso-globo';
    globo.setAttribute('role', 'status');
    globo.innerHTML = '<span class="aviso-icono" aria-hidden="true"></span><span class="aviso-texto"></span>';
    globo.querySelector('.aviso-icono').textContent = icono;
    document.body.appendChild(globo);

    const llamada = { globo, texto, devolver: null, temporizador: 0, finDeLaAnimacion: 0 };
    llamadasActivas.set(boton, llamada);
    escribirGloboDelBoton(llamada);
    revisarLlamadas(); // (si ya hay una cortina, el botón sube ahora mismo, antes de que se dibuje el siguiente cuadro)

    boton.classList.remove('llamando');
    void boton.offsetWidth; // para que la animación arranque de cero
    boton.classList.add('llamando');
    llamada.finDeLaAnimacion = setTimeout(() => boton.classList.remove('llamando'), AUDIO_AVISO_DURACION);
    llamada.temporizador = setTimeout(() => terminarLlamada(boton), Math.max(duracion, AUDIO_AVISO_DURACION));

    // Si coinciden dos o más carteles a la vez (por ejemplo, el primer sonido de la sesión es voltear una carta,
    // disparando a la vez el aviso de silenciar y el de tilt/shift), dejamos ambos carteles más tiempo para darle al usuario tiempo de leer ambos
    if (llamadasActivas.size > 1) {
        for (const [b, l] of llamadasActivas) {
            clearTimeout(l.temporizador);
            l.temporizador = setTimeout(() => terminarLlamada(b), GLOBO_DEL_BOTON_DURACION_DOBLE);
        }
    }

    void globo.offsetWidth; // para que la entrada se anime
    globo.classList.add('visible');
    if (!vigiliaDeLlamadas) vigiliaDeLlamadas = requestAnimationFrame(vigilarLlamadas);
}

// Termina la llamada del botón (se cumplió el tiempo, o la persona ya lo encontró): se apaga la animación, el globito se achica hacia el
// botón y, si estaba por encima de una cortina, vuelve a la barra
export function terminarLlamada(boton) {
    const llamada = llamadasActivas.get(boton);
    if (!llamada) return;
    llamadasActivas.delete(boton);
    clearTimeout(llamada.temporizador);
    clearTimeout(llamada.finDeLaAnimacion);
    boton.classList.remove('llamando');
    llamada.devolver?.();
    llamada.globo.classList.remove('visible');
    setTimeout(() => llamada.globo.remove(), 500);
}

document.addEventListener('idioma-cambiado', () => llamadasActivas.forEach(escribirGloboDelBoton));
