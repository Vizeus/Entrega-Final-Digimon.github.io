// -----------------------------------------------------------------------------------------------------------------
// BARRA DE ARRIBA EN EL CELULAR
//   · El menú ☰, que despliega el panel con la consigna, los ajustes, los menús de información y los filtros.
//   · La barra que se esconde al bajar por la lista y vuelve a aparecer al subir.
// (Antes estaban en info.js, que es de las ventanas de información.)
// -----------------------------------------------------------------------------------------------------------------

import { PANTALLA_DE_CELULAR } from './util.js';

// Menú ☰ del celular: abre y cierra el panel con la consigna, los ajustes y los menús de información.
// Se cierra con el mismo botón, al tocar afuera, con Esc o al elegir una opción de información.
export function activarMenuMovil() {
    const barra = document.getElementById('navbar');
    const boton = document.getElementById('abrir-menu');
    const panel = document.getElementById('menu-movil');
    const estaAbierto = () => barra.classList.contains('menu-abierto');
    const abrir = abierto => {
        barra.classList.toggle('menu-abierto', abierto);
        boton.setAttribute('aria-expanded', String(abierto));
        // Al cerrar el panel también se recogen las listas de información y de filtros: al volver a abrirlo están cerradas
        if (!abierto) {
            panel.querySelectorAll('.menu-info.abierto, .f-grupo.abierto').forEach(menu => {
                menu.classList.remove('abierto');
                menu.querySelector('.menu-desplegable, .f-btn').setAttribute('aria-expanded', 'false');
            });
        }
    };

    boton.addEventListener('click', () => abrir(!estaAbierto()));

    // Al elegir una opción de información se abre su ventana: el panel se cierra
    panel.addEventListener('click', evento => {
        if (evento.target.closest('ul button[data-k]')) abrir(false);
    });

    document.addEventListener('pointerdown', evento => {
        if (estaAbierto() && !panel.contains(evento.target) && !boton.contains(evento.target)) abrir(false);
    });

    document.addEventListener(
        'keydown',
        evento => {
            // Si hay una lista de información o de filtros abierta, Esc primero cierra esa lista (lo hacen activarMenusInfo y filtros.js)
            if (evento.key !== 'Escape' || !estaAbierto() || panel.querySelector('.menu-info.abierto, .f-grupo.abierto')) return;
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

// Barra de arriba del celular (la que lleva el menú ☰ con los filtros): se esconde al bajar por la lista y vuelve a aparecer
// apenas se sube un poquito, y solo con ese gesto (así no tapa las cartas mientras se recorre la lista). Arriba de todo de la
// página y con el menú ☰ abierto siempre se ve. En computadora no hace nada: la barra queda fija como siempre.
// (El CSS hace el movimiento: la clase "barra-escondida" la desliza hacia arriba, fuera de la pantalla.)
export function activarBarraQueSeEsconde() {
    const barra = document.getElementById('navbar');
    const SIEMPRE_VISIBLE_ARRIBA = 60; // px desde el borde de arriba de la página: ahí la barra siempre se ve
    const BAJADA_PARA_ESCONDER = 14; // px seguidos hacia abajo para que se esconda (un temblor del dedo no alcanza)
    const SUBIDA_PARA_MOSTRAR = 8; // px seguidos hacia arriba para que aparezca
    let ultimoY = window.scrollY;
    let recorrido = 0; // px que se lleva recorridos en la dirección actual (positivo: bajando, negativo: subiendo)

    const mostrar = () => barra.classList.remove('barra-escondida');

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
            recorrido = dy > 0 === recorrido > 0 && recorrido !== 0 ? recorrido + dy : dy;

            if (y <= SIEMPRE_VISIBLE_ARRIBA || barra.classList.contains('menu-abierto')) {
                mostrar();
            } else if (recorrido >= BAJADA_PARA_ESCONDER) {
                barra.classList.add('barra-escondida');
            } else if (recorrido <= -SUBIDA_PARA_MOSTRAR) {
                mostrar();
            }
        },
        { passive: true },
    );

    // Si la ventana pasa al diseño de computadora (o vuelve al celular), la barra arranca a la vista
    PANTALLA_DE_CELULAR.addEventListener('change', () => {
        recorrido = 0;
        ultimoY = window.scrollY;
        mostrar();
    });
}
