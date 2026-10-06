// -----------------------------------------------------------------------------------------------------------------
// BAILE DE LAS CARTAS: un easter egg inofensivo para cuando te olvidás la página abierta y quieta (solo computadora, y no con "reducir
// movimiento"). Hay tres bailes:
//
//   · PUNTERO: con el puntero quieto sobre una carta durante 1 minuto, esa carta baila 20 segundos. Pasa otro minuto quieto, y otra vez
//     20 segundos, y así en loop.
//   · TODAS: con la página quieta durante 4 minutos (no importa dónde esté el puntero), todas las cartas que se ven en la pantalla bailan
//     1 minuto. Algunas en sincro (haciendo lo mismo al mismo tiempo, o en ola), otras en compás pero a otro tiempo y otras más libres: cada
//     vez se arma una coreografía distinta. Pasan otros 4 minutos quieto, y otra vez, y así en loop.
//   · ZOOM: con una carta ampliada (doble clic) y la página quieta 3 minutos, la carta ampliada baila una rutina especial 30 segundos.
//     Pasan otros 3 minutos quieto, y otra vez, y así en loop.
//
// Prioridades: si coinciden el baile de todas y el del puntero, gana el de todas (el del puntero se corta y no empieza mientras dura). Con una
// carta ampliada no bailan las demás: solo vale el baile del zoom.
//
// "Quieta" es no tocar nada: ni mover el mouse (los movimientos "falsos" que el navegador manda cuando algo se mueve bajo el puntero quieto no
// cuentan), ni hacer clic, girar la rueda, desplazar la página o apretar una tecla. Cualquier cosa de esas corta todos los bailes en el
// momento (las cartas vuelven a su lugar en un instante, no de golpe) y vuelve a empezar la espera desde cero. Con la pestaña oculta no baila nada.
//
// Cada carta baila con una animación de "transform" hecha con la Web Animations API (así no pisa el levante del hover, que usa "translate", ni
// el zoom, que usa "translate" y "scale"). Mientras baila lleva la clase "bailando": la inclinación con el mouse la deja en paz (main.js) y el
// CSS le quita el levante y el reflejo del hover (que, con la carta saltando bajo un puntero quieto, parpadearían).
// Eventos que manda para la inclinación: "baile-empezo" (que suelte la carta que seguía al puntero) y "baile-terminado" (que retome).
// -----------------------------------------------------------------------------------------------------------------

const BAILE_PUNTERO = { espera: 60 * 1000, duracion: 20 * 1000 };
const BAILE_TODAS = { espera: 4 * 60 * 1000, duracion: 60 * 1000 };
const BAILE_ZOOM = { espera: 3 * 60 * 1000, duracion: 30 * 1000 };
const BAILE_REVISION = 1000; // ms entre revisiones del reloj
const BAILE_VUELTA_RAPIDA = 160; // ms que tarda una carta en volver a su lugar cuando algo corta el baile
const BAILE_VUELTA_SUAVE = 380; // ms que tarda cuando el baile termina solo
const BAILE_MAX_CARTAS = 80; // tope de cartas bailando a la vez (sobra: en una pantalla grande se ven unas 30)

// Una pose de la carta como "transform". Todas llevan las mismas funciones en el mismo orden, así el navegador mueve cada una por separado
// (por ejemplo, una vuelta de 360° en "v" da la vuelta entera en vez de quedarse quieta)
//   x, y: corrimiento (px) · r: balanceo en el plano (grados) · v: vuelta entera en el plano (grados, no se escala con la fuerza)
//   rx: cabeceo hacia adelante (grados, siempre chico) · sx, sy: escala
// A propósito no hay giros de costado (rotateY) pasados de los 90°: de espaldas la carta se ve vacía (solo el color de fondo) y de canto titila.
const pose = ({ x = 0, y = 0, r = 0, v = 0, rx = 0, sx = 1, sy = 1 } = {}) =>
    `translate(${x}px, ${y}px) rotate(${r + v}deg) perspective(800px) rotateX(${rx}deg) scale(${sx}, ${sy})`;

// Las figuras de baile. Cada una empieza y termina en reposo (para poder encadenarlas). "peso" es cuántos "tiempos" dura la figura.
// "pasos": [qué parte de la figura (0 a 1), pose, suavizado hasta el paso que sigue]
const FIGURAS = {
    salto: {
        peso: 1,
        pasos: [
            // se agacha, salta (se estira arriba) y cae aplastándose un poco
            [0, {}, 'ease-out'],
            [0.15, { sx: 1.07, sy: 0.9 }, 'ease-out'],
            [0.42, { y: -20, sx: 0.96, sy: 1.07 }, 'ease-in'],
            [0.72, { sx: 1.06, sy: 0.92 }, 'ease-out'],
            [0.86, { sx: 0.98, sy: 1.03 }, 'ease-in-out'],
            [1, {}],
        ],
    },
    meneo: {
        peso: 1,
        pasos: [
            // se menea de un lado al otro, como bailando cumbia
            [0, {}, 'ease-in-out'],
            [0.2, { r: -7, y: -3 }, 'ease-in-out'],
            [0.4, { r: 7, y: -3 }, 'ease-in-out'],
            [0.6, { r: -6, y: -2 }, 'ease-in-out'],
            [0.8, { r: 6, y: -2 }, 'ease-in-out'],
            [1, {}],
        ],
    },
    balanceo: {
        peso: 1.2,
        pasos: [
            // un paso para cada lado, apoyando el peso
            [0, {}, 'ease-in-out'],
            [0.25, { x: -14, r: -5, y: -4 }, 'ease-in-out'],
            [0.5, {}, 'ease-in-out'],
            [0.75, { x: 14, r: 5, y: -4 }, 'ease-in-out'],
            [1, {}],
        ],
    },
    latido: {
        peso: 0.7,
        pasos: [
            // late como un corazón
            [0, {}, 'ease-out'],
            [0.3, { sx: 1.1, sy: 1.1 }, 'ease-in-out'],
            [0.5, { sx: 0.98, sy: 0.98 }, 'ease-out'],
            [0.7, { sx: 1.07, sy: 1.07 }, 'ease-in-out'],
            [1, {}],
        ],
    },
    pirueta: {
        peso: 2,
        pasos: [
            // salta y da una vuelta entera sobre sí misma, como un trompo (siempre de frente)
            [0, {}, 'ease-out'],
            [0.12, { sx: 1.04, sy: 0.93 }, 'ease-out'],
            [0.3, { y: -16, v: 120 }, 'linear'],
            [0.55, { y: -20, v: 240 }, 'linear'],
            [0.8, { y: -6, v: 340 }, 'ease-out'],
            [1, { v: 360 }],
        ],
    },
    cabeceo: {
        peso: 1,
        pasos: [
            // asiente con la cabeza al ritmo, como en un recital
            [0, {}, 'ease-in-out'],
            [0.25, { rx: 14, y: 2 }, 'ease-in-out'],
            [0.5, { rx: -4 }, 'ease-in-out'],
            [0.75, { rx: 14, y: 2 }, 'ease-in-out'],
            [1, {}],
        ],
    },
    paso: {
        peso: 1.2,
        pasos: [
            // dos pasitos: uno a la izquierda y otro a la derecha, y vuelve
            [0, {}, 'ease-out'],
            [0.2, { x: -10, r: -3, y: -6 }, 'ease-in'],
            [0.4, { x: -10, r: -3 }, 'ease-out'],
            [0.6, { x: 10, r: 3, y: -6 }, 'ease-in'],
            [0.8, { x: 10, r: 3 }, 'ease-in-out'],
            [1, {}],
        ],
    },
};
const NOMBRES_DE_FIGURAS = Object.keys(FIGURAS);

const azar = (desde, hasta) => desde + Math.random() * (hasta - desde);
const elegir = lista => lista[Math.floor(Math.random() * lista.length)];

// Mezcla una lista (Fisher-Yates), sin tocar la original
function mezclar(lista) {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

// Los pasos de una figura (o de varias, una atrás de la otra) como keyframes, y cuántos "tiempos" dura en total.
// "fuerza" agranda o achica los movimientos (no la vuelta entera)
function keyframesDeFiguras(nombres, fuerza = 1) {
    const total = nombres.reduce((suma, nombre) => suma + FIGURAS[nombre].peso, 0);
    const ajustar = ({ x = 0, y = 0, r = 0, v = 0, rx = 0, sx = 1, sy = 1 }) => ({
        x: x * fuerza,
        y: y * fuerza,
        r: r * fuerza,
        v,
        rx: rx * fuerza,
        sx: 1 + (sx - 1) * fuerza,
        sy: 1 + (sy - 1) * fuerza,
    });
    const frames = [];
    let inicio = 0;
    let anterior = 0;
    for (const nombre of nombres) {
        const { peso, pasos } = FIGURAS[nombre];
        const ancho = peso / total;
        for (const [parte, p, suavizado] of pasos) {
            // (los números de punto flotante pueden dar un offset apenas menor al anterior, y eso la API no lo acepta)
            const offset = Math.max(anterior, Math.min(1, Math.round((inicio + parte * ancho) * 1e6) / 1e6));
            frames.push({ offset, transform: pose(ajustar(p)), easing: suavizado || 'ease-in-out' });
            anterior = offset;
        }
        inicio += ancho;
    }
    frames[0].offset = 0;
    frames[frames.length - 1].offset = 1;
    return { frames, tiempos: total };
}

// -----------------------------------------------------------------------------------------------------------------
// Poner y sacar una carta a bailar
// -----------------------------------------------------------------------------------------------------------------
const bailarinas = new Map(); // carta → su animación de baile (mientras baila)

// La carta baila: repite las figuras "nombres", una vuelta cada "periodo" ms. "retraso" negativo la arranca ya empezada (en otra fase del baile);
// positivo, la hace esperar antes de arrancar.
function ponerABailar(carta, nombres, periodo, { retraso = 0, fuerza = 1 } = {}) {
    const { frames } = keyframesDeFiguras(nombres, fuerza);
    carta.classList.add('bailando');
    const animacion = carta.animate(frames, { duration: Math.max(250, periodo), iterations: Infinity, delay: retraso });
    bailarinas.set(carta, animacion);
}

// La carta deja de bailar y vuelve a su lugar, con un movimiento corto desde donde esté (no de golpe)
function sacarDeBailar(carta, rapido) {
    const animacion = bailarinas.get(carta);
    if (!animacion) return;
    bailarinas.delete(carta);
    const pose = getComputedStyle(carta).transform; // lo que se ve ahora, con la animación en marcha
    animacion.cancel();
    const terminar = () => {
        if (bailarinas.has(carta)) return; // ya volvió a bailar: la clase sigue haciendo falta
        carta.classList.remove('bailando');
        document.dispatchEvent(new CustomEvent('baile-terminado')); // la inclinación retoma si el mouse sigue encima
    };
    if (!pose || pose === 'none' || !carta.isConnected) {
        terminar();
        return;
    }
    const vuelta = carta.animate([{ transform: pose }, { transform: 'none' }], {
        duration: rapido ? BAILE_VUELTA_RAPIDA : BAILE_VUELTA_SUAVE,
        easing: 'ease-out',
    });
    vuelta.onfinish = terminar;
    vuelta.oncancel = terminar;
}

// -----------------------------------------------------------------------------------------------------------------
// Las coreografías de cada baile
// -----------------------------------------------------------------------------------------------------------------

// PUNTERO: una rutina corta de 3 o 4 figuras al azar, una carta sola
function bailarConElPuntero(carta) {
    const figuras = mezclar(NOMBRES_DE_FIGURAS).slice(0, Math.floor(azar(3, 5)));
    const pulso = azar(430, 560);
    ponerABailar(carta, figuras, pulso * keyframesDeFiguras(figuras).tiempos, { fuerza: azar(1, 1.25) });
    return [carta];
}

// ZOOM: una rutina larga y especial (con salto, paso, pirueta, cabeceo y latido), solo para la carta ampliada. Como la carta ya está
// agrandada (el "transform" se aplica después del "scale"), los corrimientos salen más grandes en pantalla: se achican un poco
function bailarConZoom(carta) {
    const figuras = ['salto', 'salto', 'balanceo', 'pirueta', 'meneo', 'cabeceo', 'latido', 'paso', 'pirueta'];
    ponerABailar(carta, figuras, azar(560, 640) * keyframesDeFiguras(figuras).tiempos, { fuerza: 0.85 });
    return [carta];
}

// TODAS: cada vez se arma distinto. Hay un pulso (los "tiempos" de la música, de unos 90 a 140 por minuto) y tres o cuatro figuras elegidas al
// azar; cada carta cae en una de tres clases:
//   · en sincro (la mitad y pico): bailan lo mismo, al mismo tiempo, en grupos (cada grupo con su figura o su par de figuras). A veces, en ola:
//     cada una arranca un poquito después de la que tiene a la izquierda.
//   · en compás (un cuarto): una figura suelta a medio tiempo, al tiempo o al doble de rápido, siempre con el golpe cayendo sobre el pulso.
//   · libres (el resto): su propia figura, con su propio ritmo y en cualquier momento del baile.
function bailarTodas(cartas) {
    const pulso = azar(420, 680);
    const ancho = document.documentElement.clientWidth;
    const enOla = Math.random() < 0.4;
    const elegidas = mezclar(NOMBRES_DE_FIGURAS).slice(0, Math.floor(azar(3, 5)));
    const grupos = elegidas.map(figura => ({
        figuras: Math.random() < 0.4 ? [figura, elegir(NOMBRES_DE_FIGURAS)] : [figura],
        compas: elegir([1, 1, 2]),
    }));
    const bailando = [];
    for (const carta of cartas.slice(0, BAILE_MAX_CARTAS)) {
        const suerte = Math.random();
        const fuerza = azar(0.8, 1.3);
        if (suerte < 0.55) {
            // en sincro
            const { figuras, compas } = elegir(grupos);
            const periodo = pulso * keyframesDeFiguras(figuras).tiempos * compas;
            const retraso = enOla ? (carta.getBoundingClientRect().left / ancho) * pulso * 3 : 0;
            ponerABailar(carta, figuras, periodo, { retraso, fuerza });
        } else if (suerte < 0.8) {
            // en compás
            const figura = elegir(NOMBRES_DE_FIGURAS);
            const periodo = pulso * FIGURAS[figura].peso * elegir([0.5, 1, 1, 2]);
            ponerABailar(carta, [figura], periodo, { retraso: -pulso * elegir([0, 0.5, 1, 2]), fuerza });
        } else {
            // libres
            const figura = elegir(NOMBRES_DE_FIGURAS);
            const periodo = pulso * FIGURAS[figura].peso * azar(0.75, 1.65);
            ponerABailar(carta, [figura], periodo, { retraso: -azar(0, periodo), fuerza });
        }
        bailando.push(carta);
    }
    return bailando;
}

// Las cartas que se ven en la pantalla ahora (sin las que esconden los filtros ni las que están tapadas por la barra de arriba)
function cartasQueSeVen() {
    const alto = window.innerHeight;
    const ancho = document.documentElement.clientWidth;
    const barra = document.getElementById('navbar')?.getBoundingClientRect().bottom ?? 0;
    return [...listaDigimons.children].filter(carta => {
        if (carta.tagName !== 'LI' || carta.classList.contains('filtrada') || carta.girando) return false;
        const caja = carta.getBoundingClientRect();
        return caja.width > 0 && caja.bottom > barra + 20 && caja.top < alto - 20 && caja.right > 0 && caja.left < ancho;
    });
}

// -----------------------------------------------------------------------------------------------------------------
// El reloj: cuánto lleva todo quieto, y qué baile toca
// -----------------------------------------------------------------------------------------------------------------
function activarBaileDeCartas() {
    if (reducirMovimiento || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return; // solo computadora

    // Cada baile: "desde" es desde cuándo cuenta su espera, "fin" cuándo termina el que está en marcha (0: no hay uno) y "cartas" las que bailan
    const bailes = {
        puntero: { ...BAILE_PUNTERO, desde: 0, fin: 0, cartas: [] },
        todas: { ...BAILE_TODAS, desde: 0, fin: 0, cartas: [] },
        zoom: { ...BAILE_ZOOM, desde: 0, fin: 0, cartas: [] },
    };
    let puntero = null; // dónde está el mouse (null: afuera de la ventana o todavía no se movió)

    const detener = (nombre, rapido = false) => {
        const baile = bailes[nombre];
        baile.cartas.forEach(carta => sacarDeBailar(carta, rapido));
        baile.cartas = [];
        baile.fin = 0;
    };

    const empezar = (nombre, ahora, cartas) => {
        const baile = bailes[nombre];
        baile.cartas = cartas;
        baile.fin = ahora + baile.duracion;
        document.dispatchEvent(new CustomEvent('baile-empezo')); // la inclinación suelta la carta que seguía al mouse
    };

    // Cualquier actividad corta todos los bailes y empieza de nuevo la espera
    const actividad = () => {
        const ahora = performance.now();
        for (const nombre of Object.keys(bailes)) {
            if (bailes[nombre].fin) detener(nombre, true);
            bailes[nombre].desde = ahora;
        }
    };

    // Un baile terminó solo: se vuelve a esperar desde ahora (y después de un baile de todas, también el del puntero)
    const terminoSolo = (nombre, ahora) => {
        detener(nombre);
        bailes[nombre].desde = ahora;
        if (nombre === 'todas') bailes.puntero.desde = ahora;
    };

    const revisar = () => {
        if (document.hidden) return;
        const ahora = performance.now();

        // Con una carta ampliada: solo vale el baile del zoom (y si todavía está llegando o yéndose, no se hace nada)
        if (cartaEnZoom) {
            if (zoomOcupado || zoomCerrando) return;
            detener('puntero');
            detener('todas');
            const zoom = bailes.zoom;
            if (zoom.fin) {
                if (ahora >= zoom.fin) terminoSolo('zoom', ahora);
            } else if (ahora - zoom.desde >= zoom.espera) {
                empezar('zoom', ahora, bailarConZoom(cartaEnZoom));
            }
            return;
        }
        if (bailes.zoom.fin) detener('zoom');
        bailes.zoom.desde = ahora;

        // Todas las cartas que se ven: tiene prioridad sobre el puntero
        const todas = bailes.todas;
        if (todas.fin) {
            if (ahora >= todas.fin) terminoSolo('todas', ahora);
        } else if (ahora - todas.desde >= todas.espera) {
            detener('puntero');
            empezar('todas', ahora, bailarTodas(cartasQueSeVen()));
        }

        // La carta que está bajo el puntero quieto (solo si no están bailando todas)
        const unica = bailes.puntero;
        if (todas.fin) return;
        if (unica.fin) {
            if (ahora >= unica.fin) terminoSolo('puntero', ahora);
        } else if (ahora - unica.desde >= unica.espera) {
            const carta = puntero && document.elementFromPoint(puntero.x, puntero.y)?.closest('#listado-digimons > li');
            if (carta && !carta.classList.contains('filtrada') && !carta.girando) empezar('puntero', ahora, bailarConElPuntero(carta));
            else unica.desde = ahora; // el puntero no está sobre ninguna carta: se vuelve a esperar
        }
    };

    // --- Qué cuenta como actividad ---
    document.addEventListener(
        'pointermove',
        evento => {
            // El navegador manda "movimientos" falsos (en el mismo lugar) cuando algo se mueve bajo el puntero quieto, por ejemplo una carta
            // bailando: esos no cuentan
            const mismoLugar = puntero && Math.abs(evento.clientX - puntero.x) < 1 && Math.abs(evento.clientY - puntero.y) < 1;
            puntero = { x: evento.clientX, y: evento.clientY };
            if (!mismoLugar) actividad();
        },
        { capture: true, passive: true },
    );
    for (const tipo of ['pointerdown', 'wheel', 'keydown', 'touchstart']) {
        document.addEventListener(tipo, actividad, { capture: true, passive: true });
    }
    window.addEventListener('scroll', actividad, { capture: true, passive: true });
    document.documentElement.addEventListener('mouseleave', () => {
        puntero = null;
    });
    document.addEventListener('visibilitychange', actividad); // al ocultarse corta los bailes y al volver empieza de cero

    actividad();
    setInterval(revisar, BAILE_REVISION);
}

activarBaileDeCartas();
