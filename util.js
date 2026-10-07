// -----------------------------------------------------------------------------------------------------------------
// FUNCIONES DE USO GENERAL
//
// Lo que antes estaba repetido en varios archivos, escrito una sola vez. Se carga primero (index.html): los demás scripts
// usan estas funciones. No depende de ningún otro archivo.
// -----------------------------------------------------------------------------------------------------------------

// ---- Memoria del navegador -----------------------------------------------------------------------------------------
// "local" queda guardado aunque se cierre la página; "sesion" dura hasta que se cierra la pestaña.
// Si el navegador no deja guardar (modo privado, datos bloqueados) no pasa nada: leer devuelve null y guardar no hace nada,
// y la elección vale solo mientras la página siga abierta. (Hasta el nombre "localStorage" puede dar error en ese caso,
// por eso se pide dentro del try.)
function almacenamiento(donde) {
    return donde === 'sesion' ? sessionStorage : localStorage;
}

function leerTexto(clave, donde = 'local') {
    try {
        return almacenamiento(donde).getItem(clave);
    } catch {
        return null;
    }
}

function guardarTexto(clave, texto, donde = 'local') {
    try {
        almacenamiento(donde).setItem(clave, texto);
    } catch {
        // sin memoria no se recuerda nada, pero no pasa nada más
    }
}

// Lo mismo, pero guardando cualquier dato (un objeto, un número...) como JSON. Si no hay nada guardado, o el dato está roto,
// devuelve null.
function leerJSON(clave, donde = 'local') {
    try {
        return JSON.parse(almacenamiento(donde).getItem(clave));
    } catch {
        return null;
    }
}

function guardarJSON(clave, valor, donde = 'local') {
    guardarTexto(clave, JSON.stringify(valor), donde);
}

// "Esto ya pasó en esta visita": una marca que dura lo que dure la pestaña (recargar la página no la borra)
function hayMarcaDeSesion(clave) {
    return leerTexto(clave, 'sesion') === '1';
}

function ponerMarcaDeSesion(clave) {
    guardarTexto(clave, '1', 'sesion');
}

// ---- Avisos entre scripts ------------------------------------------------------------------------------------------
// Los scripts se hablan con eventos del document (por ejemplo "carta-agregada" o "idioma-cambiado"). "detalle" es lo que
// recibe quien escucha, en evento.detail.
function emitir(nombre, detalle) {
    document.dispatchEvent(new CustomEvent(nombre, { detail: detalle }));
}

// ---- Qué pantalla es ----------------------------------------------------------------------------------------------
// Una sola definición de cada tipo de pantalla. Se lee con .matches (siempre dice cómo está en ese momento) y se puede
// escuchar con .addEventListener('change', ...).
// El corte de 700 px es el mismo que $corte-celular en design/parciales/_variables.scss: si se cambia uno, se cambia el otro.
const PANTALLA_DE_CELULAR = window.matchMedia('(max-width: 700px)');
const CON_DEDO = window.matchMedia('(hover: none)'); // pantalla táctil, sin "hover"
const CON_MOUSE = window.matchMedia('(hover: hover) and (pointer: fine)');

// ---- Ayudas --------------------------------------------------------------------------------------------------------
// El texto que se ve al dejar el puntero encima (title) y el que leen los lectores de pantalla (aria-label): casi siempre el mismo
function ponerAyuda(elemento, texto, textoParaLectores = texto) {
    elemento.title = texto;
    elemento.setAttribute('aria-label', textoParaLectores);
}
