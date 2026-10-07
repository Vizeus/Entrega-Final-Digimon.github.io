// -----------------------------------------------------------------------------------------------------------------
// SONIDO Y VIBRACIÓN
//
// El botón de sonido (sonido + vibración → solo vibración → nada), el volumen según el dispositivo, el desbloqueo del audio (el
// navegador no deja sonar nada hasta que la persona toca la página), los archivos de audio (la música del combate y del
// ganador, el mouse, la pajita del GIF "Trabajando") y la vibración.
// -----------------------------------------------------------------------------------------------------------------

// Vibración corta al tocar botones con el dedo, como una tecla física. Solo en los celulares que la permiten
// (Android; en iPhone el navegador no deja vibrar). El navegador solo la permite después del primer toque en la página.
function vibrar(duracion = 8, forzar = false) {
    if (!navigator.vibrate || (vibracionApagada && !forzar)) return; // vibracionApagada: la persona la quitó con el botón de sonido (#silenciar)
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try {
        navigator.vibrate(duracion);
    } catch (error) {
        // Si no se puede vibrar, no pasa nada
    }
}

function activarVibracion() {
    if (!navigator.vibrate) return;
    document.addEventListener('pointerdown', evento => {
        if (evento.pointerType !== 'touch') return;
        // También los "botones" del frente de la carta (gema, nivel, tipo, elemento), que son <span role="button">
        const boton = evento.target.closest('button, [role="button"]');
        if (!boton || boton.disabled) return;
        if (boton.id === 'silenciar') {
            // El botón de sonido vibra según a dónde lleva el toque y no según cómo está ahora: al pasar a "solo vibración" y al volver a
            // activar todo vibra; al pasar a "nada" (donde ya no hay vibración) ese toque no vibra. Cuando vuelve a "todo" la vibración
            // todavía figura apagada, por eso se fuerza.
            if (modoSiguienteDelAudio() !== 'nada') vibrar(8, true);
            return;
        }
        // Los del frente de la carta, una mini vibración (como su tecla, que también es más suave)
        vibrar(boton.matches('[role="button"]') ? 6 : 8);
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
// (Android; en iPhone el navegador no deja vibrar y en computadora no hay con qué)
const VIBRACION_DISPONIBLE = Boolean(navigator.vibrate) && CON_DEDO.matches;

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
        volumenTeclas: 0.15,
    },
    escritorio: {
        volumenGeneral: 0.85,
        volumenTeclas: 0.2,
    },
};

function esDispositivoMovil() {
    if (typeof window === 'undefined') return false;
    return (
        PANTALLA_DE_CELULAR.matches ||
        (typeof navigator !== 'undefined' &&
            ((navigator.maxTouchPoints > 1 && window.innerWidth <= 1024) || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)))
    );
}

function perfilAudioActual() {
    return esDispositivoMovil() ? PERFIL_AUDIO.movil : PERFIL_AUDIO.escritorio;
}

function obtenerVolumenGeneral() {
    return perfilAudioActual().volumenGeneral;
}

const audioGuardado = leerAudioGuardado();
let silenciado = audioGuardado.sinSonido;
let vibracionApagada = audioGuardado.sinVibracion;
let salidaGeneral = null; // el "volumen maestro" de Web Audio: todos los sonidos sintetizados pasan por acá antes de salir

// A dónde se conecta cada sonido sintetizado (en vez de directo a los parlantes): así un solo control los silencia a todos
function destinoDeAudio(contexto) {
    if (!salidaGeneral || salidaGeneral.context !== contexto) {
        salidaGeneral = contexto.createGain();
        salidaGeneral.gain.value = silenciado ? 0 : obtenerVolumenGeneral();
        salidaGeneral.connect(contexto.destination);
    }
    return salidaGeneral;
}

// Deja todo como corresponde: Web Audio por el volumen maestro y los archivos de audio con "muted", que sigue
// reproduciéndolos (en silencio) y así los tiempos del combate no cambian. Si se quitó la vibración, corta la que esté en marcha
function aplicarSilencio() {
    const vol = obtenerVolumenGeneral();
    if (salidaGeneral) {
        // Bajada rapidísima en vez de un corte seco, para que no suene un "clic" al silenciar
        salidaGeneral.gain.setTargetAtTime(silenciado ? 0 : vol, salidaGeneral.context.currentTime, 0.01);
    }
    actualizarVolumenAudios();
    [audioMouse, winMusic, battleMusic, winSound, audioPajita].forEach(audio => {
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
function ubicarBotonDeAudio() {
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
const AUDIO_AVISO_DURACION = 2600; // ms: un poco más que la animación del CSS (2,4 s)

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

function llamarLaAtencionDelBotonDeAudio() {
    if (botonDeAudioYaMostrado || silenciado || teclaDelBotonDeAudio) return;
    const boton = botonDeAudio();
    if (!boton) return;
    marcarBotonDeAudioMostrado();
    llamarLaAtencion(boton, { icono: '🔊', texto: () => t(VIBRACION_DISPONIBLE ? 'aviso.audio.vibracion' : 'aviso.audio') });
}

function activarBotonDeAudio() {
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
            const tecla = bajada => {
                teclaDelBotonDeAudio = true;
                sonidoTecla(bajada);
                teclaDelBotonDeAudio = false;
            };
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
function activarDesbloqueoAudio() {
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

function sonarCuandoElAudioEsteListo(sonar) {
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

function obtenerContextoAudio() {
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

function actualizarVolumenAudios() {
    const base = obtenerVolumenGeneral();
    for (const { audio, relativo } of LISTA_AUDIOS) {
        if (audio) {
            audio.volume = Math.min(1, base * relativo);
        }
    }
}

const audioMouse = audioConVolumen('audio/Mouse.mp3');
audioMouse.loop = true;

const winMusic = audioConVolumen('audio/Digimon World 3 - Victory.mp3', 0.7);

const battleMusic = audioConVolumen('audio/Digimon World - Earlygame Battle.mp3', 0.5);
battleMusic.loop = true;

const winSound = audioConVolumen('audio/Digimon World - PSX Battle Win.mp3', 0.7);

const audioPajita = audioConVolumen('audio/Pajita.mp3');
let intervaloSonido;

// play() devuelve una promesa: si el navegador no deja sonar (por ejemplo, sin un toque previo), se ignora en vez de dejar un error en la consola
function reproducirSonido(audio) {
    audio.play()?.catch(() => {});
}

function detenerSonido(audio) {
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
function precargarPajita() {
    descargasPajita ||= Promise.all([
        fetch(PAJITA.gif).then(r => (r.ok ? r.blob() : Promise.reject(new Error(r.status)))),
        fetch(PAJITA.audio).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status)))),
    ])
        .then(([gif, audio]) => ({ gif, audio }))
        .catch(() => null);
    return descargasPajita;
}

// Deja listo el sorbo. Se llama desde el clic de "Iniciar Combate" (sin un clic el navegador no deja sonar el audio)
async function prepararPajita() {
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
async function arrancarGifConSorbo(ventana, descargas) {
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
function reproducirPajita() {
    const sorbo = () => {
        audioPajita.currentTime = 0;
        reproducirSonido(audioPajita);
        setTimeout(() => audioPajita.pause(), PAJITA.sorbo);
    };
    sorbo();
    intervaloSonido = setInterval(sorbo, PAJITA.vuelta);
}

function detenerSonidoPajita() {
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

// La música del ganador entra 2,45 s después del sonido de victoria. Si el cartel se cierra antes, se cancela (cancelarMusicaGanador)
let temporizadorMusicaGanador = 0;

function reproducirConDelay() {
    cancelarMusicaGanador();
    temporizadorMusicaGanador = setTimeout(() => reproducirSonido(winMusic), 2450);
}

function cancelarMusicaGanador() {
    clearTimeout(temporizadorMusicaGanador);
    temporizadorMusicaGanador = 0;
}
