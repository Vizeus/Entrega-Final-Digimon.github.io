// -----------------------------------------------------------------------------------------------------------------
// ARRANQUE DE LA PÁGINA
//
// Cada parte está en su archivo (pagina.js, api.js, combate.js, avisos.js, cartas.js, zoom.js, gestos.js, inclinacion.js,
// audio.js y sonidos.js). Acá se ponen en marcha, en este orden, y se conectan los botones que usan varias partes a la vez.
// Cuando la página termina de armarse, empieza la carga de los digimons.
// -----------------------------------------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    mostrarSistemaDeNiveles();
    // Llamar a la función para cargar los digimons después de inicializar la configuración
    crearListaDeDigimons();
});

activarInclinacion();
activarRuedaConShift();
evitarFocoYSeleccionConShift();
activarCartelesDeInfoEnCartas();
activarZoom();
activarArrastreDeZoomExtra();
activarReflejoQuieto();
activarAvisosDeAyuda();
activarAvisoDeInclinacion(); // después de los avisos de ayuda: usa el contador de visitas que ellos cuentan
activarAvisoDeZoomExtra(); // (este también)
gestionarVisitasYFlechasMovil();
activarDesbloqueoAudio();
activarVoltearConDedo();
activarSonidoBotones();
activarSonidoDeDesplegables();
activarBotonDeAudio();
activarVibracion();

// Si cambia el idioma, cada carta vuelve a escribir su nombre si le toca uno distinto. Hoy el español y el inglés muestran
// los mismos nombres, así que no se toca ninguna; es lo que hará falta con el japonés (ver nombres.js).
document.addEventListener('idioma-cambiado', () => {
    const cartas = [...listaDigimons.querySelectorAll(':scope > li'), ...cartasEnEspera.map(({ carta }) => carta)];
    for (const carta of cartas) {
        if (carta.querySelector('h4').textContent.trim() === nombreParaMostrar(carta.dataset.nombreApi)) continue;
        escribirNombre(carta);
        if (carta.isConnected) ajustarNombre(carta); // ya está en la página: el nombre nuevo puede medir distinto
    }
});

// Cambiar de sistema de niveles NO recarga la página: se escribe de nuevo el nombre de cada nivel donde aparece.
// Las cartas lo hacen acá; los filtros (filtros.js), los menús (info.js) y la línea evolutiva (evolucion.js) escuchan el mismo aviso.
botonCambiarNiveles.addEventListener('click', () => {
    clasificacionAlternativa = !clasificacionAlternativa;
    guardarTexto('clasificacionAlternativa', String(clasificacionAlternativa), 'sesion'); // si no se puede guardar, igual cambia mientras la página esté abierta
    mostrarSistemaDeNiveles();
    emitir('niveles-cambiados');
});

document.addEventListener('niveles-cambiados', () => {
    listaDigimons.querySelectorAll(':scope > li').forEach(carta => {
        carta.querySelector('.c-nivel').textContent = nombreNivel(carta.dataset.nivelApi);
    });
});

// Agregar evento al botón de iniciar combate
botonIniciarCombate.addEventListener('click', iniciarCombate);

aplicarSilencio(); // si la persona había dejado el sonido apagado, los archivos de audio arrancan en silencio
