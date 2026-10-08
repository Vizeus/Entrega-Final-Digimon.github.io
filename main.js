// -----------------------------------------------------------------------------------------------------------------
// ARRANQUE DE LA PÁGINA
//
// La puerta de entrada: el index.html carga solo este archivo, y los import de cada archivo traen el resto.
// Cada parte está en su archivo (pagina.js, api.js, combate.js, avisos.js, descartar.js, ventanas.js, cartas.js, zoom.js, gestos.js, inclinacion.js,
// audio.js, sonidos.js, filtros.js, info.js, barra.js, evolucion.js, baile.js, tema.js y menus.js). Acá se ponen en marcha, en este orden, y se
// conectan los botones que usan varias partes a la vez. Cuando la página termina de armarse, empieza la carga de los digimons.
// -----------------------------------------------------------------------------------------------------------------

import { activarDeteccionDeDedo, emitir } from './util.js';
import { nombreParaMostrar } from './nombres.js';
import { botonCambiarNiveles, botonIniciarCombate, cambiarClasificacion, listaDigimons, mostrarSistemaDeNiveles } from './pagina.js';
import { crearListaDeDigimons } from './api.js';
import { iniciarCombate } from './combate.js';
import { activarAvisoDeInclinacion, activarAvisoDeTema, activarAvisoDeZoomExtra, activarAvisosDeAyuda } from './avisos.js';
import { activarCartelesDeInfoEnCartas, ajustarNombre, cartasEnEspera, escribirNivel, escribirNombre } from './cartas.js';
import { activarArrastreDeZoomExtra, activarReflejoQuieto, activarZoom } from './zoom.js';
import { activarVoltearConDedo, gestionarVisitasYFlechasMovil } from './gestos.js';
import { activarInclinacion, activarRuedaConShift, evitarFocoYSeleccionConShift } from './inclinacion.js';
import { activarBotonDeAudio, activarDesbloqueoAudio, activarToqueEnBotonesConEspera, activarVibracion, aplicarSilencio } from './audio.js';
import { activarSonidoBotones, activarSonidoDeDesplegables } from './sonidos.js';
import { prepararFiltros } from './filtros.js';
import { activarInfo } from './info.js';
import { activarBarraQueSeEsconde, activarLogo, activarMenuMovil } from './barra.js';
import { activarEvolucion } from './evolucion.js';
import { activarBaileDeCartas } from './baile.js';
import { activarPaginaQuietaConVentanas } from './ventanas.js';
import { activarTema } from './tema.js';
import { activarCierreDeMenus } from './menus.js';

document.addEventListener('DOMContentLoaded', () => {
    mostrarSistemaDeNiveles();
    // Llamar a la función para cargar los digimons después de inicializar la configuración
    crearListaDeDigimons();
});

activarDeteccionDeDedo(); // primero: las demás partes y el CSS preguntan si se apunta con el dedo o con el mouse
activarCierreDeMenus(); // (también antes que el resto: tiene que ver los menús abiertos antes de que un toque los cierre)
activarTema(); // deja el tema (claro u oscuro) como lo eligió la persona
activarPaginaQuietaConVentanas(); // el dedo no desplaza la página con una ventana abierta
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
activarAvisoDeTema(); // (y este)
gestionarVisitasYFlechasMovil();
activarDesbloqueoAudio();
activarVoltearConDedo();
activarToqueEnBotonesConEspera(); // antes del sonido y la vibración: son los que escuchan su aviso
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
    cambiarClasificacion();
    mostrarSistemaDeNiveles();
    emitir('niveles-cambiados');
});

// (Cada carta reescribe el rótulo y también su ayuda, la que sale al dejar el puntero encima. Las que todavía esperan para entrar a la
// lista también: si no, entrarían con el nombre del sistema anterior.)
document.addEventListener('niveles-cambiados', () => {
    const cartas = [...listaDigimons.querySelectorAll(':scope > li'), ...cartasEnEspera.map(({ carta }) => carta)];
    cartas.forEach(escribirNivel);
});

// Agregar evento al botón de iniciar combate
botonIniciarCombate.addEventListener('click', iniciarCombate);

aplicarSilencio(); // si la persona había dejado el sonido apagado, los archivos de audio arrancan en silencio

// Por último, las partes que usan todo lo anterior: los filtros, las ventanas de información, la barra del celular, la línea
// evolutiva y el baile de las cartas. El orden importa: por ejemplo, cuando cambia el idioma, las cartas se traducen antes que las
// ventanas que muestran sus nombres.
prepararFiltros();
activarInfo();
activarMenuMovil();
activarBarraQueSeEsconde();
activarLogo();
activarEvolucion();
activarBaileDeCartas();
