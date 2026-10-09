// -----------------------------------------------------------------------------------------------------------------
// SONIDO Y VIBRACIÓN
//
// El botón de sonido (sonido + vibración → solo vibración → nada), el volumen según el dispositivo, el desbloqueo del audio (el
// navegador no deja sonar nada hasta que la persona toca la página), los archivos de audio (la música del combate y del
// ganador, el mouse, la pajita del GIF "Trabajando") y la vibración.
// -----------------------------------------------------------------------------------------------------------------

import {
    BOTONES_SUAVES,
    CON_DEDO,
    ES_IOS,
    PANTALLA_DE_CELULAR,
    emitir,
    esElSegundoDeUnDoble,
    guardarJSON,
    hayMarcaDeSesion,
    leerJSON,
    ponerAyuda,
    ponerMarcaDeSesion,
} from './util.js';
import { t } from './i18n.js';
import { llamarLaAtencion, terminarLlamada } from './avisos.js';
import { nodoVolumenTeclas, sonidoTecla } from './sonidos.js';
import { toqueQueSoloCierraMenus } from './menus.js';

// Vibración corta al tocar botones con el dedo, como una tecla física. Solo en los celulares que la permiten
// (Android; en iPhone el navegador no deja vibrar). El navegador solo la permite después del primer toque en la página.
export function vibrar(duracion = 8, forzar = false) {
    if (!navigator.vibrate || (vibracionApagada && !forzar)) return; // vibracionApagada: la persona la quitó con el botón de sonido (#silenciar)
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try {
        navigator.vibrate(duracion);
    } catch (error) {
        // Si no se puede vibrar, no pasa nada
    }
}

// ---- Apretar y soltar con el dedo ----------------------------------------------------------------------------------------
// Con el dedo, los botones se sienten como una tecla: al apretar suenan y vibran, y al levantar el dedo vuelven a sonar y a vibrar ("soltar"),
// cada cosa en su momento. Lo que hace el botón (abrir una ventana, dar vuelta la carta...) pasa siempre al soltar: es el "click" de la página,
// que el navegador manda al levantar el dedo (y no si el dedo se fue arrastrando la página).
// Pero al apoyar el dedo todavía no se sabe si es un toque o el comienzo de un desplazamiento: casi cualquier botón (los del menú ☰, los de las
// ventanas, los de las cartas, los filtros...) se toca justo cuando se quiere desplazar la página o una lista, y si sonaban y vibraban al apoyar,
// el barrido del dedo por los botones sonaba y vibraba como si se estuvieran apretando uno tras otro. Por eso, con el dedo, hay tres momentos:
//  - Apretar: si el dedo sigue quieto un instante (APRETADO_DESDE) se avisa con "boton-apretado" (suena la bajada y vibra). Si antes se movió, o
//    el navegador empezó a desplazar la página (cancela el toque), no pasa nada y el botón nunca se apretó.
//  - Soltar: al levantar el dedo de un botón apretado se avisa con "boton-soltado" (suena la subida y vibra, un poco más suave).
//  - Toque rápido: si el dedo se levantó antes de ese instante, se avisa con "toque-en-boton", y suena la bajada y, un momento después, la
//    subida, con una única vibración (cuando el toque es muy rápido, la vibración va junta).
// (Es lo que escuchan el sonido, en sonidos.js, y la vibración, acá abajo.) Ninguno de los avisos sale si apareció un segundo dedo (el pellizco del
// zoom) ni si el toque solo cierra un menú abierto (ver menus.js).
// Esperan al final del toque, sin "apretar" (suenan y vibran una sola vez, al levantar el dedo, si fue un toque quieto y corto):
//  - Los botoncitos del frente de la carta (gema, nivel, atributo y elemento) cuando la inclinación está activada: mantener el dedo apoyado
//    sobre la carta, aunque sea encima de uno de ellos, la empieza a inclinar (y tampoco suenan si el dedo se queda: es una pulsación larga).
//  - Las etiquetas de los filtros elegidos, que se recorren con el dedo de costado cuando son varias.
// Con el mouse no hace falta nada de esto: apretar y soltar suenan al momento (ver sonidos.js).
const TOQUE_DISTANCIA_MAXIMA = 10; // px que se puede mover el dedo y que siga siendo un toque (los mismos que tolera la inclinación)
const TOQUE_DURACION_MAXIMA = 500; // ms que se puede tener apoyado el dedo en los botones que esperan (más que eso es una pulsación larga)
const APRETADO_DESDE = 120; // ms con el dedo quieto para que cuente como "apretado" (menos que eso es un toque rápido)
const BOTONES_QUE_ESPERAN = '.f-tag, #listado-digimons.tilt-on li .c-frente';

// ¿Este toque cayó con el dedo sobre un botón? (Con el dedo, todos los botones suenan y vibran desde activarToqueEnBotonesConEspera y no al apoyar.)
export function esToqueEnBoton(evento) {
    return evento.pointerType === 'touch' && Boolean(evento.target.closest?.('button, [role="button"]'));
}

export function activarToqueEnBotonesConEspera() {
    let apoyado = null; // el toque en curso: { boton, x, y, desde, espera (el aviso de "apretado" pendiente), apretado }
    const dejar = () => {
        clearTimeout(apoyado?.espera);
        apoyado = null;
    };
    document.addEventListener('pointerdown', evento => {
        dejar(); // (un segundo dedo, que no es el principal, también deja sin efecto el toque que estaba en curso)
        if (!evento.isPrimary || !esToqueEnBoton(evento) || toqueQueSoloCierraMenus()) return;
        const boton = evento.target.closest('button, [role="button"]');
        if (boton.disabled) return;
        const toque = { boton, x: evento.clientX, y: evento.clientY, desde: evento.timeStamp, espera: 0, apretado: false };
        apoyado = toque;
        // (el segundo toque de un doble toque sobre un botoncito, que amplía la carta, no suena ni vibra otra vez: el primero ya lo hizo)
        if (!boton.closest(BOTONES_QUE_ESPERAN) && !esElSegundoDeUnDoble()) {
            toque.espera = setTimeout(() => {
                if (apoyado !== toque) return;
                toque.apretado = true;
                emitir('boton-apretado', { boton });
            }, APRETADO_DESDE);
        }
    });
    document.addEventListener(
        'pointermove',
        evento => {
            // Antes de apretar, mover el dedo más que un temblor es empezar a desplazar: el botón no se aprieta
            if (
                apoyado &&
                !apoyado.apretado &&
                evento.pointerType === 'touch' &&
                Math.hypot(evento.clientX - apoyado.x, evento.clientY - apoyado.y) > TOQUE_DISTANCIA_MAXIMA
            )
                dejar();
        },
        { passive: true },
    );
    document.addEventListener('pointerup', evento => {
        const toque = apoyado;
        dejar();
        if (!toque || evento.pointerType !== 'touch') return;
        if (toque.apretado) {
            emitir('boton-soltado', { boton: toque.boton });
            return;
        }
        const sinMoverse = Math.hypot(evento.clientX - toque.x, evento.clientY - toque.y) <= TOQUE_DISTANCIA_MAXIMA;
        if (sinMoverse && evento.timeStamp - toque.desde <= TOQUE_DURACION_MAXIMA && !esElSegundoDeUnDoble()) emitir('toque-en-boton', { boton: toque.boton });
    });
    for (const nombre of ['pointercancel', 'inclinacion-con-dedo']) document.addEventListener(nombre, dejar);
}

// Los "botones" que son <span role="button"> (gema, nivel, atributo y elemento del frente de la carta) vibran con una mini vibración, como su
// tecla, que también es más suave. Los botones suaves (etiquetas de filtros, Aceptar y cruz de las ventanas) vibran todavía menos.
// Al soltar, la vibración es un poco más suave que al apretar.
const vibrarAlTocar = boton => vibrar(boton.matches(BOTONES_SUAVES) ? 4 : boton.matches('[role="button"]') ? 6 : 8);
const vibrarAlSoltar = (boton, forzar) => vibrar(boton.matches(BOTONES_SUAVES) ? 3 : boton.matches('[role="button"]') ? 4 : 6, forzar);

export function activarVibracion() {
    if (!navigator.vibrate) return;
    // El botón de sonido vibra según a dónde lleva el toque y no según cómo está ahora: al pasar a "solo vibración" y al volver a activar todo
    // vibra; al pasar a "nada" (donde ya no hay vibración) ese toque no vibra, ni al apretar ni al soltar. Cuando vuelve a "todo" la vibración
    // todavía figura apagada, por eso se fuerza. (Al soltar, el modo todavía no cambió: eso pasa recién con el clic, que viene después.)
    const esElDeSonido = boton => boton.id === 'silenciar';
    const alApretar = boton => {
        if (boton.disabled) return;
        if (!esElDeSonido(boton)) vibrarAlTocar(boton);
        else if (modoSiguienteDelAudio() !== 'nada') vibrar(8, true);
    };
    // Un toque rápido vibra una sola vez (junta, al levantar el dedo); si el dedo se queda apretado, vibra al apretar y otra vez, más suave, al soltar
    document.addEventListener('toque-en-boton', evento => alApretar(evento.detail.boton));
    document.addEventListener('boton-apretado', evento => alApretar(evento.detail.boton));
    document.addEventListener('boton-soltado', evento => {
        const boton = evento.detail.boton;
        if (boton.disabled) return;
        if (!esElDeSonido(boton)) vibrarAlSoltar(boton, false);
        else if (modoSiguienteDelAudio() !== 'nada') vibrarAlSoltar(boton, true);
    });
}

// -----------------------------------------------------------------------------------------------------------------
// CONTEXTO DE AUDIO (Web Audio): se crea con el primer sonido (obtenerContextoAudio) y lo usan los sonidos de sonidos.js
// -----------------------------------------------------------------------------------------------------------------
let contextoAudio;

// ---- Silencio general ---------------------------------------------------------------------------------------------
// Un botón chiquito (#silenciar) maneja el sonido y la vibración de la página. En el celular da tres vueltas:
//   1) sonido + vibración (por defecto)  →  2) solo vibración (sin sonido)  →  3) nada de nada  →  vuelve a 1)
// Donde no hay vibración (computadora, iPhone) son solo dos: suena / silenciado.
// Apagar el sonido apaga los sonidos sintetizados (teclas, giro, zoom, sorbo) y los archivos de audio del combate.
// La elección se guarda en el navegador de cada persona (localStorage), como un JSON {"sonido": true, "vibracion": true},
// así la próxima vez que entre sigue como la dejó. (Antes se guardaba {"silenciado": true}: se sigue entendiendo.)
// Para volver a empezar (por ejemplo, para probarlo): localStorage.removeItem('digimon-audio')
const AUDIO_ALMACEN = 'digimon-audio';

// Mismo criterio que usa la página para lo que es solo del celular: pantalla táctil sin "hover" y con navigator.vibrate
// (Android; en iPhone y iPad el navegador no deja vibrar y en computadora no hay con qué). Si es un iPhone o un iPad, se lo descarta aunque el
// navegador diga que sí (por ejemplo, al simular un iPhone desde las herramientas de una computadora): ahí el botón tiene solo dos pasos
// (suena / silenciado) y ninguno de sus textos habla de vibración.
const VIBRACION_DISPONIBLE = Boolean(navigator.vibrate) && !ES_IOS && CON_DEDO.matches;

function leerAudioGuardado() {
    const guardado = leerJSON(AUDIO_ALMACEN); // sin memoria (o con un dato roto) queda todo activado
    const sinSonido = guardado?.sonido === false || guardado?.silenciado === true;
    // "Sin vibración" solo tiene sentido con el sonido apagado (es el paso 3); con sonido, todo está activado
    return { sinSonido, sinVibracion: sinSonido && guardado?.vibracion === false };
}

function guardarAudio() {
    guardarJSON(AUDIO_ALMACEN, { sonido: !silenciado, vibracion: !vibracionApagada });
}

// =================================================================================================================
// PERFILES DE AUDIO DIFERENCIADOS: CELULAR VS ESCRITORIO
// =================================================================================================================
// En celular, los parlantes suelen saturar con facilidad y están muy próximos al usuario: el volumen general es mucho más bajo que en
// computadora (0.4 se seguía escuchando alto; 0.2 es la mitad de amplitud, unos 6 dB menos, y vale para todo: teclas, giro, zoom y
// la música y los efectos del combate, porque todo se multiplica por este número).
// En computadora (parlantes integrados o externos, auriculares), 0.4 se percibe demasiado bajo; con 0.85 recupera
// presencia, volumen y pegada en los clics, los efectos de las cartas y la música de batalla.
const PERFIL_AUDIO = {
    movil: {
        volumenGeneral: 0.2,
        volumenTeclas: 0.1, // (antes 0.15: en el celular las teclas de los botones sobresalían del resto, un tercio menos de volumen)
    },
    escritorio: {
        volumenGeneral: 0.85,
        volumenTeclas: 0.2,
    },
};

// ¿Celular o tableta? Solo para el volumen: además de la pantalla de celular, cuenta una pantalla táctil de hasta 1024 px de
// ancho o un navegador que dice ser de un celular o una tableta (las tabletas suenan fuerte aunque la pantalla sea grande)
function esCelularOTableta() {
    return (
        PANTALLA_DE_CELULAR.matches ||
        (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024) ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    );
}

export function perfilAudioActual() {
    return esCelularOTableta() ? PERFIL_AUDIO.movil : PERFIL_AUDIO.escritorio;
}

function obtenerVolumenGeneral() {
    return perfilAudioActual().volumenGeneral;
}

const audioGuardado = leerAudioGuardado();
let silenciado = audioGuardado.sinSonido;
let vibracionApagada = audioGuardado.sinVibracion;
let salidaGeneral = null; // el "volumen maestro" de Web Audio: todos los sonidos sintetizados pasan por acá antes de salir

// A dónde se conecta cada sonido sintetizado (en vez de directo a los parlantes): así un solo control los silencia a todos
export function destinoDeAudio(contexto) {
    if (!salidaGeneral || salidaGeneral.context !== contexto) {
        salidaGeneral = contexto.createGain();
        salidaGeneral.gain.value = silenciado ? 0 : obtenerVolumenGeneral();
        salidaGeneral.connect(contexto.destination);
    }
    return salidaGeneral;
}

// Deja todo como corresponde: Web Audio por el volumen maestro y los archivos de audio con "muted", que sigue
// reproduciéndolos (en silencio) y así los tiempos del combate no cambian. Si se quitó la vibración, corta la que esté en marcha
export function aplicarSilencio() {
    const vol = obtenerVolumenGeneral();
    if (salidaGeneral) {
        // Bajada rapidísima en vez de un corte seco, para que no suene un "clic" al silenciar
        salidaGeneral.gain.setTargetAtTime(silenciado ? 0 : vol, salidaGeneral.context.currentTime, 0.01);
    }
    actualizarVolumenAudios();
    [audioMouse, musicaDelGanador, musicaDelCombate, fanfarriaDeVictoria, gritoDeVictoria, audioPajita].forEach(audio => {
        if (audio) audio.muted = silenciado;
    });
    if (vibracionApagada) {
        try {
            navigator.vibrate?.(0);
        } catch (error) {
            /* nada que cortar */
        }
    }
}

function actualizarVolumenesSegunDispositivo() {
    const perfil = perfilAudioActual();
    if (salidaGeneral && !silenciado) {
        salidaGeneral.gain.setTargetAtTime(perfil.volumenGeneral, salidaGeneral.context.currentTime, 0.02);
    }
    if (nodoVolumenTeclas) {
        nodoVolumenTeclas.gain.value = perfil.volumenTeclas;
    }
    actualizarVolumenAudios();
}

// En qué paso está el botón: "todo" (sonido y vibración), "vibracion" (solo vibración) o "nada"
function modoDelAudio() {
    if (!silenciado) return 'todo';
    return VIBRACION_DISPONIBLE && !vibracionApagada ? 'vibracion' : 'nada';
}

// El paso al que lleva el próximo toque (sin cambiar nada todavía): el toque da el aviso de ese paso, no del actual
function modoSiguienteDelAudio() {
    const modo = modoDelAudio();
    if (modo === 'todo') return VIBRACION_DISPONIBLE ? 'vibracion' : 'nada';
    return modo === 'vibracion' ? 'nada' : 'todo';
}

// Cada toque pasa al paso siguiente
function pasarAlSiguienteModoDelAudio() {
    const modo = modoDelAudio();
    if (modo === 'todo') {
        silenciado = true; // 1 → 2: se va el sonido, la vibración sigue
    } else if (modo === 'vibracion') {
        vibracionApagada = true; // 2 → 3: se va también la vibración
    } else {
        silenciado = false; // 3 → 1 (o, sin vibración, de silenciado a sonando): vuelve todo
        vibracionApagada = false;
    }
}

// La ayuda de cada paso (título y aria-label): dice cómo está y qué pasa al tocar
const AYUDA_DEL_AUDIO = VIBRACION_DISPONIBLE
    ? { todo: 'audio.todo', vibracion: 'audio.vibracion', nada: 'audio.nada' }
    : { todo: 'audio.silenciar', nada: 'audio.activar' };

function mostrarEstadoDelAudio() {
    const boton = document.getElementById('silenciar');
    if (!boton) return;
    const modo = modoDelAudio();
    const ayuda = t(AYUDA_DEL_AUDIO[modo]);
    boton.dataset.modo = modo; // el ícono: parlante con ondas, celular que vibra o parlante con cruz
    boton.classList.toggle('silenciado', silenciado); // el botón "hundido" mientras no suena
    ponerAyuda(boton, ayuda);
}

// En celular el botón no vive en la barra ni en el menú ☰: flota en la esquina de abajo a la derecha (lo dibuja el CSS cuando el botón
// es hijo directo del <body>). Acá se lo cambia de lugar según el ancho de la pantalla: en celular al <body>, en computadora
// de vuelta junto al selector de idioma. Es el mismo botón siempre, así que conserva su estado y sus eventos.
export function ubicarBotonDeAudio() {
    const boton = document.getElementById('silenciar');
    const ajustes = document.querySelector('#navbar .ajustes');
    if (!boton || !ajustes) return;
    const enCelular = PANTALLA_DE_CELULAR.matches;
    const destino = enCelular ? document.body : ajustes;
    const refInclinacion = ajustes.querySelector('#inclinacion-invertida, [data-hueco="inclinacion-invertida"]');

    if (!enCelular) {
        // En computadora debe estar en ajustes y SIEMPRE a la izquierda del botón de inclinación
        if (boton.parentElement === ajustes && (!refInclinacion || boton.nextElementSibling === refInclinacion)) return;
        const teniaElFoco = document.activeElement === boton;
        if (refInclinacion) {
            ajustes.insertBefore(boton, refInclinacion);
        } else {
            ajustes.append(boton);
        }
        if (teniaElFoco) boton.focus({ preventScroll: true });
        return;
    }

    if (boton.parentElement === destino) return;
    const teniaElFoco = document.activeElement === boton;
    destino.append(boton);
    if (teniaElFoco) boton.focus({ preventScroll: true });
}

// Aviso del botón (en celular y en computadora, una única vez por sesión): cuando suena el primer sonido de la visita —una tecla, el giro de una
// carta, el zoom, lo que sea— el botón salta y lanza ondas, para que la persona vea que ahí puede apagar el sonido.
// No se repite al recargar (la marca queda en sessionStorage). Solo cuenta un sonido que de verdad se oye: si el sonido está apagado (porque la
// persona lo apagó con el botón antes del primer sonido, o ya lo traía apagado), no se hace en ningún momento mientras siga apagado; si lo
// vuelve a activar, el primer sonido que suene sí lo hace (y desde ahí, ya no se repite), sin contar la tecla del propio toque que lo activó.
const AUDIO_AVISO_SESION = 'digimon-audio-aviso';
export const AUDIO_AVISO_DURACION = 2600; // ms: un poco más que la animación del CSS (2,4 s)

let botonDeAudioYaMostrado = hayMarcaDeSesion(AUDIO_AVISO_SESION);

function marcarBotonDeAudioMostrado() {
    botonDeAudioYaMostrado = true;
    ponerMarcaDeSesion(AUDIO_AVISO_SESION);
}

const botonDeAudio = () => document.getElementById('silenciar');
const terminarElAvisoDelBotonDeAudio = () => {
    const boton = botonDeAudio();
    if (boton) terminarLlamada(boton);
};

let teclaDelBotonDeAudio = false; // true mientras suena una tecla que no cuenta como primer sonido: la del propio botón de sonido al volver a activarlo y la del botón de inclinación (ver sonarTeclaDeBoton)

// Hace sonar algo que no cuenta como primer sonido: mientras suena, el botón de sonido no llama la atención
export function sonarSinAvisarAlBotonDeAudio(sonar) {
    teclaDelBotonDeAudio = true;
    try {
        sonar();
    } finally {
        teclaDelBotonDeAudio = false;
    }
}

function llamarLaAtencionDelBotonDeAudio() {
    if (botonDeAudioYaMostrado || silenciado || teclaDelBotonDeAudio) return;
    const boton = botonDeAudio();
    if (!boton) return;
    marcarBotonDeAudioMostrado();
    llamarLaAtencion(boton, { icono: '🔊', texto: () => t(VIBRACION_DISPONIBLE ? 'aviso.audio.vibracion' : 'aviso.audio') });
}

export function activarBotonDeAudio() {
    const boton = document.getElementById('silenciar');
    if (!boton) return;
    ubicarBotonDeAudio();
    PANTALLA_DE_CELULAR.addEventListener('change', () => {
        ubicarBotonDeAudio();
        actualizarVolumenesSegunDispositivo();
    });
    mostrarEstadoDelAudio();
    boton.addEventListener('click', () => {
        terminarElAvisoDelBotonDeAudio();
        pasarAlSiguienteModoDelAudio();
        guardarAudio();
        aplicarSilencio();
        mostrarEstadoDelAudio();
        // Este botón no suena al apretarlo (activarSonidoBotones lo deja afuera): quien lo toca para apagar el sonido no quiere oír nada.
        // Solo cuando el toque vuelve a activar el sonido suena la tecla, un instante después, cuando el volumen ya subió
        // Esa tecla no cuenta como el primer sonido del aviso del botón (no tiene sentido avisarle a quien lo está tocando): el aviso queda
        // para el primer sonido que suene después
        if (modoDelAudio() === 'todo') {
            const tecla = bajada => sonarSinAvisarAlBotonDeAudio(() => sonidoTecla(bajada));
            setTimeout(() => tecla(true), 30);
            setTimeout(() => tecla(false), 110);
        }
    });
    // Si se cambia el idioma, la ayuda del botón se vuelve a escribir en el idioma nuevo
    document.addEventListener('idioma-cambiado', mostrarEstadoDelAudio);
}

let reanudacionAudioPendiente = null;

function solicitarReanudacionAudio(contexto) {
    if (contexto.state !== 'suspended') return Promise.resolve();
    if (reanudacionAudioPendiente) return reanudacionAudioPendiente;

    const pendiente = contexto.resume();
    reanudacionAudioPendiente = pendiente;
    pendiente.then(
        () => {
            if (reanudacionAudioPendiente === pendiente) reanudacionAudioPendiente = null;
        },
        error => {
            if (reanudacionAudioPendiente === pendiente) reanudacionAudioPendiente = null;
            console.warn('No se pudo reanudar el audio:', error);
        },
    );
    return pendiente;
}

// Los navegadores solo dejan arrancar el audio dentro de un gesto "de verdad": con el dedo eso es al LEVANTARLO (touchend / pointerup /
// click), no al apoyarlo ni al deslizarlo (touchstart / pointerdown / touchmove no cuentan, ni en Chrome ni en Safari). Por eso se prepara
// en todos esos momentos: apoyar el dedo crea el audio y levantarlo es lo que lo destraba de verdad.
export function activarDesbloqueoAudio() {
    const preparar = () => prepararAudioAlTocar();
    for (const tipo of ['pointerdown', 'touchstart', 'touchend', 'pointerup', 'click', 'keydown']) {
        document.addEventListener(tipo, preparar, { capture: true, passive: true });
    }
}

function prepararAudioAlTocar() {
    try {
        contextoAudio = contextoAudio || new (window.AudioContext || window.webkitAudioContext)();
        destinoDeAudio(contextoAudio);
        if (contextoAudio.state !== 'running') {
            const fuenteSilenciosa = contextoAudio.createBufferSource();
            fuenteSilenciosa.buffer = contextoAudio.createBuffer(1, 1, contextoAudio.sampleRate);
            fuenteSilenciosa.connect(destinoDeAudio(contextoAudio));
            fuenteSilenciosa.onended = () => fuenteSilenciosa.disconnect();
            fuenteSilenciosa.start();
            // resume() directo (no el pedido compartido de solicitarReanudacionAudio): si quedó uno pendiente de un toque que todavía no
            // contaba como gesto (apoyar el dedo), ese no sirve; el que vale es el que se pide dentro de este gesto
            contextoAudio.resume().catch(() => {});
        }
    } catch (error) {
        console.warn('No se pudo preparar el audio al tocar la página:', error);
    }
}

// En el celular el primer giro casi siempre es con el dedo, a mitad del deslizamiento: en ese instante el navegador todavía no deja
// sonar nada (lo permite recién al levantar el dedo, un momento después) y el sonido se perdía. Así que si el audio todavía no está
// andando, el sonido espera a que arranque y suena apenas lo hace. Si tarda más de ESPERA_DEL_PRIMER_SONIDO, ya no suena (llegaría
// tarde, con la carta quieta). El aviso del botón de sonido también espera: sale cuando el sonido suena de verdad.
const ESPERA_DEL_PRIMER_SONIDO = 1000;
const sonidosEnEspera = [];

export function sonarCuandoElAudioEsteListo(sonar) {
    try {
        contextoAudio = contextoAudio || new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
        return;
    }
    const contexto = contextoAudio;
    if (contexto.state === 'running') return sonar();
    sonidosEnEspera.push({ sonar, desde: performance.now() });
    if (!contexto.atiendeSonidosEnEspera) {
        contexto.atiendeSonidosEnEspera = true;
        contexto.addEventListener('statechange', () => {
            if (contexto.state !== 'running') return;
            const ahora = performance.now();
            for (const pedido of sonidosEnEspera.splice(0)) {
                if (ahora - pedido.desde <= ESPERA_DEL_PRIMER_SONIDO) pedido.sonar();
            }
        });
    }
    solicitarReanudacionAudio(contexto); // por si ya está permitido (en la computadora, o después del primer toque)
}

export function obtenerContextoAudio() {
    contextoAudio = contextoAudio || new (window.AudioContext || window.webkitAudioContext)();
    destinoDeAudio(contextoAudio);
    solicitarReanudacionAudio(contextoAudio);
    llamarLaAtencionDelBotonDeAudio(); // el primer sonido de la visita (si no hay silencio) le llama la atención al botón de sonido
    return contextoAudio;
}

// ---- Archivos de audio ------------------------------------------------------------------------------------------

// Cada archivo suena a volumen maestro por su nivel relativo. La música de combate es el archivo más fuerte de todos
// (pico al máximo), así que lleva el recorte más grande; la de victoria y el sonido de victoria, un poco menos.
const LISTA_AUDIOS = [];

const audioConVolumen = (archivo, relativo = 1) => {
    const audio = new Audio(archivo);
    LISTA_AUDIOS.push({ audio, relativo });
    audio.volume = Math.min(1, obtenerVolumenGeneral() * relativo);
    return audio;
};

// Cuánto del volumen le queda a un archivo mientras se desvanece (de 0 a 1; sin desvanecerse, 1). Va aparte del volumen de cada archivo para que,
// si en pleno desvanecimiento se recalcula el volumen (por ejemplo, al cambiar el tamaño de la ventana), no se lo devuelva de golpe al máximo
const factoresDeDesvanecimiento = new Map();

function actualizarVolumenAudios() {
    const base = obtenerVolumenGeneral();
    for (const { audio, relativo } of LISTA_AUDIOS) {
        if (audio) {
            audio.volume = Math.min(1, base * relativo * (factoresDeDesvanecimiento.get(audio) ?? 1));
        }
    }
}

function ponerDesvanecimiento(audio, factor) {
    if (factor >= 1) factoresDeDesvanecimiento.delete(audio);
    else factoresDeDesvanecimiento.set(audio, Math.max(0, factor));
    actualizarVolumenAudios();
}

export const audioMouse = audioConVolumen('audio/Mouse.mp3');
audioMouse.loop = true;

export const musicaDelGanador = audioConVolumen('audio/Digimon World 3 - Victory.mp3', 0.7);

export const musicaDelCombate = audioConVolumen('audio/Digimon World - Earlygame Battle.mp3', 0.5);
musicaDelCombate.loop = true;

// El sonido de victoria original son dos cosas con un silencio en el medio: la fanfarria (el primer segundo y pico) y, más tarde, el grito
// final "¡yatta!". Están en dos archivos para que el grito suene solo si el cartel del ganador sigue abierto (ver reproducirGritoConDelay).
export const fanfarriaDeVictoria = audioConVolumen('audio/Digimon World - PSX Battle Win.mp3', 0.7);
export const gritoDeVictoria = audioConVolumen('audio/Digimon World - PSX Battle Win - Grito.mp3', 0.7);

const audioPajita = audioConVolumen('audio/Pajita.mp3');
let intervaloSonido;

// play() devuelve una promesa: si el navegador no deja sonar (por ejemplo, sin un toque previo), se ignora en vez de dejar un error en la consola
export function reproducirSonido(audio) {
    audio.play()?.catch(() => {});
}

export function detenerSonido(audio) {
    audio.pause();
    audio.currentTime = 0;
}

// -----------------------------------------------------------------------------------------------------------------
// SORBO DE LA PAJITA, sincronizado con el GIF "Trabajando" (el chico que toma de la pajita mientras usa la compu).
// Un <audio> con setInterval se desfasa: tarda un tiempo variable en arrancar y el GIF dura 1560 ms por vuelta (no 1500).
// Por eso: (1) se baja el GIF y el sonido de antemano, (2) cada vez que se abre el cartel se le da al GIF una dirección
// nueva (así empieza desde el cuadro 0, en un momento que conocemos) y (3) los sorbos se programan con Web Audio, que
// es preciso, a partir de ese momento: uno al comienzo de cada vuelta.
// -----------------------------------------------------------------------------------------------------------------
const PAJITA = {
    gif: './img/Trabajando.gif',
    audio: 'audio/Pajita.mp3',
    vuelta: 1560, // ms que dura una vuelta del GIF (22 cuadros)
    sorbo: 700, // ms que dura el sorbo: en los cuadros 0 a 9 el chico tiene la pajita en la boca
    ajuste: 0, // ms para correr el sonido si en tu compu lo sentís desfasado: negativo = antes, positivo = después
};

let descargasPajita = null; // promesa con el GIF y el sonido ya bajados ({ gif, audio }), o null si no se pudo
let bufferPajita = null;
let temporizadorPajita = null;
let direccionGifPajita = null;
const sorbosSonando = new Set();

// Baja el GIF y el sonido una sola vez (se pide al elegir la primera carta, así ya están cuando empieza el combate)
export function precargarPajita() {
    descargasPajita ||= Promise.all([
        fetch(PAJITA.gif).then(r => (r.ok ? r.blob() : Promise.reject(new Error(r.status)))),
        fetch(PAJITA.audio).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status)))),
    ])
        .then(([gif, audio]) => ({ gif, audio }))
        .catch(() => null);
    return descargasPajita;
}

// Deja listo el sorbo. Se llama desde el clic de "Iniciar Combate" (sin un clic el navegador no deja sonar el audio)
export async function prepararPajita() {
    try {
        const ctx = obtenerContextoAudio(); // el mismo contexto de Web Audio que usan los sonidos de las cartas
        await ctx.resume();
        if (ctx.state !== 'running') return null;
        // Si todavía no se bajó, se espera un poco; si tarda demasiado, se sigue sin sincronizar
        const descargas = await Promise.race([precargarPajita(), new Promise(resolver => setTimeout(resolver, 2500, null))]);
        if (!descargas) return null;
        bufferPajita ||= await ctx.decodeAudioData(descargas.audio.slice(0));
        return descargas;
    } catch (error) {
        return null;
    }
}

// Pone el GIF en la pantallita con una dirección nueva (arranca desde el cuadro 0) y, apenas se dibuja el primer cuadro,
// empieza a programar los sorbos
export async function arrancarGifConSorbo(ventana, descargas) {
    const gif = ventana.querySelector('.combate-pantalla img');
    if (!gif) return;
    try {
        direccionGifPajita = URL.createObjectURL(descargas.gif);
        gif.src = direccionGifPajita;
        await gif.decode();
        await new Promise(resolver => requestAnimationFrame(resolver)); // se dibuja el primer cuadro (y ahí arranca el GIF)
        await new Promise(resolver => requestAnimationFrame(resolver));
        if (gif.isConnected) sincronizarPajita(performance.now());
    } catch (error) {
        // Si el cartel se cerró justo en este momento no hay nada que sincronizar
    }
}

// "inicio" = el instante (performance.now) en que el GIF empieza una vuelta. Un sorbo al comienzo de cada una
function sincronizarPajita(inicio) {
    let vuelta = 0;
    const programar = () => {
        let cuando = inicio + vuelta * PAJITA.vuelta + PAJITA.ajuste;
        while (cuando < performance.now() - 150) cuando = inicio + ++vuelta * PAJITA.vuelta + PAJITA.ajuste; // si la página se trabó, se saltean los sorbos perdidos
        // Se programa con 120 ms de anticipación: Web Audio hace el resto con exactitud
        temporizadorPajita = setTimeout(
            () => {
                sonarSorbo(cuando);
                vuelta++;
                programar();
            },
            Math.max(0, cuando - performance.now() - 120),
        );
    };
    programar();
}

// Un sorbo que empieza en "cuando" (instante de performance.now) y dura PAJITA.sorbo, con entrada y salida suaves
function sonarSorbo(cuando) {
    const ctx = obtenerContextoAudio();
    const duracion = PAJITA.sorbo / 1000;
    // El audio tarda un poquito en salir por los parlantes: se lo adelanta lo que informa el navegador
    const inicio = Math.max(ctx.currentTime, ctx.currentTime + (cuando - performance.now()) / 1000 - (ctx.outputLatency || 0));
    const fuente = ctx.createBufferSource();
    const volumen = ctx.createGain();
    fuente.buffer = bufferPajita;
    volumen.gain.setValueAtTime(0, inicio);
    volumen.gain.linearRampToValueAtTime(1, inicio + 0.01);
    volumen.gain.setValueAtTime(1, inicio + duracion - 0.06);
    volumen.gain.linearRampToValueAtTime(0, inicio + duracion);
    fuente.connect(volumen).connect(destinoDeAudio(ctx));
    fuente.start(inicio, 0, duracion);
    sorbosSonando.add(fuente);
    fuente.onended = () => sorbosSonando.delete(fuente);
}

// Plan B (sin sincronizar): el mismo ritmo del GIF, pero el sonido arranca cuando se abre el cartel
export function reproducirPajita() {
    const sorbo = () => {
        audioPajita.currentTime = 0;
        reproducirSonido(audioPajita);
        setTimeout(() => audioPajita.pause(), PAJITA.sorbo);
    };
    sorbo();
    intervaloSonido = setInterval(sorbo, PAJITA.vuelta);
}

export function detenerSonidoPajita() {
    clearInterval(intervaloSonido);
    clearTimeout(temporizadorPajita);
    sorbosSonando.forEach(fuente => {
        try {
            fuente.stop();
        } catch (error) {
            /* ya había terminado */
        }
    });
    sorbosSonando.clear();
    audioPajita.pause();
    audioPajita.currentTime = 0;
    if (direccionGifPajita) {
        URL.revokeObjectURL(direccionGifPajita);
        direccionGifPajita = null;
    }
}

// La música del ganador entra 2,45 s después del sonido de victoria. Si el cartel se cierra antes, se cancela (cancelarMusicaGanador).
// El archivo dura 3 minutos, pero no suena hasta el final: a los 10 s de empezar baja de a poco hasta el silencio (4 s de desvanecimiento
// lento) y se termina. El desvanecimiento sigue el avance de la propia música (currentTime) y no un reloj aparte, así que no se desfasa si
// el archivo tarda en arrancar.
// (En iPhone el navegador no deja cambiar el volumen de los archivos de audio: ahí no hay desvanecimiento y la música se corta al final de él.)
const MUSICA_GANADOR_SEGUNDOS_A_VOLUMEN_PLENO = 10; // s de música antes de que empiece a bajar
const MUSICA_GANADOR_SEGUNDOS_DE_DESVANECIMIENTO = 4; // s que tarda en llegar al silencio
let temporizadorMusicaGanador = 0;
let vigilanteDeLaMusicaGanador = 0;

export function reproducirConDelay() {
    cancelarMusicaGanador();
    temporizadorMusicaGanador = setTimeout(() => {
        reproducirSonido(musicaDelGanador);
        vigilanteDeLaMusicaGanador = setInterval(desvanecerMusicaGanador, 50);
    }, 2450);
}

// Cada 50 ms: según cuánto lleva sonando la música, le baja el volumen; al llegar al silencio la corta
function desvanecerMusicaGanador() {
    const segundos = musicaDelGanador.currentTime - MUSICA_GANADOR_SEGUNDOS_A_VOLUMEN_PLENO;
    if (segundos <= 0) return;
    const queda = 1 - segundos / MUSICA_GANADOR_SEGUNDOS_DE_DESVANECIMIENTO;
    if (queda > 0) {
        ponerDesvanecimiento(musicaDelGanador, queda);
        return;
    }
    detenerSonido(musicaDelGanador); // (primero se corta y recién después se le devuelve el volumen: así no se oye un chasquido)
    cancelarMusicaGanador();
}

// Cancela la música del ganador que estaba por entrar o desvaneciéndose, y deja su volumen listo para la próxima vez
export function cancelarMusicaGanador() {
    clearTimeout(temporizadorMusicaGanador);
    temporizadorMusicaGanador = 0;
    clearInterval(vigilanteDeLaMusicaGanador);
    vigilanteDeLaMusicaGanador = 0;
    ponerDesvanecimiento(musicaDelGanador, 1);
}

// El grito final de la victoria entra 1,95 s después de la fanfarria (justo donde estaba en el sonido original, antes de partirlo en
// dos). Solo suena si el cartel del ganador sigue abierto: si se cierra antes, no entra; si se cierra mientras suena, se corta
// (cancelarGritoDeVictoria).
let temporizadorGritoDeVictoria = 0;

export function reproducirGritoConDelay() {
    cancelarGritoDeVictoria();
    temporizadorGritoDeVictoria = setTimeout(() => reproducirSonido(gritoDeVictoria), 1950);
}

export function cancelarGritoDeVictoria() {
    clearTimeout(temporizadorGritoDeVictoria);
    temporizadorGritoDeVictoria = 0;
    detenerSonido(gritoDeVictoria);
}
