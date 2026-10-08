// -----------------------------------------------------------------------------------------------------------------
// COMBATE
//
// Elegir los 2 digimons (el contador de la barra), calcular quién gana (tipo + nivel + elemento) y los tres carteles del
// combate (preparando → peleando → ganador).
// -----------------------------------------------------------------------------------------------------------------

import { emitir, ponerAyuda } from './util.js';
import { ELEMENTO_FUERTE_CONTRA, TIPO_FUERTE_CONTRA } from './datos.js';
import { t } from './i18n.js';
import { botonIniciarCombate, contadorSeleccion } from './pagina.js';
import { AVISO_CONTADOR_ESPERA, mostrarAvisoDelContador, quitarAvisoDelContador, revisarLlamadas } from './avisos.js';
import { nombreCompleto, reducirMovimiento } from './cartas.js';
import { TECLAS_DE_DESPLAZAMIENTO, zonaConScroll } from './zoom.js';
import {
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
    musicaDelGanador,
    fanfarriaDeVictoria,
    cancelarGritoDeVictoria,
    reproducirGritoConDelay,
} from './audio.js';

// -----------------------------------------------------------------------------------------------------------------
// SISTEMA DE COMBATE: la probabilidad de ganar combina TIPO + NIVEL + ELEMENTO
//
//   probabilidad = 50% + (ventaja de tipo × 20%) + (diferencia de nivel × 15%) + (ventaja de elemento × 10%)
//
// Con esto, una doble ventaja (tipo + elemento = +30%) compensa justo 2 niveles de diferencia (2 × 15%).
// Los niveles 7 y 8 rompen esa escala: pesan mucho más (PODER_EN_COMBATE) y contra ellos casi no sirve el tipo ni el elemento.
// -----------------------------------------------------------------------------------------------------------------

// Cuánto pesa cada factor
export const PESO_TIPO = 0.2;
export const PESO_NIVEL = 0.15;
export const PESO_ELEMENTO = 0.1;

// Poder en combate: del 1 al 6 es el mismo número que se ve en la carta, pero los niveles 7 y 8 rompen la escala.
// Del 6 al 7 y del 7 al 8 hay 3 niveles de distancia (6 → 9 → 12): un Mega apenas le puede hacer cosquillas a un Ultra
// (lo mismo que un Ultra a un Absolute), y entre un Mega y un Absolute la diferencia es tan grande que no tiene forma de ganar.
export const PODER_EN_COMBATE = { 7: 9, 8: 12 };
const poderEnCombate = nivel => PODER_EN_COMBATE[nivel] ?? nivel;

// Si uno de los dos es nivel 7 u 8 y el otro está muy por debajo, el tipo y el elemento valen cada vez menos:
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
    botonIniciarCombate.disabled = seleccionados.length !== 2;
    // El color del botón (verde si se puede pelear, gris si no) y su latido cada 2 s (solo mientras se puede pelear) los pone el CSS según :disabled
    emitir('seleccion-cambio'); // el aviso de ayuda del inicio se va cuando ya eligió las 2
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
document.addEventListener('idioma-cambiado', mostrarAyudaDelContador);
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
        closeButton: 'combate-cerrar',
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
    nombre.textContent = ataque.nombre;
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
    const accion = bloquear ? 'addEventListener' : 'removeEventListener';
    window[accion]('wheel', frenarRuedaDelCombate, { passive: false });
    window[accion]('touchmove', frenarToqueDelCombate, { passive: false });
    window[accion]('keydown', frenarTeclasDelCombate, true);
}

// Abre uno de los carteles del combate. Devuelve true si tocaron "Aceptar" (se sigue con el próximo cartel) y false si lo anularon:
// con la cruz de arriba a la derecha, tocando afuera o con Esc (ahí el combate se corta y no se muestran los que faltan)
const CRUZ_ANULAR = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>';

async function abrirCartelDeCombate({ didOpen, ...opciones }) {
    const respuesta = await Swal.fire({
        ...CARTEL_COMBATE,
        showCloseButton: true,
        closeButtonHtml: CRUZ_ANULAR,
        closeButtonAriaLabel: t('combate.anular'),
        confirmButtonText: t('aceptar'),
        ...opciones,
        didOpen: ventana => {
            bloquearFondoDelCombate(true); // queda activo hasta que termina todo el combate (así no hay hueco entre un cartel y el siguiente)
            ventana.querySelector('.swal2-close')?.setAttribute('title', t('combate.anular'));
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

    // Leemos los datos de cada carta seleccionada (nombre, tipo, nivel y elemento)
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

// Función para leer los datos de una carta (los guardamos en el data-tipo, data-nivel y data-elemento)
function leerLuchador(carta) {
    return {
        nombre: nombreCompleto(carta),
        tipo: carta.dataset.tipo,
        nivel: carta.dataset.nivel !== undefined ? Number(carta.dataset.nivel) : null, // null si el nivel es desconocido
        elemento: carta.dataset.elemento,
    };
}

// Probabilidad (de 0 a 1) de que gane el primer luchador, considerando nivel, tipo y elemento
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

    // Contra un nivel 7 u 8 con el rival muy por debajo, el tipo y el elemento valen menos (1 = valen todo)
    const brecha = Math.abs(diferenciaDeNivel);
    const hayNivelAlto = hayNiveles && Math.max(luchador1.nivel, luchador2.nivel) >= 7;
    const valorVentajas = hayNivelAlto && brecha > ALCANCE_VENTAJAS ? ALCANCE_VENTAJAS / brecha : 1;
    console.log('Cuánto valen el tipo y el elemento (1 = todo) 👇');
    console.log(valorVentajas);

    // Ajuste por tipo: +1 si el tipo 1 es fuerte contra el tipo 2, -1 si es débil, 0 si están parejos
    const ventajaTipo = calcularVentaja(TIPO_FUERTE_CONTRA, luchador1.tipo, luchador2.tipo);
    const ajusteTipo = ventajaTipo * PESO_TIPO * valorVentajas;
    console.log('Ventaja de tipo (+1 a favor, -1 en contra) 👇');
    console.log(ventajaTipo);
    console.log('Ajuste por tipo 👇');
    console.log(ajusteTipo);

    // Ajuste por elemento: +1 a favor, -1 en contra, 0 si están parejos (o alguno es Neutro)
    const ventajaElemento = calcularVentaja(ELEMENTO_FUERTE_CONTRA, luchador1.elemento, luchador2.elemento);
    const ajusteElemento = ventajaElemento * PESO_ELEMENTO * valorVentajas;
    console.log('Ventaja de elemento (+1 a favor, -1 en contra) 👇');
    console.log(ventajaElemento);
    console.log('Ajuste por elemento 👇');
    console.log(ajusteElemento);

    // Sumamos todo y nos aseguramos de que la probabilidad esté entre 0 y 1 (redondeada a 2 decimales)
    const suma = probabilidadBase + ajusteTipo + ajusteNivel + ajusteElemento;
    return Math.min(1, Math.max(0, Number(suma.toFixed(2))));
}

// Función para determinar el ganador considerando tipo, nivel y elemento. Devuelve su lugar: 0 (el primero) o 1 (el segundo)
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
