// -----------------------------------------------------------------------------------------------------------------
// ELEMENTOS DE LA PÁGINA Y SISTEMA DE NIVELES
//
// Lo que usan casi todos los demás archivos: la lista de cartas (y cómo encontrar una por su id), los botones de la barra
// y qué nombres de nivel se muestran (los de Japón o los de EE.UU.).
// -----------------------------------------------------------------------------------------------------------------

import { guardarTexto, leerTexto, ponerAyuda } from './util.js';
import { nivelesAlternativos, nivelesEnJapones } from './datos.js';
import { idioma, t } from './i18n.js';

// Seleccionar el elemento <ul> (unordered list) donde agregaremos los digimons
export const listaDigimons = document.getElementById('listado-digimons');

// Las cartas que ya están en la página, por su id (el de la API): buscar una es instantáneo, sin recorrer la lista.
// Cada carta se anota cuando entra a la página (colocarCartas); las que todavía esperan su turno no están.
export const cartasPorId = new Map();
export const cartaPorId = id => cartasPorId.get(String(id));

// Seleccionar la barra de progreso
export const barraProgreso = document.getElementById('carga');

// Seleccionar el botón de cambiar niveles
export const botonCambiarNiveles = document.getElementById('cambiar-niveles');

// Seleccionar el botón de iniciar combate
export const botonIniciarCombate = document.getElementById('iniciar-combate');

// Seleccionar el contador de digimons elegidos (junto a la consigna, arriba)
export const contadorSeleccion = document.getElementById('contador-seleccion');

// ¿El navegador es de Japón? Se mira el idioma (ja, ja-JP) o la región de cualquiera de los idiomas preferidos, y como último recurso la zona horaria.
function esDeJapon() {
    const preferidos = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    if (preferidos.some(idioma => /^ja\b|[-_]JP\b/i.test(String(idioma)))) return true;
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Tokyo';
    } catch {
        return false;
    }
}

// Qué sistema de clasificación de niveles se está mostrando (lo guarda el botón de la banderita).
// Si todavía no se eligió nada: en Japón, los nombres japoneses; en el resto del mundo, los de EE.UU.
// En japonés no hay elección: en Japón no se usa la doble nomenclatura (la de EE.UU. es cosa de Occidente), así que se muestra siempre la japonesa
// y el botón se esconde (ver _barra.scss). Lo que la persona había elegido se recuerda para cuando vuelva al español o al inglés.
const sistemaGuardado = leerTexto('clasificacionAlternativa', 'sesion');
let sistemaElegido = sistemaGuardado === null ? !esDeJapon() : sistemaGuardado === 'true';
export let clasificacionAlternativa = idioma === 'ja' ? false : sistemaElegido;

// Al cambiar de idioma (este aviso se escucha antes que el de las cartas, los filtros y los menús: ver el orden en que cargan los archivos)
document.addEventListener('idioma-cambiado', () => {
    clasificacionAlternativa = idioma === 'ja' ? false : sistemaElegido;
});

// Pasa al otro sistema de clasificación (si no se puede guardar, igual cambia mientras la página esté abierta)
export function cambiarClasificacion() {
    if (idioma === 'ja') return; // (el botón está escondido, pero por las dudas)
    sistemaElegido = !sistemaElegido;
    clasificacionAlternativa = sistemaElegido;
    guardarTexto('clasificacionAlternativa', String(sistemaElegido), 'sesion');
}

// Nombre de un nivel para mostrar, según el sistema de clasificación vigente.
// Recibe el nombre original de la API ('Adult'); si no tiene nivel, es 'Desconocido' y se traduce según el idioma.
export function nombreNivel(nivelApi) {
    if (nivelApi === 'Desconocido') {
        return t('nivel.Desconocido');
    }
    return nombreNivelEnSistema(nivelApi, clasificacionAlternativa);
}

// Nombre de un nivel en uno de los dos sistemas (alternativa: true es el de EE.UU.). El de Japón usa los nombres de la API ('Child', 'Adult'...), y en
// japonés, los kanji que se usan en Japón (成長期, 成熟期...). El de EE.UU. va siempre en inglés (Rookie, Champion...).
export function nombreNivelEnSistema(nivelApi, alternativa) {
    if (alternativa) return nivelesAlternativos[nivelApi] || nivelApi;
    return (idioma === 'ja' && nivelesEnJapones[nivelApi]) || nivelApi;
}

// Selector de niveles: resalta el sistema vigente (Japón o EE.UU.) y escribe su ayuda (título y aria-label) en el idioma actual.
// El sistema vigente se recuperó de sessionStorage más arriba.
export function mostrarSistemaDeNiveles() {
    const sistema = clasificacionAlternativa ? 'eeuu' : 'japon';
    botonCambiarNiveles.querySelectorAll('.sn-opcion').forEach(opcion => {
        opcion.classList.toggle('activo', opcion.dataset.sistema === sistema);
    });
    const ayuda = t(`niveles.ayuda.${sistema}`);
    ponerAyuda(botonCambiarNiveles, ayuda);
}

// Si se cambia el idioma, la ayuda del selector se vuelve a escribir en el idioma nuevo
document.addEventListener('idioma-cambiado', mostrarSistemaDeNiveles);
