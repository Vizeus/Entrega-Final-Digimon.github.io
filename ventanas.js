// -----------------------------------------------------------------------------------------------------------------
// VENTANAS (SweetAlert2): información, ataques, línea evolutiva y combate
//
//   1. LA PÁGINA QUEDA QUIETA CON UNA VENTANA ABIERTA (dedo, rueda y teclas): ver activarPaginaQuietaConVentanas, más abajo.
//   2. TODAS TIENEN SU CRUZ de cerrar arriba a la derecha, del mismo estilo (ver conCruzDeCierre).
//   3. EL BOTÓN "ATRÁS" (el del sistema en Android, el del navegador o el gesto de volver) CIERRA LA VENTANA: ver activarCierreDeVentanas.
//   4. LOS DESPLEGABLES NO MUEVEN SU BOTÓN: ver mantenerEnSuLugar. Y al desplazar la ventana vuelve a quedar centrada: ver actualizarElAire.
// -----------------------------------------------------------------------------------------------------------------

import { DICCIONARIO, t } from './i18n.js';

Object.assign(DICCIONARIO.es, { 'ventana.cerrar': 'Cerrar la ventana' });
Object.assign(DICCIONARIO.en, { 'ventana.cerrar': 'Close window' });

// ---- 1. La página queda quieta con una ventana abierta (dedo, rueda y teclas) ---------------------------------------------
// Mientras hay una ventana abierta (ataques, línea evolutiva, información o combate) la página de atrás no se desplaza ni con el dedo, ni con la
// rueda del mouse, ni con las teclas (flechas, RePág, AvPág, Inicio, Fin y espacio): lo único que se mueve es lo que tiene scroll propio dentro de
// la ventana (la ventana entera, cuando es más alta que la pantalla). Si ese scroll ya llegó al final, el dedo, la rueda o la tecla tampoco arrastran
// a la página (se frenan ahí). La página tenía que quedar libre de overflow (ver _base.scss: SweetAlert le pone overflow hidden al body y, sin esa
// regla, la grilla saltaría al aparecer y desaparecer la barra de scroll), así que el freno se hace acá, en el movimiento, igual que con el zoom de una
// carta (zoom.js) y con el combate (combate.js). El de la rueda y el de las teclas se ponen solo mientras hay una ventana (un escuchador de la rueda
// que puede frenar hace esperar al navegador cada vez que se desplaza la página). El del dedo es permanente: el combate además lo mantiene entre un
// cartel y el siguiente, cuando no hay ninguna ventana abierta por un instante.
const hayVentana = () => document.querySelector('.swal2-container') !== null;

// ¿Algo de adentro de la ventana, de donde está el dedo hasta el borde de la ventana, se puede desplazar hacia donde va el dedo?
// "dx" y "dy" son lo que se movió el dedo: con el dedo hacia abajo (dy > 0) el contenido sube, o sea, se desplaza hacia arriba.
function sePuedeDesplazarAdentro(destino, dx, dy) {
    const contenedor = destino.closest?.('.swal2-container');
    if (!contenedor) return false; // el dedo no está sobre la ventana: la página no se mueve
    const vertical = Math.abs(dy) >= Math.abs(dx);
    for (let elemento = destino; elemento && elemento !== contenedor.parentElement; elemento = elemento.parentElement) {
        const estilo = getComputedStyle(elemento);
        if (vertical) {
            const conScroll = /auto|scroll/.test(estilo.overflowY) && elemento.scrollHeight > elemento.clientHeight + 1;
            if (conScroll && (dy > 0 ? elemento.scrollTop > 0 : elemento.scrollTop + elemento.clientHeight < elemento.scrollHeight - 1)) return true;
        } else {
            const conScroll = /auto|scroll/.test(estilo.overflowX) && elemento.scrollWidth > elemento.clientWidth + 1;
            if (conScroll && (dx > 0 ? elemento.scrollLeft > 0 : elemento.scrollLeft + elemento.clientWidth < elemento.scrollWidth - 1)) return true;
        }
    }
    return false;
}

// Hacia dónde mueve cada tecla lo que se desplaza: 1 hacia abajo, -1 hacia arriba (el espacio con Mayús va hacia arriba)
const SENTIDO_DE_LAS_TECLAS = { ArrowDown: 1, PageDown: 1, End: 1, ' ': 1, ArrowUp: -1, PageUp: -1, Home: -1 };

// La rueda: "deltaY" positivo es desplazar hacia abajo, o sea, lo contrario del dedo (con el dedo hacia arriba el contenido baja)
const frenarRuedaConVentana = evento => {
    if (evento.ctrlKey || (evento.deltaX === 0 && evento.deltaY === 0)) return; // (con Ctrl la rueda agranda o achica la página: no se toca)
    if (!sePuedeDesplazarAdentro(evento.target, -evento.deltaX, -evento.deltaY) && evento.cancelable) evento.preventDefault();
};

const frenarTeclasConVentana = evento => {
    const sentido = SENTIDO_DE_LAS_TECLAS[evento.key];
    if (!sentido || evento.ctrlKey || evento.metaKey || evento.altKey) return; // (Ctrl+Inicio y compañía son del navegador)
    // En un campo de texto, o con el espacio sobre un botón o enlace (que lo aprieta), la tecla no desplaza nada
    if (evento.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (evento.key === ' ' && evento.target.closest?.('button, a')) return;
    // Si el foco no está dentro de la ventana, se mira la ventana igual: de ella depende si hay algo que desplazar
    const contenedor = document.querySelector('.swal2-container');
    const destino = evento.target.closest?.('.swal2-container') ? evento.target : contenedor;
    const haciaAbajo = evento.key === ' ' && evento.shiftKey ? -sentido : sentido;
    if (destino && !sePuedeDesplazarAdentro(destino, 0, -haciaAbajo) && evento.cancelable) evento.preventDefault();
};

export function activarPaginaQuietaConVentanas() {
    let anterior = null; // { x, y }: dónde estaba el dedo en el movimiento anterior

    window.addEventListener(
        'touchstart',
        evento => {
            anterior = evento.touches.length === 1 ? { x: evento.touches[0].clientX, y: evento.touches[0].clientY } : null;
        },
        { passive: true },
    );

    const soltar = () => {
        anterior = null;
    };
    window.addEventListener('touchend', soltar, { passive: true });
    window.addEventListener('touchcancel', soltar, { passive: true });

    window.addEventListener(
        'touchmove',
        evento => {
            if (!anterior || evento.touches.length !== 1 || !hayVentana()) return; // (con dos dedos es un pellizco: no se toca)
            const toque = evento.touches[0];
            const dx = toque.clientX - anterior.x;
            const dy = toque.clientY - anterior.y;
            anterior = { x: toque.clientX, y: toque.clientY };
            if (dx === 0 && dy === 0) return;
            if (!sePuedeDesplazarAdentro(evento.target, dx, dy) && evento.cancelable) evento.preventDefault();
        },
        { passive: false },
    );

    // La rueda y las teclas: el freno se pone cuando aparece una ventana y se saca cuando se va la última
    let frenoPuesto = false;
    const ponerOSacarElFreno = () => {
        if (hayVentana() === frenoPuesto) return;
        frenoPuesto = !frenoPuesto;
        const accion = frenoPuesto ? 'addEventListener' : 'removeEventListener';
        window[accion]('wheel', frenarRuedaConVentana, { passive: false });
        window[accion]('keydown', frenarTeclasConVentana, true);
    };
    new MutationObserver(ponerOSacarElFreno).observe(document.body, { childList: true });
    ponerOSacarElFreno();
}

// ---- 2. La cruz de cerrar -----------------------------------------------------------------------------------------------------
// Todas las ventanas llevan la misma cruz roja arriba a la derecha (los estilos están en _ventanas.scss). Cerrarla es lo mismo que tocar afuera o
// apretar Esc: en el combate, anularlo. En una ventana más alta que la pantalla la cruz no se va con el desplazamiento: se queda a la vista.
const CRUZ = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>';

// Las opciones de Swal.fire que le ponen su cruz a la ventana ("etiqueta": lo que dice al dejar el puntero encima y lo que lee un lector de pantalla)
export const conCruzDeCierre = (etiqueta = t('ventana.cerrar')) => ({ showCloseButton: true, closeButtonHtml: CRUZ, closeButtonAriaLabel: etiqueta });

// SweetAlert deja la cruz como un elemento más de la ventana. Para que se quede a la vista cuando la ventana es más alta que la pantalla (y se
// desplaza), se la mete en un "riel": una columna angosta pegada al borde derecho de la ventana, de su alto, donde la cruz se queda pegada arriba
// ("position: sticky", en _ventanas.scss) mientras la ventana se desplaza por debajo. También se le pone el texto de ayuda para el puntero.
function prepararLaCruz(contenedor) {
    const ventana = contenedor.querySelector('.swal2-popup');
    if (!ventana) return;
    prepararElAire(ventana);
    const cruz = ventana.querySelector(':scope > .swal2-close');
    if (!cruz) return;
    if (!cruz.title) cruz.title = cruz.getAttribute('aria-label') ?? '';
    const riel = document.createElement('div');
    riel.className = 'ventana-riel';
    ventana.append(riel);
    riel.append(cruz);
}

// ---- 3. El botón "atrás" cierra la ventana --------------------------------------------------------------------------------------
// Con una ventana abierta se agrega una entrada al historial del navegador: al volver atrás (el botón o gesto de Android, el del navegador...) se
// gasta esa entrada y la ventana se cierra, en vez de salir de la página. Si la ventana se cierra de otra forma (la cruz, tocar afuera, Esc o un
// botón), se saca esa entrada sobrante con un "atrás" nuestro, así la persona no tiene que volver dos veces para salir de la página.
// Una ventana puede ser reemplazada por la siguiente con un instante sin ninguna entre medio (los carteles del combate, un enlace dentro de una
// ventana de información): la entrada se saca recién si un momento después sigue sin haber ventana. Todas las ventanas seguidas usan la misma.
const ESPERA_PARA_SACAR_LA_ENTRADA = 250; // ms sin ventana para considerar que se cerró de verdad

export function activarCierreDeVentanas() {
    let entradaPuesta = false; // hay una entrada nuestra en el historial
    let atrasNuestro = false; // el próximo "popstate" lo provocamos nosotros al sacar la entrada: no es la persona volviendo
    let espera = 0;

    const revisar = () => {
        clearTimeout(espera);
        if (hayVentana()) {
            if (!entradaPuesta) {
                history.pushState({ ventana: true }, '');
                entradaPuesta = true;
            }
            return;
        }
        if (!entradaPuesta) return;
        espera = setTimeout(() => {
            if (hayVentana() || !entradaPuesta) return;
            entradaPuesta = false;
            atrasNuestro = true;
            history.back();
        }, ESPERA_PARA_SACAR_LA_ENTRADA);
    };

    new MutationObserver(mutaciones => {
        for (const { addedNodes } of mutaciones) {
            for (const nodo of addedNodes) {
                if (nodo.classList?.contains('swal2-container')) prepararLaCruz(nodo);
            }
        }
        revisar();
    }).observe(document.body, { childList: true });

    window.addEventListener('popstate', () => {
        if (atrasNuestro) {
            atrasNuestro = false;
            return;
        }
        entradaPuesta = false; // la persona volvió: la entrada ya se gastó
        if (hayVentana()) Swal.close();
    });
}

// ---- 4. Los desplegables no mueven su botón -------------------------------------------------------------------------------------
// Las ventanas están centradas en la pantalla: cuando un desplegable de adentro se abre (un ataque, "¿Por qué hay evoluciones raras?") la ventana
// crece y se vuelve a centrar, y el botón que se acaba de tocar se corre de lugar. Obliga a perseguir el botón con el mouse o el dedo para volver a
// cerrarlo. Con esta función el botón se queda donde estaba y lo que cambia lo hace por debajo: se hace el cambio ("cambio" es lo que abre o cierra el
// desplegable) y, si el botón se corrió, se lo devuelve a su lugar:
//   1. Si la ventana se corrió sola (porque su alto cambió y se volvió a centrar), se la vuelve a poner donde estaba.
//   2. Si el botón se corrió dentro de la ventana (porque lo de arriba cambió de alto), se corrige con el desplazamiento de lo que lo contiene (una lista
//      con scroll, la ventana si es más alta que la pantalla, el panel del menú ☰ del celular).
//   3. Si todavía falta (no había por dónde desplazar), se corre la ventana.
// Cuando el desplegable se cierra, todo vuelve a su lugar (la ventana queda otra vez centrada). Ver también centrarVentana.
const MARGEN_DE_LA_VENTANA = 8; // px que como mínimo queda libre arriba cuando se corre una ventana

const conDesplazamientoVertical = elemento => /auto|scroll/.test(getComputedStyle(elemento).overflowY) && elemento.scrollHeight > elemento.clientHeight + 1;

// Corre la ventana "desplazamiento" píxeles de la pantalla hacia abajo (negativo: hacia arriba), sin dejarla subir por encima del borde de arriba.
// Algunas ventanas están agrandadas con "zoom" (la línea evolutiva en pantallas grandes): lo que se le escribe a la ventana se agranda con ella,
// y lo que se mide en la pantalla no
function correrVentana(ventana, desplazamiento) {
    const agrandada = ventana.offsetHeight ? ventana.getBoundingClientRect().height / ventana.offsetHeight : 1;
    const escribir = corrimiento => {
        ventana.dataset.corrimiento = String(corrimiento);
        ventana.style.translate = `0 ${corrimiento}px`;
        // La cruz de cerrar se queda pegada arriba de la pantalla mientras la ventana se desplaza (_ventanas.scss), pero el pegado se calcula sin contar este
        // corrimiento, que después corre todo lo de la ventana, cruz incluida: se lo descuenta ahí. Si no, la cruz flotaría más abajo, hacia el centro
        ventana.style.setProperty('--corrimiento-de-la-ventana', `${corrimiento}px`);
        actualizarElAire(ventana);
    };
    // Nunca queda más arriba de donde la dejó SweetAlert (centrada, o con su margen de arriba): un corrimiento hacia arriba no se podría volver a desplazar,
    // y la ventana quedaría pegada arriba y torcida. Así, al cerrar los desplegables que se abrieron vuelve a quedar centrada
    const corrimiento = Math.max(0, Number(ventana.dataset.corrimiento || 0) + desplazamiento / agrandada);
    escribir(corrimiento);
    // (Se mira dónde queda la ventana sin el desplazamiento del contenedor: si la persona ya desplazó hacia abajo, la ventana está por encima del borde de la
    // pantalla porque así tiene que ser. Contándolo, cada desplegable que se cerraba la corría hacia abajo otra vez, y el corrimiento no paraba de crecer)
    const contenedor = ventana.closest('.swal2-container');
    const sobra = MARGEN_DE_LA_VENTANA - (ventana.getBoundingClientRect().top + (contenedor?.scrollTop ?? 0));
    if (sobra > 0) escribir(corrimiento + sobra / agrandada);
}

// Una ventana corrida de su lugar tiene que poder volver a quedar centrada al desplazarla. La ventana corrida (con "translate") ocupa en el layout el mismo
// lugar de siempre (el que le da SweetAlert: centrada si entra en la pantalla y, si no, pegada arriba con su margen); el corrimiento es solo visual, y el
// navegador no cuenta el margen de abajo en lo que se puede desplazar. Resultado: al llegar al final la ventana quedaba pegada al borde de abajo, sin margen,
// y el espacio de arriba (el corrimiento) quedaba sin usar. Para arreglarlo se le pega a la ventana, debajo, un "aire" invisible: igual que sin corrimiento,
// el margen de abajo es el de arriba. Si la ventana entra en la pantalla, desplazando hacia abajo sube y se come el corrimiento hasta quedar centrada
// (el aire es el margen que le da SweetAlert al centrarla). Si no entra, al final queda con el mismo margen que tenía arriba al empezar (ver actualizarElAire).
function prepararElAire(ventana) {
    const aire = document.createElement('div');
    aire.className = 'ventana-aire';
    aire.setAttribute('aria-hidden', 'true');
    ventana.append(aire);
    // Si la ventana cambia de alto estando corrida (se abre otro desplegable, se acomoda una lista...), el margen de arriba que le da SweetAlert cambia
    new ResizeObserver(() => {
        if (ventana.dataset.corrimiento !== undefined) actualizarElAire(ventana);
    }).observe(ventana);
}

function actualizarElAire(ventana) {
    const contenedor = ventana.closest('.swal2-container');
    if (!contenedor || ventana.dataset.corrimiento === undefined) return;
    // Los píxeles de la pantalla (getBoundingClientRect) y los de la ventana (lo que se le escribe al CSS) son distintos si la ventana está agrandada con "zoom"
    const agrandada = ventana.offsetHeight ? ventana.getBoundingClientRect().height / ventana.offsetHeight : 1;
    const corrimiento = Number(ventana.dataset.corrimiento) * agrandada;
    // Donde estaría la ventana sin el corrimiento y sin desplazar el contenedor, respecto del borde de arriba del contenedor
    const arriba = Math.max(0, ventana.getBoundingClientRect().top - contenedor.getBoundingClientRect().top - corrimiento + contenedor.scrollTop);
    // Si la ventana entra en la pantalla, al final del desplazamiento queda centrada: el aire es el margen de arriba que le da SweetAlert. Si no entra (es más
    // alta que la pantalla, y SweetAlert la deja pegada arriba con un margen mínimo), ese margen sería de unos pocos píxeles: al final del desplazamiento la
    // última línea quedaría contra el borde. Ahí el aire es el margen que la ventana tiene arriba al empezar (el de SweetAlert más el corrimiento): abajo
    // queda el mismo espacio que arriba
    const entra = ventana.getBoundingClientRect().height + 2 * arriba <= contenedor.clientHeight + 1;
    ventana.style.setProperty('--aire-de-la-ventana', `${(entra ? arriba : arriba + corrimiento) / agrandada}px`);
}

export function mantenerEnSuLugar(elemento, cambio) {
    const ventana = elemento.closest('.swal2-popup');
    const altura = () => elemento.getBoundingClientRect().top;
    const antes = altura();
    const ventanaAntes = ventana?.getBoundingClientRect().top ?? 0;
    cambio();
    const desvio = () => altura() - antes; // positivo: el botón bajó
    if (Math.abs(desvio()) < 0.5) return;

    // 1. La ventana se corrió sola
    if (ventana) {
        const corridaSola = ventana.getBoundingClientRect().top - ventanaAntes;
        if (Math.abs(corridaSola) >= 0.5) correrVentana(ventana, -corridaSola);
    }

    // 2. El botón se corrió dentro de la ventana
    const limite = elemento.closest('.swal2-container, .menu-movil');
    for (let contenedor = elemento.parentElement; contenedor && Math.abs(desvio()) >= 0.5; contenedor = contenedor.parentElement) {
        if (conDesplazamientoVertical(contenedor)) contenedor.scrollTop += desvio();
        if (contenedor === limite) break;
    }

    // 3. Todavía falta
    if (ventana && Math.abs(desvio()) >= 0.5) correrVentana(ventana, -desvio());
}

// Devuelve la ventana a su lugar (centrada en la pantalla): cuando su contenido se rearma de cero (por ejemplo, al pasar a otro digimon en la línea
// evolutiva) o cambia el tamaño de la pantalla
export function centrarVentana(ventana = document.querySelector('.swal2-popup')) {
    if (!ventana) return;
    delete ventana.dataset.corrimiento;
    ventana.style.translate = '';
    ventana.style.removeProperty('--corrimiento-de-la-ventana');
    ventana.style.removeProperty('--aire-de-la-ventana');
}

window.addEventListener('resize', () => document.querySelectorAll('.swal2-popup[data-corrimiento]').forEach(ventana => centrarVentana(ventana)));
