// -----------------------------------------------------------------------------------------------------------------
// SONIDOS SINTETIZADOS (Web Audio): se fabrican en el momento, sin archivos de audio
//
// Teclas, toque de carta, selección, giro, zoom, el papel de los ficheros (ataques y desplegables) y qué botones suenan.
// -----------------------------------------------------------------------------------------------------------------

import { destinoDeAudio, obtenerContextoAudio, perfilAudioActual, sonarCuandoElAudioEsteListo, sonarSinAvisarAlBotonDeAudio } from './audio.js';

// ---- Tecla de teclado mecánico ------------------------------------------------------------------------------------
// Una tecla real suena a tres cosas juntas: un "clic" agudo (el mecanismo), un golpe seco (la tecla llegando al fondo)
// y un "thock" grave que resuena en la carcasa. Al soltar hay otro clic, más suave y más agudo.
const ruidosPorContexto = new WeakMap();

// Un poco de ruido blanco, que reutilizan todos los sonidos. Dura 0,6 s: alcanza para el más largo (el giro de la carta, 0,55 s)
function obtenerRuido(contexto) {
    if (!ruidosPorContexto.has(contexto)) {
        const largo = Math.floor(contexto.sampleRate * 0.6);
        const buffer = contexto.createBuffer(1, largo, contexto.sampleRate);
        const datos = buffer.getChannelData(0);
        for (let i = 0; i < largo; i++) {
            datos[i] = Math.random() * 2 - 1;
        }
        ruidosPorContexto.set(contexto, buffer);
    }
    return ruidosPorContexto.get(contexto);
}

// Una ráfaga corta de ruido filtrado: la base de los clics de las teclas, de los roces de papel y del crujido de las hojas.
// El volumen sube hasta "pico" en "subida" segundos y se apaga a los "duracion" segundos (contados desde "inicio").
// "corrida": cada ráfaga arranca en un lugar al azar del ruido (hasta esos segundos), así no suenan todas igual.
// "cola": cuánto más sigue sonando la fuente después de apagarse el volumen.
function rafagaDeRuido(contexto, destino, { inicio, frecuencia, q, pico, duracion, subida = 0.002, corrida = 0.05, cola = 0.01 }) {
    const fuente = contexto.createBufferSource();
    fuente.buffer = obtenerRuido(contexto);
    const filtro = contexto.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = frecuencia;
    filtro.Q.value = q;
    const volumen = contexto.createGain();
    volumen.gain.setValueAtTime(0.0001, inicio);
    volumen.gain.exponentialRampToValueAtTime(pico, inicio + subida);
    volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    fuente.connect(filtro);
    filtro.connect(volumen);
    volumen.connect(destino);
    fuente.start(inicio, Math.random() * corrida);
    fuente.stop(inicio + duracion + cola);
}

// Volumen de las teclas: se adapta según el perfil de audio (celular vs escritorio).
// GANANCIA_TECLAS empuja el sonido contra ese tope (más ganancia = suena más "lleno" y más fuerte, pero también más comprimido).
const GANANCIA_TECLAS = 0.85;
let salidaTeclas;
export let nodoVolumenTeclas;

// Salida común de las teclas. Cadena: compresor (suaviza los golpes fuertes) -> ganancia -> saturador suave (tanh) -> volumen.
// El saturador redondea los picos en vez de cortarlos, así se puede subir el volumen sin que suene rota.
function crearSalidaTeclas(contexto) {
    const compresor = contexto.createDynamicsCompressor();
    compresor.threshold.value = -18;
    compresor.knee.value = 10;
    compresor.ratio.value = 8;
    compresor.attack.value = 0.001;
    compresor.release.value = 0.08;

    const ganancia = contexto.createGain();
    ganancia.gain.value = GANANCIA_TECLAS;

    const saturador = contexto.createWaveShaper();
    const curva = new Float32Array(1024);
    for (let i = 0; i < curva.length; i++) {
        const x = (i / (curva.length - 1)) * 2 - 1;
        curva[i] = Math.tanh(2 * x) / Math.tanh(2);
    }
    saturador.curve = curva;
    saturador.oversample = '2x';

    nodoVolumenTeclas = contexto.createGain();
    nodoVolumenTeclas.gain.value = perfilAudioActual().volumenTeclas;

    compresor.connect(ganancia);
    ganancia.connect(saturador);
    saturador.connect(nodoVolumenTeclas);
    nodoVolumenTeclas.connect(destinoDeAudio(contexto));
    return compresor;
}

// Las dos "teclas": la de siempre (barra, filtros y menús) y la de todos los botones de la carta (info, ataques y evolución),
// que es la misma pero un toque más bajita de volumen y más aguda de tono (fuerza: multiplica el volumen; tono: multiplica la afinación)
const TECLA_NORMAL = { fuerza: 1, tono: 1 };
const TECLA_DE_CARTA = { fuerza: 0.65, tono: 1.25 };

// Arma una pulsación (bajada = true) o el soltar la tecla (bajada = false) en el instante t
function armarTecla(contexto, destino, t, bajada, tecla = TECLA_NORMAL) {
    const fuerza = (bajada ? 1 : 0.45) * tecla.fuerza;
    // Cada pulsación suena apenas distinta, como pasa con una tecla de verdad
    const afinacion = (0.94 + Math.random() * 0.12) * tecla.tono;

    // Ráfaga corta de ruido filtrado: es el "clic"
    const chasquido = (retraso, frecuencia, q, pico, duracion) =>
        rafagaDeRuido(contexto, destino, { inicio: t + retraso, frecuencia: frecuencia * afinacion, q, pico: pico * fuerza, duracion, subida: 0.001 });

    // Tono que cae rápido: es el golpe y el "thock" grave
    const golpe = (retraso, tipo, desde, hasta, pico, duracion) => {
        const inicio = t + retraso;
        const oscilador = contexto.createOscillator();
        oscilador.type = tipo;
        oscilador.frequency.setValueAtTime(desde * afinacion, inicio);
        oscilador.frequency.exponentialRampToValueAtTime(hasta * afinacion, inicio + duracion * 0.6);
        const volumen = contexto.createGain();
        volumen.gain.setValueAtTime(0.0001, inicio);
        volumen.gain.exponentialRampToValueAtTime(pico * fuerza, inicio + 0.002);
        volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
        oscilador.connect(volumen);
        volumen.connect(destino);
        oscilador.start(inicio);
        oscilador.stop(inicio + duracion + 0.01);
    };

    if (bajada) {
        chasquido(0, 3000, 1.1, 5.4, 0.03); // clic agudo del mecanismo
        chasquido(0.004, 1300, 0.8, 3.6, 0.055); // la tecla llega al fondo
        golpe(0.002, 'triangle', 380, 170, 0.17, 0.12); // "thock" de la carcasa
        golpe(0, 'sine', 2400, 2100, 0.085, 0.02); // toque de plástico
    } else {
        chasquido(0, 4400, 1.5, 5.4, 0.025); // clic suave y agudo del resorte al volver
        golpe(0, 'triangle', 420, 240, 0.3, 0.05);
    }
}

// Suena la tecla apretada (bajada = true) o soltada (bajada = false)
export function sonidoTecla(bajada = true, tecla = TECLA_NORMAL) {
    try {
        const contexto = obtenerContextoAudio();
        salidaTeclas = salidaTeclas || crearSalidaTeclas(contexto);
        armarTecla(contexto, salidaTeclas, contexto.currentTime, bajada, tecla);
    } catch (error) {
        // Si el navegador no permite audio, simplemente no suena
    }
}

// El toquecito de una carta que se apoya (al terminar de girar y al volver a su lugar desde el zoom): un roce seco de papel,
// muy bajito y casi sin cuerpo grave. Una carta casi no pesa: no es un golpe sobre la mesa.
function toqueDeCarta(contexto, llegada) {
    rafagaDeRuido(contexto, destinoDeAudio(contexto), { inicio: llegada, frecuencia: 2200, q: 1, pico: 0.09, duracion: 0.04, cola: 0.02 });

    const cuerpo = contexto.createOscillator();
    const volumenCuerpo = contexto.createGain();
    cuerpo.type = 'sine';
    cuerpo.frequency.setValueAtTime(200, llegada);
    cuerpo.frequency.exponentialRampToValueAtTime(120, llegada + 0.05);
    volumenCuerpo.gain.setValueAtTime(0.0001, llegada);
    volumenCuerpo.gain.exponentialRampToValueAtTime(0.035, llegada + 0.003);
    volumenCuerpo.gain.exponentialRampToValueAtTime(0.0001, llegada + 0.06);
    cuerpo.connect(volumenCuerpo);
    volumenCuerpo.connect(destinoDeAudio(contexto));
    cuerpo.start(llegada);
    cuerpo.stop(llegada + 0.07);
}

// Al elegir una carta para el combate y al sacarla de la selección: dos toquecitos secos, breves y suaves, de la familia del "tuc" con el que
// termina de darse vuelta una carta (un roce de papel con un poquito de cuerpo), pero más cortos y más bajitos. Al elegirla suena un "tuc" algo más
// grave (la carta se apoya); al sacarla, un "tic" más agudo y más flojo (se levanta). En el celular cada uno viene con una vibración chiquita,
// más corta al sacarla (ver el clic de las cartas en agregarCarta).
export function sonidoSeleccion(elegida) {
    try {
        const contexto = obtenerContextoAudio();
        const inicio = contexto.currentTime;
        const destino = destinoDeAudio(contexto);
        // [frecuencia del roce, volumen del roce, tono del cuerpo al empezar y al terminar, volumen del cuerpo, duración del roce]
        const [frecuencia, volumenRoce, desde, hasta, volumenCuerpo, duracion] = elegida
            ? [2000, 0.07, 210, 130, 0.028, 0.035]
            : [3200, 0.04, 330, 240, 0.015, 0.025];

        rafagaDeRuido(contexto, destino, { inicio, frecuencia, q: 1, pico: volumenRoce, duracion, cola: 0.02 });

        const cuerpo = contexto.createOscillator();
        cuerpo.type = 'sine';
        cuerpo.frequency.setValueAtTime(desde, inicio);
        cuerpo.frequency.exponentialRampToValueAtTime(hasta, inicio + duracion * 1.3);
        const volumenDelCuerpo = contexto.createGain();
        volumenDelCuerpo.gain.setValueAtTime(0.0001, inicio);
        volumenDelCuerpo.gain.exponentialRampToValueAtTime(volumenCuerpo, inicio + 0.003);
        volumenDelCuerpo.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion * 1.4);
        cuerpo.connect(volumenDelCuerpo);
        volumenDelCuerpo.connect(destino);
        cuerpo.start(inicio);
        cuerpo.stop(inicio + duracion * 1.4 + 0.02);
    } catch (error) {
        // Si el navegador no permite audio, simplemente no suena
    }
}

// Carta que se da vuelta: un "fshh" de papel cortando el aire mientras gira y, al terminar, el toquecito de apoyarse
export function sonidoVuelta() {
    sonarCuandoElAudioEsteListo(sonidoVueltaAhora);
}

function sonidoVueltaAhora() {
    try {
        const contexto = obtenerContextoAudio();
        const t = contexto.currentTime;

        // Ruido blanco filtrado: el filtro sube de tono durante la primera mitad del giro y baja en la segunda
        const ruido = contexto.createBufferSource();
        ruido.buffer = obtenerRuido(contexto);

        const banda = contexto.createBiquadFilter();
        banda.type = 'bandpass';
        banda.Q.value = 0.9;
        banda.frequency.setValueAtTime(700, t);
        banda.frequency.exponentialRampToValueAtTime(3200, t + 0.23);
        banda.frequency.exponentialRampToValueAtTime(900, t + 0.46);

        const agudos = contexto.createBiquadFilter();
        agudos.type = 'highpass';
        agudos.frequency.value = 400;

        const volumenRuido = contexto.createGain();
        volumenRuido.gain.setValueAtTime(0.0001, t);
        volumenRuido.gain.exponentialRampToValueAtTime(0.22, t + 0.11);
        volumenRuido.gain.exponentialRampToValueAtTime(0.05, t + 0.24);
        volumenRuido.gain.exponentialRampToValueAtTime(0.13, t + 0.34);
        volumenRuido.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

        ruido.connect(banda);
        banda.connect(agudos);
        agudos.connect(volumenRuido);
        volumenRuido.connect(destinoDeAudio(contexto));
        ruido.start(t);
        ruido.stop(t + 0.55);

        toqueDeCarta(contexto, t + 0.46); // el roce final cuando termina de girar
    } catch (error) {
        // Si el navegador no permite audio, simplemente no suena
    }
}

// Zoom de la carta: el "fwip" de una carta de cartulina movida en el aire (aire filtrado con un aleteo rápido, como el de
// una carta que se agita). Al abrir sube de tono y suena solo eso; al cerrar baja de tono y, cuando la carta vuelve a su
// lugar, se apoya con el toquecito de siempre. Es sutil.
export function sonidoZoom(abrir) {
    try {
        const contexto = obtenerContextoAudio();
        const ahora = contexto.currentTime;
        const afinacion = 0.94 + Math.random() * 0.12; // cada vez suena apenas distinto, como una carta de verdad
        const duracion = abrir ? 0.34 : 0.28;

        // El aire: ruido filtrado que barre hacia arriba (al abrir) o hacia abajo (al cerrar)
        const ruido = contexto.createBufferSource();
        ruido.buffer = obtenerRuido(contexto);
        ruido.loop = true;

        const agudos = contexto.createBiquadFilter();
        agudos.type = 'highpass';
        agudos.frequency.value = 700;

        const banda = contexto.createBiquadFilter();
        banda.type = 'bandpass';
        banda.Q.value = 0.8;
        banda.frequency.setValueAtTime((abrir ? 1400 : 3600) * afinacion, ahora);
        banda.frequency.exponentialRampToValueAtTime((abrir ? 3800 : 1500) * afinacion, ahora + duracion);

        // El aleteo: el volumen sube y baja unas 28 veces por segundo, como la cartulina vibrando
        const aleteo = contexto.createGain();
        aleteo.gain.value = 0.55;
        const oscilador = contexto.createOscillator();
        oscilador.type = 'sine';
        oscilador.frequency.value = 28 * afinacion;
        const profundidad = contexto.createGain();
        profundidad.gain.value = 0.45;
        oscilador.connect(profundidad);
        profundidad.connect(aleteo.gain);

        const volumen = contexto.createGain();
        volumen.gain.setValueAtTime(0.0001, ahora);
        volumen.gain.exponentialRampToValueAtTime(abrir ? 0.28 : 0.2, ahora + duracion * 0.35);
        volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + duracion);

        ruido.connect(agudos);
        agudos.connect(banda);
        banda.connect(aleteo);
        aleteo.connect(volumen);
        volumen.connect(destinoDeAudio(contexto));
        ruido.start(ahora);
        oscilador.start(ahora);
        ruido.stop(ahora + duracion + 0.02);
        oscilador.stop(ahora + duracion + 0.02);

        // Al abrir la carta queda "en la mano": no hay ningún golpe. Solo al cerrar, cuando vuelve a su lugar, se apoya
        // con el mismo toquecito que al terminar de dar vuelta la carta
        if (!abrir) toqueDeCarta(contexto, ahora + 0.44);
    } catch (error) {
        // Si el navegador no permite audio, simplemente no suena
    }
}

// ---- Sonido de fichero (papeles) ---------------------------------------------------------------------------------------
// Dos sonidos muy sutiles de papeles que se abren y se vuelven a cerrar, como los de un fichero. Los usan:
//   · los botones de cada ataque (se despliega o se recoge la descripción): suenan SOLOS, sin la tecla;
//   · los desplegables de los filtros (Tipo, Nivel, Elemento) y de los menús "Info.": suenan después de la tecla del botón, más bajito.
// Abrir: un golpecito de tapa, un barrido de aire que sube y un crujido de hojas. Cerrar: el barrido baja, el crujido se apaga y las hojas se apoyan.
export const FICHERO_DE_ATAQUES = 1; // fuerza con que suena en los botones de los ataques (el sonido de referencia)
const FICHERO_DE_DESPLEGABLES = 0.5; // en los desplegables de los filtros y de "Info.": la mitad, más bajito aún
const RETRASO_FICHERO_DESPLEGABLES = 0.001; // segundos: el fichero entra un milisegundo después del sonido del botón

// Arma el sonido en el instante t. fuerza multiplica todos los volúmenes (1 = el de los ataques)
function armarFichero(contexto, destino, t, abrir, fuerza = 1) {
    const afinacion = 0.95 + Math.random() * 0.1; // cada vez suena apenas distinto, como un papel de verdad
    const duracion = abrir ? 0.2 : 0.17;

    // Una ráfaga corta de ruido filtrado: un crujido de hoja (o el golpecito de la tapa)
    const rafaga = (retraso, frecuencia, q, pico, largo) =>
        rafagaDeRuido(contexto, destino, {
            inicio: t + retraso,
            frecuencia: frecuencia * afinacion,
            q,
            pico: Math.max(pico * fuerza, 0.0002),
            duracion: largo,
            corrida: 0.04,
        });

    // El aire que mueven las hojas: ruido filtrado que barre hacia arriba (al abrir) o hacia abajo (al cerrar)
    const aire = contexto.createBufferSource();
    aire.buffer = obtenerRuido(contexto);
    aire.loop = true;
    const agudos = contexto.createBiquadFilter();
    agudos.type = 'highpass';
    agudos.frequency.value = 600;
    const banda = contexto.createBiquadFilter();
    banda.type = 'bandpass';
    banda.Q.value = 0.7;
    banda.frequency.setValueAtTime((abrir ? 1500 : 3200) * afinacion, t);
    banda.frequency.exponentialRampToValueAtTime((abrir ? 3400 : 1400) * afinacion, t + duracion);
    const volumenAire = contexto.createGain();
    volumenAire.gain.setValueAtTime(0.0001, t);
    volumenAire.gain.exponentialRampToValueAtTime(Math.max((abrir ? 0.1 : 0.08) * fuerza, 0.0002), t + duracion * 0.3);
    volumenAire.gain.exponentialRampToValueAtTime(0.0001, t + duracion);
    aire.connect(agudos);
    agudos.connect(banda);
    banda.connect(volumenAire);
    volumenAire.connect(destino);
    aire.start(t);
    aire.stop(t + duracion + 0.02);

    // El crujido de las hojas: granitos de ruido con tonos distintos. Al abrir se reparten al principio; al cerrar, hacia el final
    const granos = abrir ? 6 : 5;
    for (let i = 0; i < granos; i++) {
        const lugar = (i + Math.random() * 0.6) / granos; // 0..1 a lo largo del sonido
        const retraso = abrir ? 0.015 + lugar * 0.13 : 0.02 + Math.pow(lugar, 0.6) * 0.1;
        rafaga(retraso, 2200 + Math.random() * 4300, 2 + Math.random() * 2, 0.045 + Math.random() * 0.03, 0.008 + Math.random() * 0.012);
    }

    if (abrir) {
        rafaga(0, 900, 1.2, 0.06, 0.02); // el golpecito de la tapa al levantarse
    } else {
        // Las hojas se apoyan: el mismo toquecito de papel de la carta, pero más bajito
        rafaga(0.15, 1700, 1, 0.07, 0.03);
        const cuerpo = contexto.createOscillator();
        const volumenCuerpo = contexto.createGain();
        cuerpo.type = 'sine';
        cuerpo.frequency.setValueAtTime(170 * afinacion, t + 0.15);
        cuerpo.frequency.exponentialRampToValueAtTime(105 * afinacion, t + 0.2);
        volumenCuerpo.gain.setValueAtTime(0.0001, t + 0.15);
        volumenCuerpo.gain.exponentialRampToValueAtTime(Math.max(0.022 * fuerza, 0.0002), t + 0.153);
        volumenCuerpo.gain.exponentialRampToValueAtTime(0.0001, t + 0.21);
        cuerpo.connect(volumenCuerpo);
        volumenCuerpo.connect(destino);
        cuerpo.start(t + 0.15);
        cuerpo.stop(t + 0.22);
    }
}

// Suena el fichero abriéndose (abrir = true) o cerrándose. retraso: segundos de espera desde ahora
export function sonidoFichero(abrir = true, fuerza = FICHERO_DE_ATAQUES, retraso = 0) {
    try {
        const contexto = obtenerContextoAudio();
        armarFichero(contexto, destinoDeAudio(contexto), contexto.currentTime + retraso, abrir, fuerza);
    } catch (error) {
        // Si el navegador no permite audio, simplemente no suena
    }
}

// Los desplegables de los filtros y de los menús "Info." marcan con la clase "abierto" que están desplegados. Se mira ese cambio en vez de
// los clics: así suena igual cuando se abren con el botón, con el teclado, o cuando se cierran con un toque afuera, con Esc, al elegir una
// opción o al cerrarse el menú ☰ del celular. Solo cuenta el cambio de abierto a cerrado (o al revés), no cualquier otra clase que se toque.
export function activarSonidoDeDesplegables() {
    const estaba = new WeakMap(); // si cada desplegable estaba abierto la última vez que se miró
    const observador = new MutationObserver(cambios => {
        for (const cambio of cambios) {
            const desplegable = cambio.target;
            const abierto = desplegable.classList.contains('abierto');
            if (estaba.get(desplegable) === abierto) continue;
            estaba.set(desplegable, abierto);
            sonidoFichero(abierto, FICHERO_DE_DESPLEGABLES, RETRASO_FICHERO_DESPLEGABLES);
        }
    });
    document.querySelectorAll('.f-grupo, .menu-info').forEach(desplegable => {
        estaba.set(desplegable, desplegable.classList.contains('abierto'));
        observador.observe(desplegable, { attributes: true, attributeFilter: ['class'] });
    });
}

// Sonido de tecla al tocar los botones de la barra de arriba, los menús de información y los filtros. Los botones "⚔️ Ataques" y
// "🧬 Evolución" del reverso de las cartas suenan igual, pero con la tecla de las cartas (un poco más bajita y más aguda).
// Suena al apretar (se siente inmediato y no lo corta el reload del botón de niveles) y, si se llegó a apretar, también al soltar.
// El teclado dispara solo 'click': ahí suenan las dos cosas seguidas.
// (La vibración en el celular la maneja activarVibracion: vale para todos los botones, también los del reverso de las cartas.)
// El botón de sonido (#silenciar) es la excepción en las dos cosas: no suena ni vibra al apretarlo sino según a dónde lleva el toque
// (ver activarBotonDeAudio y activarVibracion): apagar el sonido no hace ruido y apagar la vibración no vibra.
// El botón de inclinación (#inclinacion-invertida) suena como los demás de la barra, con una excepción: su tecla no cuenta como el primer
// sonido de la visita, así que no dispara el aviso del botón de sonido (ese aviso queda para el primer sonido que suene después).
const ZONAS_CON_SONIDO = '#navbar, #filtros, #f-vacio'; // (#silenciar queda afuera aunque esté dentro de la barra)
const TECLA_SIN_AVISO = { ...TECLA_NORMAL, sinAviso: true }; // la misma tecla de la barra, pero que no le llama la atención al botón de sonido

// Suena la tecla; si es de las que no cuentan como primer sonido, se avisa mientras suena (llamarLaAtencionDelBotonDeAudio mira esa marca)
function sonarTeclaDeBoton(bajada, tecla) {
    if (!tecla.sinAviso) {
        sonidoTecla(bajada, tecla);
        return;
    }
    sonarSinAvisarAlBotonDeAudio(() => sonidoTecla(bajada, tecla));
}

export function activarSonidoBotones() {
    let apretado = null; // la tecla que está apretada (para soltarla igual), o null
    // Qué tecla suena al tocar este botón (null: ninguna)
    const teclaDe = evento => {
        const boton = evento.target.closest('button, [role="button"]');
        if (!boton || boton.disabled) return null;
        if (boton.id === 'silenciar') return null; // el botón de sonido tiene su propio criterio (ver activarBotonDeAudio)
        if (boton.id === 'inclinacion-invertida') return TECLA_SIN_AVISO;
        // El botón de hacer flip de la carta no debe hacer sonido
        if (boton.closest('.c-flip')) return null;
        // Los botones de cada ataque (desplegar la descripción) no suenan a tecla: suena el fichero (info.js)
        if (boton.classList.contains('ataque-boton')) return null;
        // Todos los botones de la carta (los de info: gema, nivel, tipo, elemento; y los de ataque y evolución):
        // suenan todos con la tecla de cartas (un toque más agudo y bajo)
        if (boton.closest('.c-gema, .c-nivel, .c-tipo, .c-elem, .c-ataques, .c-evo, .c-botones') || boton.closest('#listado-digimons li')) {
            return TECLA_DE_CARTA;
        }
        if (boton.closest(ZONAS_CON_SONIDO) || boton.closest('.swal2-popup')) return TECLA_NORMAL;
        return null;
    };
    document.addEventListener('pointerdown', evento => {
        if (evento.pointerType === 'mouse' && evento.button !== 0) return; // solo el botón izquierdo
        const tecla = teclaDe(evento);
        if (tecla) {
            apretado = tecla;
            sonarTeclaDeBoton(true, tecla);
        }
    });
    // Se escucha en toda la página: se puede soltar el mouse fuera del botón
    document.addEventListener('pointerup', () => {
        if (apretado) {
            const tecla = apretado;
            apretado = null;
            sonarTeclaDeBoton(false, tecla);
        }
    });
    document.addEventListener('pointercancel', () => {
        apretado = null;
    });
    // (En la fase de captura: los botones del reverso de las cartas cortan la propagación del clic y, si no, no se llegaría a oír)
    document.addEventListener(
        'click',
        evento => {
            const tecla = evento.detail === 0 ? teclaDe(evento) : null; // clic hecho con el teclado (Enter o Espacio)
            if (tecla) {
                sonarTeclaDeBoton(true, tecla);
                setTimeout(() => sonarTeclaDeBoton(false, tecla), 80);
            }
        },
        true,
    );
}
