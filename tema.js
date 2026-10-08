// -----------------------------------------------------------------------------------------------------------------
// TEMA CLARO / OSCURO
//
// La página tiene dos aspectos: el claro (el de siempre) y uno oscuro. La persona elige entre tres opciones con un botón de la barra (junto a los de
// sonido e inclinación; en celular, dentro del menú ☰):
//     "auto"    sigue al dispositivo: si el celular o la computadora están en modo oscuro, la página también (y cambia sola si cambian ellos)
//     "claro"   siempre claro
//     "oscuro"  siempre oscuro
// Cada toque pasa a la siguiente (auto → claro → oscuro → auto). La elección se guarda en el navegador de cada persona (localStorage), como
// el texto "auto", "claro" u "oscuro", así la próxima vez que entre sigue como la dejó. Por defecto es "auto".
// Para volver a empezar (por ejemplo, para probarlo): localStorage.removeItem('digimon-tema')
//
// Cómo se aplica: <html> lleva data-tema="claro" u "oscuro" (el que se ve ahora) y data-tema-pref con lo que eligió la persona. Todo el CSS
// oscuro cuelga de :root[data-tema="oscuro"] (ver design/parciales/_tema-oscuro.scss). El index.html lo decide con un script chiquito antes
// de que se dibuje nada, para que la página no parpadee en claro cuando el tema es oscuro; acá se mantiene al día.
// -----------------------------------------------------------------------------------------------------------------

import { emitir, guardarTexto, leerTexto, ponerAyuda } from './util.js';
import { t } from './i18n.js';

export const TEMA_ALMACEN = 'digimon-tema';
const TEMAS = ['auto', 'claro', 'oscuro']; // en el orden en que los recorre el botón
const COLOR_DE_LA_BARRA_DEL_NAVEGADOR = '#0a1230'; // con el tema oscuro, el navegador del celular pinta su barra de este color

const sistemaEnOscuro = window.matchMedia('(prefers-color-scheme: dark)');

// Lo que eligió la persona ("auto" si nunca eligió o si el dato guardado está roto)
export function preferenciaDeTema() {
    const guardado = leerTexto(TEMA_ALMACEN);
    return TEMAS.includes(guardado) ? guardado : 'auto';
}

// El tema que se ve ahora ("claro" u "oscuro") para esa elección
export function temaVigente(preferencia = preferenciaDeTema()) {
    if (preferencia === 'auto') return sistemaEnOscuro.matches ? 'oscuro' : 'claro';
    return preferencia;
}

export const hayTemaOscuro = () => document.documentElement.dataset.tema === 'oscuro';

// Los navegadores del celular pintan su barra de arriba con el color de <meta name="theme-color">. Sin esa etiqueta usan el suyo (el claro de
// siempre); con el tema oscuro se la pone, para que la barra no quede blanca sobre una página oscura.
function pintarBarraDelNavegador(oscuro) {
    let etiqueta = document.querySelector('meta[name="theme-color"]');
    if (!oscuro) {
        etiqueta?.remove();
        return;
    }
    if (!etiqueta) {
        etiqueta = document.createElement('meta');
        etiqueta.name = 'theme-color';
        document.head.append(etiqueta);
    }
    etiqueta.content = COLOR_DE_LA_BARRA_DEL_NAVEGADOR;
}

// Deja la página con el tema que corresponde a lo elegido. Devuelve true si cambió el tema que se ve
function aplicarTema() {
    const preferencia = preferenciaDeTema();
    const tema = temaVigente(preferencia);
    const raiz = document.documentElement;
    const cambio = raiz.dataset.tema !== tema;
    raiz.dataset.temaPref = preferencia;
    raiz.dataset.tema = tema;
    pintarBarraDelNavegador(tema === 'oscuro');
    return cambio;
}

export function activarTema() {
    const boton = document.getElementById('tema');
    aplicarTema();
    if (!boton) return;

    // El botón muestra el ícono de la opción elegida (data-modo, que lee el CSS) y su ayuda cuenta qué es y qué pasa al tocarlo
    const mostrarModo = () => {
        const preferencia = preferenciaDeTema();
        boton.dataset.modo = preferencia;
        ponerAyuda(boton, t(`tema.${preferencia}`, { actual: t(`tema.actual.${temaVigente(preferencia)}`) }));
    };

    const avisarElCambio = () => {
        mostrarModo();
        emitir('tema-cambiado', { preferencia: preferenciaDeTema(), tema: document.documentElement.dataset.tema });
    };

    boton.addEventListener('click', () => {
        const siguiente = TEMAS[(TEMAS.indexOf(preferenciaDeTema()) + 1) % TEMAS.length];
        guardarTexto(TEMA_ALMACEN, siguiente);
        aplicarTema();
        avisarElCambio();
    });

    // Con "auto", si el dispositivo cambia de modo (por ejemplo, el celular pasa a modo noche al atardecer) la página lo sigue sin recargar
    sistemaEnOscuro.addEventListener('change', () => {
        if (preferenciaDeTema() === 'auto' && aplicarTema()) avisarElCambio();
        else mostrarModo(); // (la ayuda dice cuál es el del dispositivo "ahora")
    });

    // Si la página está abierta en otra pestaña y allá se cambia el tema, esta la acompaña
    window.addEventListener('storage', evento => {
        if (evento.key !== TEMA_ALMACEN && evento.key !== null) return;
        aplicarTema();
        avisarElCambio();
    });

    document.addEventListener('idioma-cambiado', mostrarModo);
    mostrarModo();
}
