// -----------------------------------------------------------------------------------------------------------------
// BARRA DE ARRIBA EN EL CELULAR
//   · El menú ☰, que despliega el panel con la consigna, los ajustes y los menús de información.
//   · La barra (con el buscador y los filtros, que van siempre a la vista debajo del logo) que se esconde al bajar por la lista y
//     vuelve a aparecer al subir, o sola cuando se completan los 2 digimons del combate.
//   · El logo de Digimon, que es un botón de "volver al inicio".
// (Antes estaban en info.js, que es de las ventanas de información.)
// -----------------------------------------------------------------------------------------------------------------

import { CON_DEDO, PANTALLA_DE_CELULAR, emitir } from './util.js';
import { reducirMovimiento } from './cartas.js';
import { limpiarSeleccionDeCombate, seleccionados } from './combate.js';
import { limpiarTodo } from './filtros.js';

// Menú ☰ del celular: abre y cierra el panel con la consigna, los ajustes y los menús de información.
// Se cierra con el mismo botón, al tocar afuera, con Esc o al elegir una opción de información.
export function activarMenuMovil() {
    const barra = document.getElementById('navbar');
    const boton = document.getElementById('abrir-menu');
    const panel = document.getElementById('menu-movil');
    const estaAbierto = () => barra.classList.contains('menu-abierto');
    // El panel no puede pasarse del borde de abajo de la pantalla: su alto máximo es lo que queda debajo de la barra (que cambia de alto cuando se
    // suman o se quitan etiquetas de filtros, por eso se mide). Si lo que tiene adentro no entra (por ejemplo, con una lista de información
    // abierta), el panel se desplaza por su cuenta (lo dibuja el CSS: --barra-alto).
    const medirBarra = () => barra.style.setProperty('--barra-alto', `${barra.offsetHeight}px`);
    medirBarra();
    if ('ResizeObserver' in window) new ResizeObserver(medirBarra).observe(barra);
    const abrir = abierto => {
        barra.classList.toggle('menu-abierto', abierto);
        boton.setAttribute('aria-expanded', String(abierto));
        emitir('menu-movil-cambio', { abierto }); // (el cartel del botón de tema, en avisos.js, solo sale con el menú abierto)
        // Al cerrar el panel también se recogen las listas de información: al volver a abrirlo están cerradas
        if (!abierto) {
            panel.querySelectorAll('.menu-info.abierto').forEach(menu => {
                menu.classList.remove('abierto');
                menu.querySelector('.menu-desplegable').setAttribute('aria-expanded', 'false');
            });
        }
    };

    boton.addEventListener('click', () => abrir(!estaAbierto()));

    // Al elegir una opción de información se abre su ventana: el panel se cierra
    panel.addEventListener('click', evento => {
        if (evento.target.closest('ul button[data-k]')) abrir(false);
    });

    // (tocar el globito del botón de tema, que sale del menú, lo quita a él pero no cierra el menú)
    document.addEventListener('pointerdown', evento => {
        if (estaAbierto() && !panel.contains(evento.target) && !boton.contains(evento.target) && !evento.target.closest('.aviso-globo')) abrir(false);
    });

    document.addEventListener(
        'keydown',
        evento => {
            // Si hay una lista de información abierta, Esc primero cierra esa lista (lo hace activarMenusInfo)
            if (evento.key !== 'Escape' || !estaAbierto() || panel.querySelector('.menu-info.abierto')) return;
            abrir(false);
            boton.focus();
        },
        true,
    ); // en captura: se decide antes de que Esc cierre la lista de información

    // Si la ventana se agranda hasta el diseño de computadora, el panel deja de existir: se cierra
    PANTALLA_DE_CELULAR.addEventListener('change', cambio => {
        if (!cambio.matches) abrir(false);
    });
}

// Barra de arriba del celular (la del logo, el combate, el menú ☰, el buscador y los filtros): se esconde entera al bajar por la
// lista y vuelve a aparecer apenas se sube un poquito (así no tapa las cartas mientras se recorre la lista), o sola cuando se
// completan los 2 digimons del combate, para que se vean el contador y el botón de pelear. Arriba de todo de la página siempre se
// ve, y también mientras se usa: con el menú ☰ abierto, con las opciones de un filtro desplegadas o con el cursor en el buscador
// (si no, se iría de la pantalla en pleno uso). Tampoco se esconde mientras está a la vista el cartel del contador de cartas elegidas (el que sale
// de la bolita "2/2" al terminar el primer combate): se puede esconder recién cuando el cartel se va, con lo que se baje después. En computadora no
// hace nada: la barra queda fija como siempre.
// Tampoco se esconde mientras al irse dejaría un hueco: la barra es "sticky" pero ocupa su lugar en la página, así que si todavía no se
// bajó lo que ella mide (arriba de todo, o con pocas cartas filtradas que casi no dan para desplazarse), al esconderse quedaría un espacio
// muerto arriba. Recién se puede esconder cuando las cartas ya subieron hasta ocupar ese lugar; y al revés, al subir, tiene que estar
// de vuelta antes de que ese hueco vuelva a asomar.
// Solo la esconde un desplazamiento hecho por la persona. Cuando la página se acomoda sola (por ejemplo al quitar un filtro: vuelven las cartas que
// estaban escondidas, la barra cambia de alto y el navegador corre la página para que lo que se está mirando no salte) también llegan eventos
// de scroll, y si eran hacia abajo la barra se iba aunque la pantalla estuviera quieta. Con el dedo, entonces, cuenta como desplazamiento de la
// persona el que ocurre mientras arrastra el dedo por la pantalla o enseguida después (el impulso que sigue a soltar), y no el que llega solo.
// (El CSS hace el movimiento: la clase "barra-escondida" la desliza hacia arriba, fuera de la pantalla.)
export function activarBarraQueSeEsconde() {
    const barra = document.getElementById('navbar');
    const SIEMPRE_VISIBLE_ARRIBA = 60; // px desde el borde de arriba de la página: ahí la barra siempre se ve (como mínimo; ver lugarDeLaBarra)
    const BAJADA_PARA_ESCONDER = 14; // px seguidos hacia abajo para que se esconda (un temblor del dedo no alcanza)
    const SUBIDA_PARA_MOSTRAR = 8; // px seguidos hacia arriba para que aparezca
    const DEDO_MOVIDO = 6; // px que tiene que moverse el dedo para que cuente como arrastre (un toque quieto no desplaza nada)
    const IMPULSO = 4000; // ms después de soltar el dedo que se sigue contando como desplazamiento de la persona (la página sigue deslizándose sola un rato)
    let ultimoY = window.scrollY;
    let recorrido = 0; // px que se lleva recorridos en la dirección actual (positivo: bajando, negativo: subiendo)

    const mostrar = () => barra.classList.remove('barra-escondida');
    // Hasta dónde (px desde el borde de arriba de la página) la barra tiene que verse sí o sí: el lugar que ocupa arriba de la lista, que
    // cambia de alto cuando se suman o se quitan las etiquetas de los filtros. Más abajo de ahí las cartas ya llenan el borde de la pantalla
    const lugarDeLaBarra = () => Math.max(SIEMPRE_VISIBLE_ARRIBA, barra.offsetHeight);
    // ¿La persona está usando la barra ahora? Menú ☰ abierto, opciones de un filtro desplegadas o cursor en el buscador
    const enUso = () => barra.classList.contains('menu-abierto') || barra.querySelector('.f-grupo.abierto, input:focus') !== null;
    // ¿Está a la vista el cartel del contador (avisos.js, mostrarAvisoDelContador)? Sale de la barra: si se esconde, el cartel se quedaría sin su contador
    const contadorAVista = () => document.querySelector('.aviso-contador.visible') !== null;

    // El dedo en la pantalla: dónde se apoyó y si ya se movió lo suficiente como para estar arrastrando la página
    let dedo = null; // { x, y, arrastrando }
    let impulsoHasta = 0; // hasta cuándo dura el impulso de un arrastre que ya terminó
    window.addEventListener(
        'touchstart',
        evento => {
            impulsoHasta = 0; // apoyar el dedo frena la página: ya no hay impulso
            dedo = { x: evento.touches[0].clientX, y: evento.touches[0].clientY, arrastrando: false };
        },
        { passive: true },
    );
    window.addEventListener(
        'touchmove',
        evento => {
            if (dedo && !dedo.arrastrando && Math.hypot(evento.touches[0].clientX - dedo.x, evento.touches[0].clientY - dedo.y) > DEDO_MOVIDO)
                dedo.arrastrando = true;
        },
        { passive: true },
    );
    const soltarDedo = evento => {
        if (evento.touches.length > 0) return; // quedan dedos apoyados
        if (dedo?.arrastrando) impulsoHasta = performance.now() + IMPULSO;
        dedo = null;
    };
    window.addEventListener('touchend', soltarDedo, { passive: true });
    window.addEventListener('touchcancel', soltarDedo, { passive: true });
    // ¿Este desplazamiento lo hace la persona? Con mouse o teclado, siempre; con el dedo, solo si lo está arrastrando o la página sigue con su impulso
    const loHaceLaPersona = () => !CON_DEDO.matches || dedo?.arrastrando === true || performance.now() < impulsoHasta;

    window.addEventListener(
        'scroll',
        () => {
            if (!PANTALLA_DE_CELULAR.matches) {
                mostrar();
                return;
            }
            // El rebote de iPhone en los extremos pasa de los límites de la página: se recorta para que no cuente como un gesto
            const y = Math.max(0, Math.min(window.scrollY, document.documentElement.scrollHeight - window.innerHeight));
            const dy = y - ultimoY;
            ultimoY = y;
            if (dy === 0) return;
            if (contadorAVista()) {
                recorrido = 0; // lo que se baje mientras el cartel está a la vista no cuenta: después se empieza de cero
                mostrar();
                return;
            }
            recorrido = dy > 0 === recorrido > 0 && recorrido !== 0 ? recorrido + dy : dy;

            if (y < lugarDeLaBarra() || enUso()) {
                mostrar();
            } else if (recorrido >= BAJADA_PARA_ESCONDER) {
                if (loHaceLaPersona()) barra.classList.add('barra-escondida');
                else recorrido = 0; // la página se acomodó sola: la barra se queda como está
            } else if (recorrido <= -SUBIDA_PARA_MOSTRAR) {
                mostrar();
            }
        },
        { passive: true },
    );

    // Al completar los 2 digimons del combate la barra baja sola, aunque esté escondida: ahí están el contador y el botón de pelear,
    // que se iluminan justo en ese momento. Si después se vuelve a bajar por la lista, se esconde de nuevo como siempre.
    document.addEventListener('seleccion-cambio', () => {
        if (PANTALLA_DE_CELULAR.matches && seleccionados.length === 2) mostrar();
    });

    // Si la ventana pasa al diseño de computadora (o vuelve al celular), la barra arranca a la vista
    PANTALLA_DE_CELULAR.addEventListener('change', () => {
        recorrido = 0;
        ultimoY = window.scrollY;
        mostrar();
    });
}

// El logo de Digimon (arriba a la izquierda) es un botón de "volver al inicio": salta, sube hasta arriba de todo de la página, borra
// los filtros y el buscador y quita la selección de combate, todo junto (lo que ya está limpio o arriba, queda como está).
// También se activa con el teclado (Enter o espacio). El salto lo hace el CSS (la clase "salta"); si se toca de nuevo mientras salta,
// vuelve a empezar. Con "reducir movimiento" no salta y sube de golpe.
export function activarLogo() {
    const logo = document.querySelector('#navbar > img');
    const DURACION_DEL_SALTO = 1000; // ms: lo que dura la animación del CSS
    let fin = 0;

    const volverAlInicio = () => {
        logo.classList.remove('salta');
        void logo.offsetWidth; // fuerza a que el navegador note que se sacó la clase: así la animación vuelve a empezar
        logo.classList.add('salta');
        clearTimeout(fin);
        fin = setTimeout(() => logo.classList.remove('salta'), DURACION_DEL_SALTO);

        limpiarTodo();
        limpiarSeleccionDeCombate();
        window.scrollTo({ top: 0, behavior: reducirMovimiento ? 'instant' : 'smooth' });
    };

    logo.addEventListener('click', volverAlInicio);
    logo.addEventListener('keydown', evento => {
        if (evento.key !== 'Enter' && evento.key !== ' ') return;
        evento.preventDefault(); // el espacio no tiene que bajar la página
        volverAlInicio();
    });
}
