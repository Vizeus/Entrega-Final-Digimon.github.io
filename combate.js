// -----------------------------------------------------------------------------------------------------------------
// COMBATE
//
// Elegir los 2 digimons (el contador de la barra), calcular quién gana (atributo + nivel + elemento) y los tres carteles del
// combate (preparando → peleando → ganador).
// -----------------------------------------------------------------------------------------------------------------

import { emitir, ponerAyuda } from './util.js';
import { ELEMENTO_FUERTE_CONTRA, ATRIBUTO_FUERTE_CONTRA } from './datos.js';
import { t } from './i18n.js';
import { nombreDeAtaque } from './nombres.js';
import { conCruzDeCierre } from './ventanas.js';
import { botonIniciarCombate, contadorSeleccion } from './pagina.js';
import {
    AVISO_CONTADOR_ESPERA,
    avisarDeLaMusicaDelCombate,
    mostrarAvisoDelContador,
    musicaDelCombateYaConocida,
    quitarAvisoDelContador,
    revisarLlamadas,
} from './avisos.js';
import { nombreCompleto, reducirMovimiento } from './cartas.js';
import { sonidoSeleccion } from './sonidos.js';
import { TECLAS_DE_DESPLAZAMIENTO, zonaConScroll } from './zoom.js';
import {
    alternarMusicaDelCombate,
    arrancarGifConSorbo,
    audioMouse,
    musicaDelCombate,
    cancelarMusicaGanador,
    detenerSonido,
    detenerSonidoPajita,
    precargarPajita,
    prepararPajita,
    reproducirConDelay,
    reproducirPajita,
    reproducirSonido,
    musicaDelCombateSuena,
    musicaDelGanador,
    fanfarriaDeVictoria,
    cancelarGritoDeVictoria,
    reproducirGritoConDelay,
} from './audio.js';

// -----------------------------------------------------------------------------------------------------------------
// SISTEMA DE COMBATE: la probabilidad de ganar combina ATRIBUTO + NIVEL + ELEMENTO
//
//   probabilidad = 50% + (ventaja de atributo × 20%) + (diferencia de nivel × 15%) + (ventaja de elemento × 10%)
//
// Con esto, una doble ventaja (atributo + elemento = +30%) compensa justo 2 niveles de diferencia (2 × 15%).
// Los niveles 7 y 8 rompen esa escala: pesan mucho más (PODER_EN_COMBATE) y contra ellos casi no sirve el atributo ni el elemento.
// -----------------------------------------------------------------------------------------------------------------

// Cuánto pesa cada factor
export const PESO_ATRIBUTO = 0.2;
export const PESO_NIVEL = 0.15;
export const PESO_ELEMENTO = 0.1;

// Poder en combate: del 1 al 6 es el mismo número que se ve en la carta, pero los niveles 7 y 8 rompen la escala.
// Del 6 al 7 y del 7 al 8 hay 3 niveles de distancia (6 → 9 → 12): un Mega apenas le puede hacer cosquillas a un Ultra
// (lo mismo que un Ultra a un Absolute), y entre un Mega y un Absolute la diferencia es tan grande que no tiene forma de ganar.
export const PODER_EN_COMBATE = { 7: 9, 8: 12 };
const poderEnCombate = nivel => PODER_EN_COMBATE[nivel] ?? nivel;

// Si uno de los dos es nivel 7 u 8 y el otro está muy por debajo, el atributo y el elemento valen cada vez menos:
// hasta 1,5 niveles de diferencia valen todo; más allá valen 1,5 ÷ diferencia (con 3 niveles de diferencia, la mitad).
const ALCANCE_VENTAJAS = 1.5;

// Devuelve +1 si "a" tiene ventaja sobre "b", -1 si "b" tiene ventaja sobre "a", y 0 si están parejos
function calcularVentaja(tabla, a, b) {
    const aVenceAb = tabla[a]?.includes(b) ? 1 : 0;
    const bVenceAa = tabla[b]?.includes(a) ? 1 : 0;
    return aVenceAb - bVenceAa;
}

// Array para almacenar los elementos seleccionados
export const seleccionados = [];

// Función para manejar el boton de combate
export function verificarSeleccion() {
    if (seleccionados.length > 0) precargarPajita(); // el GIF y el sonido del primer cartel de combate se bajan mientras eligen
    contadorSeleccion.textContent = `${seleccionados.length}/2`;
    contadorSeleccion.classList.toggle('completo', seleccionados.length === 2);
    mostrarAyudaDelContador();
    dibujarElegidosEnMiniatura();
    botonIniciarCombate.disabled = seleccionados.length !== 2;
    // El color del botón (verde si se puede pelear, gris si no) y su latido cada 2 s (solo mientras se puede pelear) los pone el CSS según :disabled
    emitir('seleccion-cambio'); // el aviso de ayuda del inicio se va cuando ya eligió las 2
}

// Las cartas elegidas, en miniatura entre el contador y el botón de combate: la imagen del digimon con los colores de su carta (el color del atributo,
// el tono del nivel y el marco de los niveles altos, que se copian de la carta tal cual están). Los dos lugares están siempre; el que no tiene carta queda vacío
function dibujarElegidosEnMiniatura() {
    const lugares = document.querySelectorAll('#elegidos-miniatura .mini-carta');
    lugares.forEach((lugar, i) => {
        // (una carta recién elegida deja su lugar vacío hasta que llega volando: ver prepararVueloAlStage)
        const carta = esperandoLaMiniatura.has(seleccionados[i]) ? undefined : seleccionados[i];
        lugar.replaceChildren();
        lugar.classList.toggle('con-carta', Boolean(carta));
        // Niveles 7 y 8: marco que gira (ver .c-marco en _cartas.scss), también en miniatura
        const conMarco = Number(carta?.dataset.nivel) >= 7;
        lugar.classList.toggle('con-marco', conMarco);
        lugar.dataset.nivel = conMarco ? carta.dataset.nivel : '';
        lugar.removeAttribute('title');
        lugar.classList.toggle('sin-entrada', Boolean(carta) && llegaronVolando.has(carta)); // (la que llegó volando no "cae" otra vez en su lugar)
        if (!carta) return;
        copiarColoresDeLaCarta(lugar, carta, conMarco);
        const origen = carta.querySelector('.c-arte img');
        const imagen = document.createElement('img');
        imagen.src = origen?.currentSrc || origen?.src || '';
        imagen.alt = '';
        imagen.draggable = false;
        lugar.title = `${nombreCompleto(carta)} · ${t('combate.mini.quitar')}`;
        lugar.append(imagen);
        if (conMarco) {
            const marco = document.createElement('span');
            marco.className = 'mini-marco';
            marco.setAttribute('aria-hidden', 'true');
            lugar.append(marco);
        }
    });
}

// Copia a la miniatura los colores de la carta tal cual están
// (el --aro de una carta con marco que gira es transparente mientras gira: la miniatura arma el suyo con los mismos colores)
function copiarColoresDeLaCarta(miniatura, carta, conMarco) {
    const estilo = getComputedStyle(carta);
    for (const variable of conMarco ? ['--base', '--fondo', '--colores-marco', '--vuelta-marco'] : ['--base', '--aro', '--fondo']) {
        miniatura.style.setProperty(variable, estilo.getPropertyValue(variable));
    }
}

// ---- La carta que vuela al panel de combate ------------------------------------------------------------------------------
// Al elegir una carta, la imagen de su carta se achica y vuela en arco hasta su lugar en el panel de combate de la barra, donde queda como miniatura.
// El vuelo no sale al instante: espera lo que dura un doble clic (ESPERA_DEL_VUELO). Si el segundo clic llega, la carta se amplía (zoom) y ese
// doble clic deshace la elección, y el vuelo se cancela sin haberse visto. Solo vuela donde se ven las miniaturas (no en el celular) y sin "reducir movimiento".
const ESPERA_DEL_VUELO = 300; // ms: lo que se tarda en hacer doble clic y que la carta empiece a ampliarse
const DURACION_DEL_VUELO = 640; // ms
const esperandoLaMiniatura = new Set(); // cartas elegidas cuya miniatura todavía no llegó (esperan el doble clic o están volando)
const llegaronVolando = new WeakSet(); // las cartas cuya miniatura llegó volando (para que no hagan además la animación de "caer")

const hayMiniaturasAlaVista = () => {
    const lugar = document.querySelector('#elegidos-miniatura .mini-carta');
    return Boolean(lugar) && lugar.getClientRects().length > 0;
};

// ¿Hay una ventana abierta o una carta ampliada (o ampliándose)? Con eso en pantalla, un vuelo recién arrancado quedaría fuera de lugar
const hayAlgoPorEncima = () =>
    document.querySelector('.swal2-container, #zoom-fondo, #listado-digimons .zoom-activa, #listado-digimons .zoom-midiendo') !== null;

// Se llama al elegir una carta, antes de dibujar las miniaturas: si va a volar, su lugar queda vacío hasta que llegue.
// Mientras espera, si se abre una ventana, se amplía una carta o se hace scroll, el vuelo se cancela: la miniatura aparece directamente en su lugar
export function prepararVueloAlStage(carta) {
    if (reducirMovimiento || !hayMiniaturasAlaVista()) return;
    esperandoLaMiniatura.add(carta);

    let temporizador = 0;
    const vigiaDeVentanas = new MutationObserver(() => hayAlgoPorEncima() && terminarLaEspera(false));
    const alHacerScroll = () => terminarLaEspera(false);
    const terminarLaEspera = puedeVolar => {
        clearTimeout(temporizador);
        vigiaDeVentanas.disconnect();
        window.removeEventListener('scroll', alHacerScroll);
        const sigueElegida = seleccionados.includes(carta) && hayMiniaturasAlaVista();
        if (puedeVolar && sigueElegida && !hayAlgoPorEncima()) {
            volarAlStage(carta);
            return;
        }
        // cancelado (o el doble clic la amplió y deshizo la elección): sin vuelo; si todavía está elegida, la miniatura aparece sin más
        esperandoLaMiniatura.delete(carta);
        dibujarElegidosEnMiniatura();
    };

    vigiaDeVentanas.observe(document.body, { childList: true }); // (ventanas y fondo del zoom se agregan al <body>)
    vigiaDeVentanas.observe(document.getElementById('listado-digimons'), { attributes: true, attributeFilter: ['class'], subtree: true }); // (la carta que se amplía)
    window.addEventListener('scroll', alHacerScroll, { passive: true });
    temporizador = setTimeout(() => terminarLaEspera(true), ESPERA_DEL_VUELO);
}

// Un punto de la curva de Bézier de tres puntos (a, control, b) en t
const sobreLaCurva = (a, control, b, t) => (1 - t) ** 2 * a + 2 * (1 - t) * t * control + t ** 2 * b;
const suavizar = t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2); // (empieza y termina despacio)

function volarAlStage(carta) {
    const lugares = document.querySelectorAll('#elegidos-miniatura .mini-carta');
    const lugar = lugares[seleccionados.indexOf(carta)];
    const barra = document.getElementById('navbar');
    const arte = carta.querySelector('.c-arte');
    const origen = arte?.getBoundingClientRect();
    if (!lugar || !origen || origen.width === 0) {
        aterrizarEnElStage(carta);
        return;
    }
    const destino = lugar.getBoundingClientRect();
    const marcoDeLaBarra = barra.getBoundingClientRect();
    const conMarco = Number(carta.dataset.nivel) >= 7;

    // La carta que vuela: una miniatura más (con los mismos colores), puesta en la barra para que pase por encima de todo, que parte del tamaño del arte
    const vuelo = document.createElement('div');
    vuelo.className = `mini-carta con-carta vuelo${conMarco ? ' con-marco' : ''}`;
    vuelo.dataset.nivel = conMarco ? carta.dataset.nivel : '';
    vuelo.setAttribute('aria-hidden', 'true');
    copiarColoresDeLaCarta(vuelo, carta, conMarco);
    const origenImg = carta.querySelector('.c-arte img');
    const imagen = document.createElement('img');
    imagen.src = origenImg?.currentSrc || origenImg?.src || '';
    imagen.alt = '';
    imagen.draggable = false;
    vuelo.append(imagen);
    barra.append(vuelo);

    // Desde el centro del arte hasta el centro de su lugar, en arco: primero sube y después se corre hacia el costado
    const centro = rect => [rect.left + rect.width / 2, rect.top + rect.height / 2];
    const [x0, y0] = centro(origen);
    const [x1, y1] = centro(destino);
    const control = [x0 + (x1 - x0) * 0.15, y1 + (y0 - y1) * 0.35];
    const giro = x1 >= x0 ? -1 : 1; // (se inclina hacia el lado de donde viene y se endereza al llegar)
    const PASOS = 18;
    const cuadros = [];
    for (let i = 0; i <= PASOS; i++) {
        const avance = i / PASOS;
        const e = suavizar(avance);
        // Al final "rebota": se agranda un poquito justo antes de asentarse en su lugar
        const rebote = 1 + 0.16 * Math.sin(Math.PI * Math.min(1, Math.max(0, (avance - 0.78) / 0.22)));
        const ancho = (origen.width + (destino.width - origen.width) * e) * rebote;
        const alto = (origen.height + (destino.height - origen.height) * e) * rebote;
        const cx = sobreLaCurva(x0, control[0], x1, e);
        const cy = sobreLaCurva(y0, control[1], y1, e);
        cuadros.push({
            left: `${cx - ancho / 2 - marcoDeLaBarra.left - barra.clientLeft}px`,
            top: `${cy - alto / 2 - marcoDeLaBarra.top - barra.clientTop}px`,
            width: `${ancho}px`,
            height: `${alto}px`,
            borderWidth: `${6 + (2 - 6) * e}px`,
            borderRadius: `${14 + (5 - 14) * e}px`,
            rotate: `${giro * 14 * Math.sin(Math.PI * avance)}deg`,
            offset: avance,
        });
    }
    const animacion = vuelo.animate(cuadros, { duration: DURACION_DEL_VUELO, easing: 'linear', fill: 'forwards' });
    const llegar = () => {
        vuelo.remove();
        aterrizarEnElStage(carta, true);
    };
    animacion.finished.then(llegar, llegar);
}

// La miniatura aparece en su lugar (si la carta sigue elegida)
function aterrizarEnElStage(carta, volando = false) {
    esperandoLaMiniatura.delete(carta);
    if (volando) llegaronVolando.add(carta);
    dibujarElegidosEnMiniatura();
}

// El contador de elegidos también es un botón: sin ninguno elegido está apagado; con 1 o 2 se puede tocar para quitar la selección
function mostrarAyudaDelContador() {
    const hayElegidos = seleccionados.length > 0;
    const ayuda = t(hayElegidos ? 'combate.contador.limpiar' : 'combate.contador');
    contadorSeleccion.disabled = !hayElegidos;
    ponerAyuda(contadorSeleccion, ayuda, `${seleccionados.length}/2 · ${ayuda}`);
}

function quitarSeleccion() {
    if (seleccionados.length === 0) return;
    seleccionados.forEach(carta => carta.classList.remove('seleccionado'));
    seleccionados.length = 0;
    verificarSeleccion();
}

// Vacía la selección de combate y apaga el cartelito del contador (lo usan el propio contador y el logo de la barra)
export function limpiarSeleccionDeCombate() {
    quitarSeleccion();
    quitarAvisoDelContador();
}

contadorSeleccion.addEventListener('click', limpiarSeleccionDeCombate);

// Otra forma de sacar un digimon de la selección: un clic en su carta en miniatura (la lista es aria-hidden; con el teclado está el contador)
document.getElementById('elegidos-miniatura').addEventListener('click', evento => {
    const lugar = evento.target.closest('.mini-carta.con-carta');
    if (!lugar) return;
    const carta = seleccionados[[...lugar.parentElement.children].indexOf(lugar)];
    if (!carta) return;
    carta.classList.remove('seleccionado');
    seleccionados.splice(seleccionados.indexOf(carta), 1);
    sonidoSeleccion(false);
    verificarSeleccion();
});
document.addEventListener('tema-cambiado', dibujarElegidosEnMiniatura); // (los colores de las cartas cambian con el tema)
document.addEventListener('idioma-cambiado', () => {
    mostrarAyudaDelContador();
    dibujarElegidosEnMiniatura(); // (el nombre que se ve al pasar el mouse cambia con el idioma)
});
mostrarAyudaDelContador();

// -----------------------------------------------------------------------------------------------------------------
// CARTELES DEL COMBATE: tres ventanas seguidas (preparando → peleando → ganador) con el mismo aspecto: una barra de título
// brillante, una "pantallita" (estilo Digivice) con el GIF y, abajo, el VS con las dos cartas que pelean (sus propias
// imágenes y nombres). Al ganador se lo festeja con corona y confeti. Los estilos están en el SCSS (".combate-popup").
// -----------------------------------------------------------------------------------------------------------------
const CARTEL_COMBATE = {
    width: 'min(94vw, 440px)',
    padding: 0,
    buttonsStyling: false,
    customClass: {
        container: 'combate-contenedor',
        popup: 'combate-popup',
        title: 'combate-titulo',
        htmlContainer: 'combate-cuerpo',
        confirmButton: 'combate-boton',
    },
    showClass: { popup: 'combate-entra' }, // animaciones de entrada y salida (en el SCSS)
    hideClass: { popup: 'combate-sale' },
    backdrop: 'rgba(6, 28, 90, 0.6)',
};

// Cada fase: el ícono del título, el GIF de la pantallita (con su proporción real, ancho / alto, para que se vea entero:
// en el de "preparando" la mano que usa la compu está abajo) y lo que va entre las dos cartas
const FASES_COMBATE = {
    preparando: { icono: '🛠️', gif: './img/Trabajando.gif', proporcion: '540 / 405', centro: 'VS' },
    peleando: { icono: '⚔️', gif: './img/Peleando.gif', proporcion: '1366 / 768', centro: '💥' },
    ganador: { icono: '🏆', gif: './img/Festejando.gif', proporcion: '474 / 290', centro: '🎉' },
};

// Un ataque al azar de la carta (o null si no tiene). Si algunos traen descripción, se elige entre esos, para que se pueda contar qué hace
function elegirAtaque(carta) {
    const todos = carta.datosDorso?.habilidades || [];
    const conTexto = todos.filter(habilidad => habilidad.descripcion);
    const opciones = conTexto.length ? conTexto : todos;
    return opciones.length ? opciones[Math.floor(Math.random() * opciones.length)] : null;
}

// El recuadro de un luchador en la pelea: "⚔️ Agumon usa Baby Flame" y, debajo, qué hace ese ataque
function crearAtaqueEnPelea(carta, ataque, i) {
    const caja = document.createElement('div');
    caja.className = `vs-ataque vs-${i + 1}`;
    caja.style.setProperty('--c', getComputedStyle(carta.querySelector('.c-arte')).borderTopColor); // el color de su carta

    const linea = document.createElement('p');
    linea.className = 'vs-ataque-linea';
    const luchador = document.createElement('b');
    luchador.textContent = nombreCompleto(carta);
    const nombre = document.createElement('em');
    nombre.textContent = nombreDeAtaque(ataque.nombre, carta.dataset.nombreApi);
    linea.append('⚔️ ', luchador, ` ${t('combate.usa')} `, nombre);
    caja.append(linea);

    if (ataque.descripcion) {
        const descripcion = document.createElement('p');
        descripcion.className = 'vs-ataque-desc';
        descripcion.textContent = ataque.descripcion;
        descripcion.title = ataque.descripcion; // por si es tan larga que se corta
        caja.append(descripcion);
    }
    return caja;
}

// El cuerpo de la ventana: la pantallita con el GIF y el VS. "indiceGanador" (0 o 1) solo se usa en la última fase.
// "ataques" (uno por carta, o null) solo se usa en la pelea: debajo del VS se cuenta qué ataque usa cada una.
// Se arma con nodos (y no con texto HTML) porque los nombres vienen de la API.
// "conGif" en false deja la pantallita sin imagen: el GIF lo pone después arrancarGifConSorbo, justo con el sonido
function crearCuerpoCartel(fase, cartas, indiceGanador = -1, conGif = true, ataques = null) {
    const datos = FASES_COMBATE[fase];
    const escena = document.createElement('div');
    escena.className = `combate-escena fase-${fase}`;

    const pantalla = document.createElement('div');
    pantalla.className = 'combate-pantalla';
    pantalla.style.setProperty('--proporcion', datos.proporcion);
    const gif = document.createElement('img');
    if (conGif) gif.src = datos.gif;
    gif.alt = '';
    pantalla.append(gif);

    const vs = document.createElement('div');
    vs.className = 'combate-vs';
    const centro = document.createElement('span');
    centro.className = 'vs-centro';
    centro.setAttribute('aria-hidden', 'true');
    centro.textContent = datos.centro;

    const luchadores = cartas.map((carta, i) => {
        const nombre = nombreCompleto(carta);
        const figura = document.createElement('figure');
        figura.className = `vs-luchador vs-${i + 1}`;
        if (indiceGanador >= 0) figura.classList.add(i === indiceGanador ? 'ganador' : 'perdedor');
        figura.style.setProperty('--c', getComputedStyle(carta.querySelector('.c-arte')).borderTopColor); // el color de su carta

        const imagen = document.createElement('img');
        const origen = carta.querySelector('.c-arte img');
        imagen.src = origen?.currentSrc || origen?.src || '';
        imagen.alt = nombre;

        const leyenda = document.createElement('figcaption');
        leyenda.textContent = nombre;
        figura.append(imagen, leyenda);
        return figura;
    });

    vs.append(luchadores[0], centro, luchadores[1]);
    escena.append(pantalla, vs);

    if (fase === 'peleando' && ataques?.some(Boolean)) {
        const recuadros = document.createElement('div');
        recuadros.className = 'combate-ataques';
        ataques.forEach((ataque, i) => {
            if (ataque) recuadros.append(crearAtaqueEnPelea(cartas[i], ataque, i));
        });
        escena.append(recuadros);
    }
    return escena;
}

// Confeti de colores que cae por la ventana del ganador (sin librerías: cada papelito es un <i> animado)
function lanzarConfeti(ventana) {
    if (reducirMovimiento || !ventana) return;
    const colores = ['#ff5fa2', '#ffd85f', '#5fffb0', '#5fc8ff', '#b55fff', '#ff8a3d'];
    const capa = document.createElement('div');
    capa.className = 'combate-confeti';
    ventana.append(capa);
    const alto = ventana.getBoundingClientRect().height;
    for (let i = 0; i < 48; i++) {
        const papel = document.createElement('i');
        papel.style.left = `${Math.random() * 100}%`;
        papel.style.background = colores[i % colores.length];
        capa.append(papel);
        const lado = (Math.random() - 0.5) * 140;
        papel.animate(
            [
                { transform: 'translate(0, -24px) rotate(0deg)', opacity: 1 },
                { transform: `translate(${lado}px, ${alto + 30}px) rotate(${Math.round(Math.random() * 900 - 450)}deg)`, opacity: 1 },
            ],
            { duration: 1600 + Math.random() * 1800, delay: Math.random() * 600, easing: 'cubic-bezier(0.25, 0.6, 0.4, 1)', fill: 'both' },
        );
    }
    setTimeout(() => capa.remove(), 4600);
}

// Hace que algo (un sonido, el confeti) pase recién cuando el cartel terminó de aparecer, y no antes: entre el clic en
// "Aceptar" y el cartel siguiente pasa un rato (se va el anterior y entra el nuevo), y el sonido salía en medio de ese hueco.
// Devuelve una función para cancelarlo (si el cartel se cierra antes de terminar de aparecer, no tiene que sonar).
function cuandoAparece(ventana, accion) {
    let pendiente = true;
    const cancelar = () => {
        pendiente = false;
        clearTimeout(plazo);
        ventana.removeEventListener('animationend', alTerminar);
    };
    const alTerminar = evento => {
        if (evento.target !== ventana) return; // las animaciones de adentro del cartel también avisan; solo vale la de la ventana
        if (pendiente) accion();
        cancelar();
    };
    const plazo = setTimeout(() => alTerminar({ target: ventana }), 900); // por si la animación de entrada no llega a correr
    ventana.addEventListener('animationend', alTerminar);
    return cancelar;
}

// Mientras dura el combate la página de atrás queda quieta (igual que con el zoom de una carta): ni rueda, ni dedo, ni teclas.
// Lo único que se puede mover es el propio cartel cuando no entra entero en la pantalla (por ejemplo, un celular acostado).
const frenarRuedaDelCombate = evento => {
    if (!zonaConScroll(evento.target, evento.deltaY, '.combate-contenedor')) evento.preventDefault();
};

const frenarToqueDelCombate = evento => {
    if (!zonaConScroll(evento.target, 0, '.combate-contenedor') && evento.cancelable) evento.preventDefault();
};

const frenarTeclasDelCombate = evento => {
    if (!TECLAS_DE_DESPLAZAMIENTO.includes(evento.key)) return;
    if (evento.key === ' ' && evento.target.closest?.('button, a, input, textarea, select')) return; // el espacio sobre un botón lo aprieta, no desplaza
    const contenedor = document.querySelector('.combate-contenedor');
    if (contenedor && contenedor.scrollHeight > contenedor.clientHeight) return; // el cartel no entra entero: las teclas lo desplazan a él
    evento.preventDefault();
};

function bloquearFondoDelCombate(bloquear) {
    document.documentElement.classList.toggle('combate-quieto', bloquear); // sin barra de scroll en la página (ver _base.scss)
    const accion = bloquear ? 'addEventListener' : 'removeEventListener';
    window[accion]('wheel', frenarRuedaDelCombate, { passive: false });
    window[accion]('touchmove', frenarToqueDelCombate, { passive: false });
    window[accion]('keydown', frenarTeclasDelCombate, true);
}

// ---- El botón de la música del combate -----------------------------------------------------------------------------------------------
// Un botoncito redondo arriba a la izquierda de cada cartel del combate (del lado contrario a la cruz de cerrar) que enciende y apaga la música
// del combate: la de la pelea y la del ganador. Los efectos (el sorbo, la fanfarria, el grito) siguen sonando: eso lo maneja el botón de sonido
// de la barra. Por defecto la música está apagada, y lo que la persona elige queda guardado en el navegador (audio.js). Es un solo botón que se
// pasa de un cartel al siguiente, así su globito de aviso (avisos.js) lo acompaña a lo largo del combate.
const ICONO_DE_MUSICA = `<svg class="musica-icono" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
    <path class="musica-cruz" d="M3.5 3.5l17 17" />
</svg>`;

let botonDeMusica = null;

function mostrarEstadoDeLaMusica() {
    const suena = musicaDelCombateSuena();
    botonDeMusica.dataset.modo = suena ? 'encendida' : 'apagada'; // el ícono: nota musical, o nota tachada
    botonDeMusica.setAttribute('aria-pressed', String(suena));
    ponerAyuda(botonDeMusica, t(suena ? 'combate.musica.apagar' : 'combate.musica.encender'));
}

function crearBotonDeMusica() {
    botonDeMusica = document.createElement('button');
    botonDeMusica.type = 'button';
    botonDeMusica.id = 'musica-combate';
    botonDeMusica.className = 'combate-musica';
    botonDeMusica.innerHTML = ICONO_DE_MUSICA;
    mostrarEstadoDeLaMusica();
    botonDeMusica.addEventListener('click', () => {
        alternarMusicaDelCombate();
        mostrarEstadoDeLaMusica();
        musicaDelCombateYaConocida(botonDeMusica); // ya sabe para qué sirve: el globito se va y no vuelve a salir
    });
    document.addEventListener('idioma-cambiado', mostrarEstadoDeLaMusica);
}

// Lo pone en el cartel que se acaba de abrir (en un "riel" propio pegado al borde izquierdo, igual al de la cruz: ver _ventanas.scss) y, cuando el
// cartel terminó de aparecer, le pide a avisos.js el globito (que sale solo la primera vez de cada visita, y solo en las primeras)
function ponerBotonDeMusica(ventana) {
    if (!botonDeMusica) crearBotonDeMusica();
    mostrarEstadoDeLaMusica();
    const riel = document.createElement('div');
    riel.className = 'ventana-riel izquierda';
    riel.append(botonDeMusica);
    ventana.append(riel);
    cuandoAparece(ventana, () => avisarDeLaMusicaDelCombate(botonDeMusica));
}

// Abre uno de los carteles del combate. Devuelve true si tocaron "Aceptar" (se sigue con el próximo cartel) y false si lo anularon:
// con la cruz de arriba a la derecha (la de todas las ventanas: ver ventanas.js), tocando afuera, con Esc o con el "atrás" del celular (ahí el
// combate se corta y no se muestran los que faltan)
// Que el cartel entre entero en la pantalla, sin barra de desplazamiento: si es más alto que lo que hay (pantallas bajas: celulares chicos, notebooks,
// el celular acostado), se lo achica con "zoom" lo justo para que entre (hasta un mínimo, para que los botones se sigan pudiendo tocar). Se vuelve a
// medir al girar el celular o cambiar el tamaño de la ventana, y cuando terminan de cargar las tipografías (cambian el alto de los textos).
const MARGEN_DEL_CARTEL = 24; // px que quedan entre el cartel y el borde de la pantalla (el relleno del contenedor, arriba y abajo)
const ZOOM_MINIMO_DEL_CARTEL = 0.6;

function ajustarCartelALaPantalla(ventana) {
    const ajustar = () => {
        if (!ventana.isConnected) return window.removeEventListener('resize', ajustar);
        ventana.style.zoom = ''; // (se mide a tamaño natural)
        const factor = (window.innerHeight - MARGEN_DEL_CARTEL) / ventana.offsetHeight;
        if (factor < 1) ventana.style.zoom = String(Math.max(ZOOM_MINIMO_DEL_CARTEL, factor));
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    document.fonts?.ready.then(ajustar);
}

async function abrirCartelDeCombate({ didOpen, ...opciones }) {
    const respuesta = await Swal.fire({
        ...CARTEL_COMBATE,
        ...conCruzDeCierre(t('zoom.cerrar')), // al dejar el puntero encima, en todos los carteles del combate, solo dice "Cerrar (Esc)"
        confirmButtonText: t('aceptar'),
        ...opciones,
        didOpen: ventana => {
            bloquearFondoDelCombate(true); // queda activo hasta que termina todo el combate (así no hay hueco entre un cartel y el siguiente)
            ponerBotonDeMusica(ventana);
            ajustarCartelALaPantalla(ventana);
            didOpen?.(ventana);
        },
    });
    return respuesta.isConfirmed;
}

export let combateEnCurso = false; // desde que se aprieta "Iniciar Combate" hasta que se cierra el último cartel (avisos.js lo mira)

export async function iniciarCombate() {
    combateEnCurso = true; // (las llamadas de los botones lo miran: si el primer sonido es el de "Iniciar Combate", el botón tiene que verse por encima del cartel)
    revisarLlamadas(); // si la llamada del botón ya arrancó con el clic de la tecla, el botón sube ahora mismo
    try {
        await correrCombate();
    } finally {
        combateEnCurso = false;
        bloquearFondoDelCombate(false); // el combate terminó (o se anuló): la página vuelve a poder desplazarse
        setTimeout(() => mostrarAvisoDelContador(), AVISO_CONTADOR_ESPERA); // la primera vez de la sesión, cuenta para qué sirve el contador
    }
}

async function correrCombate() {
    console.log('--- Variables de los digimons seleccionados para el combate 👇 ---');

    // Leemos los datos de cada carta seleccionada (nombre, atributo, nivel y elemento)
    const luchador1 = leerLuchador(seleccionados[0]);
    const luchador2 = leerLuchador(seleccionados[1]);
    console.log(luchador1);
    console.log(luchador2);
    console.log('----------------------------------------------------------------------');

    const indiceGanador = determinarGanador(luchador1, luchador2);
    const ganador = [luchador1, luchador2][indiceGanador].nombre;
    const cartas = [seleccionados[0], seleccionados[1]]; // las dos cartas que pelean (para mostrarlas en los carteles)
    const ataques = cartas.map(elegirAtaque); // el ataque que usa cada una en la pelea (es solo ambientación: el resultado ya está decidido)

    // Cuadros de animación
    let anulado = false; // true si en un cartel tocaron la cruz, afuera o Esc: el combate se corta ahí
    try {
        reproducirSonido(audioMouse);
        // El sorbo de la pajita arranca junto con el GIF (ver sincronizarPajita). Si no se puede (por ejemplo, abriendo el
        // archivo sin servidor), queda el plan B: el sonido se repite al mismo ritmo, pero sin alinearlo con el GIF
        const pajita = await prepararPajita();
        if (!pajita) reproducirPajita();
        const aceptado = await abrirCartelDeCombate({
            title: `${FASES_COMBATE.preparando.icono} ${t('combate.preparando')}`,
            html: crearCuerpoCartel('preparando', cartas, -1, !pajita),
            didOpen: ventana => {
                if (pajita) arrancarGifConSorbo(ventana, pajita);
            },
        });
        anulado = !aceptado;
        detenerSonido(audioMouse); // Detiene el sonido después de que se cierra la primera ventana
        detenerSonidoPajita();
    } catch (error) {
        detenerSonido(audioMouse); // Asegura que el sonido se detenga en caso de error
        detenerSonidoPajita();
    }
    if (anulado) return;

    // La música de la pelea y la del ganador salen recién cuando su cartel terminó de aparecer (ver cuandoAparece)
    let cancelarSonido = () => {};
    try {
        const aceptado = await abrirCartelDeCombate({
            title: `${FASES_COMBATE.peleando.icono} ${t('combate.peleando')}`,
            html: crearCuerpoCartel('peleando', cartas, -1, true, ataques),
            didOpen: ventana => {
                cancelarSonido = cuandoAparece(ventana, () => reproducirSonido(musicaDelCombate));
            },
        });
        anulado = !aceptado;
        cancelarSonido();
        detenerSonido(musicaDelCombate);
    } catch (error) {
        cancelarSonido();
        detenerSonido(musicaDelCombate);
    }
    if (anulado) return;

    try {
        await abrirCartelDeCombate({
            title: `${FASES_COMBATE.ganador.icono} ${t('combate.ganador', { nombre: ganador })}`,
            html: crearCuerpoCartel('ganador', cartas, indiceGanador),
            didOpen: ventana => {
                cancelarSonido = cuandoAparece(ventana, () => {
                    reproducirSonido(fanfarriaDeVictoria);
                    reproducirConDelay(); // Llama a la función con delay para reproducir musicaDelGanador
                    reproducirGritoConDelay(); // y el grito final de la victoria, que solo suena si el cartel sigue abierto
                    lanzarConfeti(ventana);
                });
            },
        });
    } finally {
        // Se cerró el cartel del ganador (o hubo un error): se corta todo lo que iba a sonar o estaba sonando
        cancelarSonido();
        cancelarMusicaGanador();
        cancelarGritoDeVictoria();
        detenerSonido(musicaDelGanador);
    }
}

// Función para leer los datos de una carta (los guardamos en el data-atributo, data-nivel y data-elemento)
function leerLuchador(carta) {
    return {
        nombre: nombreCompleto(carta),
        atributo: carta.dataset.atributo,
        nivel: carta.dataset.nivel !== undefined ? Number(carta.dataset.nivel) : null, // null si el nivel es desconocido
        elemento: carta.dataset.elemento,
    };
}

// Probabilidad (de 0 a 1) de que gane el primer luchador, considerando nivel, atributo y elemento
function calcularProbabilidad(luchador1, luchador2) {
    console.log('--- Cálculos del combate 👇 ---');

    // Punto de partida: pelea pareja
    const probabilidadBase = 0.5;
    console.log('Probabilidad base del primer digimon 👇');
    console.log(probabilidadBase);

    // Ajuste por niveles (si a alguno le falta el nivel, no se ajusta nada). Cuenta el poder en combate, no el número de la carta
    const hayNiveles = luchador1.nivel !== null && luchador2.nivel !== null;
    const diferenciaDeNivel = hayNiveles ? poderEnCombate(luchador1.nivel) - poderEnCombate(luchador2.nivel) : 0;
    const ajusteNivel = diferenciaDeNivel * PESO_NIVEL;
    console.log('Diferencia de nivel 👇');
    console.log(diferenciaDeNivel);
    console.log('Ajuste por nivel 👇');
    console.log(ajusteNivel);

    // Contra un nivel 7 u 8 con el rival muy por debajo, el atributo y el elemento valen menos (1 = valen todo)
    const brecha = Math.abs(diferenciaDeNivel);
    const hayNivelAlto = hayNiveles && Math.max(luchador1.nivel, luchador2.nivel) >= 7;
    const valorVentajas = hayNivelAlto && brecha > ALCANCE_VENTAJAS ? ALCANCE_VENTAJAS / brecha : 1;
    console.log('Cuánto valen el atributo y el elemento (1 = todo) 👇');
    console.log(valorVentajas);

    // Ajuste por atributo: +1 si el atributo 1 es fuerte contra el atributo 2, -1 si es débil, 0 si están parejos
    const ventajaAtributo = calcularVentaja(ATRIBUTO_FUERTE_CONTRA, luchador1.atributo, luchador2.atributo);
    const ajusteAtributo = ventajaAtributo * PESO_ATRIBUTO * valorVentajas;
    console.log('Ventaja de atributo (+1 a favor, -1 en contra) 👇');
    console.log(ventajaAtributo);
    console.log('Ajuste por atributo 👇');
    console.log(ajusteAtributo);

    // Ajuste por elemento: +1 a favor, -1 en contra, 0 si están parejos (o alguno es Neutro)
    const ventajaElemento = calcularVentaja(ELEMENTO_FUERTE_CONTRA, luchador1.elemento, luchador2.elemento);
    const ajusteElemento = ventajaElemento * PESO_ELEMENTO * valorVentajas;
    console.log('Ventaja de elemento (+1 a favor, -1 en contra) 👇');
    console.log(ventajaElemento);
    console.log('Ajuste por elemento 👇');
    console.log(ajusteElemento);

    // Sumamos todo y nos aseguramos de que la probabilidad esté entre 0 y 1 (redondeada a 2 decimales)
    const suma = probabilidadBase + ajusteAtributo + ajusteNivel + ajusteElemento;
    return Math.min(1, Math.max(0, Number(suma.toFixed(2))));
}

// Función para determinar el ganador considerando atributo, nivel y elemento. Devuelve su lugar: 0 (el primero) o 1 (el segundo)
function determinarGanador(luchador1, luchador2) {
    const probabilidadAjustada = calcularProbabilidad(luchador1, luchador2);
    console.log('El N° aleatorio debe ser inferior a este 👇 para ganar');
    console.log(probabilidadAjustada);

    // Generación de resultado aleatorio
    const random = Math.random();
    console.log('Número aleatorio 👇');
    console.log(random);
    console.log('----------------------------------------------------------------------');

    return random < probabilidadAjustada ? 0 : 1; // 0: gana el primero; 1: gana el segundo
}
