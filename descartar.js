// -----------------------------------------------------------------------------------------------------------------
// CERRAR UN CARTEL ANTES DE TIEMPO
//
// Los cartelitos de ayuda, el del contador y los globitos de los botones redondos se van solos a los pocos segundos. Además se pueden
// quitar a mano:
//   · Con un clic (mouse) o un toque (dedo) en cualquier parte del cartel.
//   · Con el dedo (pantallas táctiles), arrastrándolo hacia un costado, izquierda o derecha. Si se lo lleva lo suficiente o con un
//     barrido rápido, se va por ese lado; si se suelta antes, vuelve a su lugar. Hacia arriba y abajo el dedo sigue desplazando la página.
// Cada cartel dice qué hacer cuando se cierra a mano ("alDescartar"): quitarse como siempre y avisar a quien lo había puesto, para que
// cancele su reloj y siga con lo que venía (por ejemplo, el siguiente consejo no espera a que pase el tiempo del que se quitó).
// -----------------------------------------------------------------------------------------------------------------

const DISTANCIA_PARA_QUITAR = 60; // px que hay que llevarlo para que se vaya al soltar
const DISTANCIA_MINIMA_RAPIDO = 24; // px mínimos para que cuente un barrido rápido
const VELOCIDAD_PARA_QUITAR = 0.5; // px/ms: un barrido más veloz que esto lo quita aunque sea corto
const INICIO_DEL_ARRASTRE = 8; // px que se mueve el dedo hacia un costado antes de que el cartel empiece a seguirlo
const DURACION_DEL_MOVIMIENTO = 200; // ms que tarda en irse (o en volver a su lugar)
const ESPERA_DEL_CLIC_TRAS_ARRASTRAR = 400; // ms: el clic que a veces llega al soltar un arrastre que volvió a su lugar no lo quita

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Le da al cartel el clic o toque y el arrastre hacia un costado. "alDescartar" se llama una sola vez, cuando se cierra a mano
export function hacerDescartable(cartel, alDescartar) {
    let descartado = false;
    let arrastradoHaceUnRato = false;
    const descartar = () => {
        if (descartado) return;
        descartado = true;
        alDescartar();
    };
    cartel.addEventListener('click', () => {
        if (!arrastradoHaceUnRato) descartar();
    });
    agregarArrastre(cartel, descartar, () => {
        arrastradoHaceUnRato = true;
        setTimeout(() => {
            arrastradoHaceUnRato = false;
        }, ESPERA_DEL_CLIC_TRAS_ARRASTRAR);
    });
}

function agregarArrastre(cartel, descartar, alArrastrar) {
    // El toque que empieza encima del cartel no es de la página: los gestos de atrás (por ejemplo, el barrido que pasa a otra carta
    // con el zoom abierto) ni se enteran. El movimiento sí sigue llegando, así que el bloqueo del desplazamiento durante el zoom se mantiene.
    cartel.addEventListener('touchstart', evento => evento.stopPropagation(), { passive: true });

    let toque = null; // { id, x, y, inicio, arrastrando, dx }: el dedo que está apoyado en el cartel
    cartel.addEventListener('pointerdown', evento => {
        if (evento.pointerType === 'mouse' || !evento.isPrimary) return; // con el mouse alcanza el clic
        toque = { id: evento.pointerId, x: evento.clientX, y: evento.clientY, inicio: null, arrastrando: false, dx: 0 };
    });

    cartel.addEventListener('pointermove', evento => {
        if (!toque || evento.pointerId !== toque.id) return;
        const dx = evento.clientX - toque.x;
        if (!toque.arrastrando) {
            // Hasta que el dedo no va claramente hacia un costado, es un desplazamiento de la página (o un toque): no se hace nada
            if (Math.abs(dx) < INICIO_DEL_ARRASTRE || Math.abs(dx) < Math.abs(evento.clientY - toque.y)) return;
            toque.arrastrando = true;
            toque.inicio = { x: evento.clientX, t: evento.timeStamp };
            cartel.setPointerCapture(evento.pointerId);
            cartel.style.transition = 'none'; // sigue al dedo sin demora
        }
        toque.dx = dx;
        cartel.style.translate = `${dx}px 0`;
        cartel.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / (cartel.offsetWidth * 1.2)));
    });

    const soltar = evento => {
        if (!toque || evento.pointerId !== toque.id) return;
        const { arrastrando, dx, inicio } = toque;
        toque = null;
        if (!arrastrando) return;
        alArrastrar();
        const velocidad = Math.abs(evento.clientX - inicio.x) / Math.max(1, evento.timeStamp - inicio.t);
        const seVa =
            evento.type === 'pointerup' &&
            (Math.abs(dx) >= DISTANCIA_PARA_QUITAR || (Math.abs(dx) >= DISTANCIA_MINIMA_RAPIDO && velocidad >= VELOCIDAD_PARA_QUITAR));
        if (seVa) irseHacia(cartel, dx > 0 ? 1 : -1, descartar);
        else volverAlLugar(cartel);
    };
    cartel.addEventListener('pointerup', soltar);
    cartel.addEventListener('pointercancel', soltar);
}

// Sale por el costado hacia el que lo llevó el dedo y, ya fuera de la vista, se quita como siempre (los demás cartelitos suben sin saltar)
function irseHacia(cartel, lado, descartar) {
    cartel.style.opacity = '0';
    if (sinMovimiento()) {
        cartel.style.transition = 'none';
        descartar();
        return;
    }
    cartel.style.transition = `translate ${DURACION_DEL_MOVIMIENTO}ms ease-in, opacity ${DURACION_DEL_MOVIMIENTO}ms ease-in`;
    cartel.style.translate = `${lado * (cartel.offsetWidth + 80)}px 0`;
    setTimeout(() => {
        cartel.style.transition = ''; // vuelven las transiciones del CSS: las que lo achican y levantan a los de abajo
        descartar();
    }, DURACION_DEL_MOVIMIENTO);
}

function volverAlLugar(cartel) {
    cartel.style.transition = sinMovimiento() ? 'none' : `translate ${DURACION_DEL_MOVIMIENTO}ms ease-out, opacity ${DURACION_DEL_MOVIMIENTO}ms ease-out`;
    cartel.style.translate = '0 0';
    cartel.style.opacity = ''; // vuelve al que le toca por su clase
    setTimeout(() => {
        cartel.style.transition = '';
        cartel.style.translate = '';
    }, DURACION_DEL_MOVIMIENTO + 20);
}
