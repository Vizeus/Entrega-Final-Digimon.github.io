// -----------------------------------------------------------------------------------------------------------------
// ELEMENTOS DE LA PÁGINA Y SISTEMA DE NIVELES
//
// Lo que usan casi todos los demás archivos: la lista de cartas (y cómo encontrar una por su id), los botones de la barra
// y qué nombres de nivel se muestran (los de Japón o los de EE.UU.).
// -----------------------------------------------------------------------------------------------------------------

import { guardarTexto, leerTexto, ponerAyuda } from './util.js';
import { nivelesAlternativos } from './datos.js';
import { t } from './i18n.js';

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

// Qué sistema de clasificación de niveles se está mostrando (lo guarda el botón de la banderita)
export let clasificacionAlternativa = leerTexto('clasificacionAlternativa', 'sesion') === 'true';

// Pasa al otro sistema de clasificación (si no se puede guardar, igual cambia mientras la página esté abierta)
export function cambiarClasificacion() {
    clasificacionAlternativa = !clasificacionAlternativa;
    guardarTexto('clasificacionAlternativa', String(clasificacionAlternativa), 'sesion');
}

// Nombre de un nivel para mostrar, según el sistema de clasificación vigente.
// Recibe el nombre original de la API ('Adult'); si no tiene nivel, es 'Desconocido' y se traduce según el idioma.
export function nombreNivel(nivelApi) {
    if (nivelApi === 'Desconocido') {
        return t('nivel.Desconocido');
    }
    return (clasificacionAlternativa ? nivelesAlternativos[nivelApi] || nivelApi : nivelApi).trim();
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
