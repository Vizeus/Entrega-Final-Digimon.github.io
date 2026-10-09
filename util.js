// -----------------------------------------------------------------------------------------------------------------
// FUNCIONES DE USO GENERAL
//
// Lo que antes estaba repetido en varios archivos, escrito una sola vez: los demás archivos importan de acá
// lo que usan. No depende de ningún otro archivo.
// -----------------------------------------------------------------------------------------------------------------

// ---- Memoria del navegador -----------------------------------------------------------------------------------------
// "local" queda guardado aunque se cierre la página; "sesion" dura hasta que se cierra la pestaña.
// Si el navegador no deja guardar (modo privado, datos bloqueados) no pasa nada: leer devuelve null y guardar no hace nada,
// y la elección vale solo mientras la página siga abierta. (Hasta el nombre "localStorage" puede dar error en ese caso,
// por eso se pide dentro del try.)
function almacenamiento(donde) {
    return donde === 'sesion' ? sessionStorage : localStorage;
}

export function leerTexto(clave, donde = 'local') {
    try {
        return almacenamiento(donde).getItem(clave);
    } catch {
        return null;
    }
}

export function guardarTexto(clave, texto, donde = 'local') {
    try {
        almacenamiento(donde).setItem(clave, texto);
    } catch {
        // sin memoria no se recuerda nada, pero no pasa nada más
    }
}

// Lo mismo, pero guardando cualquier dato (un objeto, un número...) como JSON. Si no hay nada guardado, o el dato está roto,
// devuelve null.
export function leerJSON(clave, donde = 'local') {
    try {
        return JSON.parse(almacenamiento(donde).getItem(clave));
    } catch {
        return null;
    }
}

export function guardarJSON(clave, valor, donde = 'local') {
    guardarTexto(clave, JSON.stringify(valor), donde);
}

// "Esto ya pasó en esta visita": una marca que dura lo que dure la pestaña (recargar la página no la borra)
export function hayMarcaDeSesion(clave) {
    return leerTexto(clave, 'sesion') === '1';
}

export function ponerMarcaDeSesion(clave) {
    guardarTexto(clave, '1', 'sesion');
}

// ---- Avisos entre scripts ------------------------------------------------------------------------------------------
// Los scripts se hablan con eventos del document (por ejemplo "carta-agregada" o "idioma-cambiado"). "detalle" es lo que
// recibe quien escucha, en evento.detail.
export function emitir(nombre, detalle) {
    document.dispatchEvent(new CustomEvent(nombre, { detail: detalle }));
}

// ---- Segundo toque de un doble toque -------------------------------------------------------------------------------
// Un doble toque (o doble clic) sobre un botoncito del frente de una carta amplía la carta (ver gestos.js). El primer toque ya sonó y vibró, así
// que el segundo no lo hace otra vez: gestos.js anota acá, al apoyar el dedo (o el mouse), si ese toque es el segundo, y quien suena o vibra pregunta.
let segundoDeUnDoble = false;

export function marcarSegundoDeUnDoble(valor) {
    segundoDeUnDoble = valor;
}

export const esElSegundoDeUnDoble = () => segundoDeUnDoble;

// ---- Qué pantalla es ----------------------------------------------------------------------------------------------
// Una sola definición de cada tipo de pantalla. Se lee con .matches (siempre dice cómo está en ese momento) y se puede
// escuchar con .addEventListener('change', ...).
// El corte de 700 px es el mismo que $corte-celular en design/parciales/_variables.scss: si se cambia uno, se cambia el otro.
export const PANTALLA_DE_CELULAR = window.matchMedia('(max-width: 700px)');
export const HAY_PANTALLA_TACTIL = navigator.maxTouchPoints > 0 || 'ontouchstart' in window; // aunque también tenga mouse

// ---- Dedo o mouse ----------------------------------------------------------------------------------------------------
// CON_DEDO y CON_MOUSE dicen con qué se está apuntando ahora (se leen con .matches; a diferencia de las pantallas, no avisan los cambios).
// Lo normal sería preguntárselo al navegador con "(hover: none)", pero casi todos los celulares y tablets de Samsung (en cualquier navegador:
// Samsung Internet, Chrome...) contestan que tienen un mouse ("hover: hover" y "pointer: fine") aunque se usen solo con el dedo, porque su
// pantalla táctil se presenta ante Android también como un panel táctil de mouse (https://www.ctrl.blog/entry/css-media-hover-samsung.html).
// En esos aparatos la página se creía en una computadora: el "hover" quedaba pegado en la carta tocada y su brillo se quedaba suspendido ahí.
// Entonces se decide así, en este orden:
//   1. Si ya se vio qué se usó por última vez, manda eso (activarDeteccionDeDedo): un toque es un dedo; el mouse o el lápiz, no.
//      Así también acierta una computadora con pantalla táctil, que va cambiando según se toque o se mueva el mouse.
//   2. Si todavía no se tocó nada: el navegador cuando dice que no hay "hover", y además cualquier aparato Android con pantalla táctil.
//      (Un Android con un mouse conectado arranca creyéndose con dedo hasta que se mueva el mouse; no es una combinación común.)
const SIN_HOVER = window.matchMedia('(hover: none)');
const CON_HOVER_Y_PUNTERO_FINO = window.matchMedia('(hover: hover) and (pointer: fine)');
const ES_ANDROID_TACTIL = HAY_PANTALLA_TACTIL && /Android/i.test(navigator.userAgent);
let ultimoPuntero = null; // "touch", "mouse" o "pen": lo último que se usó para apuntar (null: todavía no se usó nada)

const conDedoAhora = () => (ultimoPuntero ? ultimoPuntero === 'touch' : SIN_HOVER.matches || ES_ANDROID_TACTIL);

export const CON_DEDO = {
    get matches() {
        return conDedoAhora();
    },
};
export const CON_MOUSE = {
    get matches() {
        return CON_HOVER_Y_PUNTERO_FINO.matches && !conDedoAhora();
    },
};

// Escucha qué se usa para apuntar y se lo cuenta al CSS con la clase "con-dedo" de <html> (equivale al @media (hover: none), pero con la
// corrección de arriba: ver el mixin con-dedo en design/parciales/_mixins.scss). Se pone en marcha apenas arranca la página.
export function activarDeteccionDeDedo() {
    const raiz = document.documentElement;
    const reflejar = () => raiz.classList.toggle('con-dedo', conDedoAhora());
    const mirar = evento => {
        if (!evento.pointerType || evento.pointerType === ultimoPuntero) return;
        ultimoPuntero = evento.pointerType;
        reflejar();
    };
    // (en la fase de captura, para ir antes que cualquier otro manejador; "pointermove" solo de mouse y lápiz: un dedo avisa con "pointerdown")
    document.addEventListener('pointerdown', mirar, { capture: true, passive: true });
    document.addEventListener(
        'pointermove',
        evento => {
            if (evento.pointerType !== 'touch') mirar(evento);
        },
        { capture: true, passive: true },
    );
    reflejar();
}

// ---- Ayudas --------------------------------------------------------------------------------------------------------
// El texto que se ve al dejar el puntero encima (title) y el que leen los lectores de pantalla (aria-label): casi siempre el mismo
export function ponerAyuda(elemento, texto, textoParaLectores = texto) {
    elemento.title = texto;
    elemento.setAttribute('aria-label', textoParaLectores);
}
