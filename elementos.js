// -----------------------------------------------------------------------------------------------------------------
// ELEMENTO DE UN DIGIMON: se deduce sumando puntos de cuatro fuentes (la API no trae el elemento)
//   1. Su especie ("types" de la API: Plant, Cyborg, Angel…): la más fuerte, dice lo que el digimon ES.
//   2. Sus ataques (nombre, traducción y descripción): palabras clave de cada elemento (ver REGLAS_ELEMENTO). Cada palabra cuenta una sola vez por ataque
//      (el nombre y la descripción de un mismo ataque suelen repetirla), las palabras ambiguas (air, wave, light, ground) cuentan la mitad, frases como
//      "shock wave" no cuentan y las de armas (cannon, laser, missile, gatling) solo cuentan si el digimon tiene especie o grupo metálico.
//   3. Su descripción: las mismas palabras clave, pero con menos peso (en un texto largo aparecen palabras sueltas) y sin repetir lo que ya contaron sus ataques.
//   4. Sus grupos ("fields": Deep Savers, Metal Empire…): solo desempatan, y solo los que apuntan a un elemento claro.
// Gana el elemento con más puntos. Si hay empate se desempata por especie, luego por ataques y luego por descripción; si sigue
// el empate, o casi no hay puntos, es Neutro. Si gana por medio punto o menos (un empate práctico) y sin que lo respalden la especie ni los grupos (solo palabras sueltas),
// tampoco se decide: queda Neutro y se marca "enRevision". Es un cálculo sin DOM, así que también lo usa la herramienta de auditoría.
// -----------------------------------------------------------------------------------------------------------------

import { REGLAS_ELEMENTO } from './datos.js';

// Peso de cada fuente (por coincidencia) y tope de coincidencias que cuentan de un mismo elemento en esa fuente
export const PESO_ESPECIE = 3;
export const PESO_ESPECIE_MUY_DEBIL = 1; // Cyborg: tener cuerpo mecánico no dice de qué elemento pelea (MetalGreymon es de fuego, MetalGarurumon de hielo…)
export const PESO_ESPECIE_DEBIL = 2; // para las especies que no dicen tanto del elemento (un molusco puede ser de agua, de veneno…)
export const PESO_ATAQUES = 1;
export const TOPE_ATAQUES = 4;
export const PESO_DESCRIPCION = 1;
export const TOPE_DESCRIPCION = 2;
export const PESO_GRUPO = 1;
export const PUNTOS_MINIMOS = 2; // con menos puntos que esto no hay elemento: es Neutro
export const PESO_PALABRA_AMBIGUA = 0.5; // palabras que casi siempre son parte de otra cosa ("in the air", "light armor", "energy wave", "on the ground")
export const MARGEN_DUDOSO = 0.5; // ganar por tan poco (o menos) sin especie ni grupo que lo respalde no alcanza para decidir (con 1 punto, un tercio de los digimons quedaba Neutro)

const PALABRAS_AMBIGUAS = new Set(['air', 'wave', 'light', 'ground']);
// Frases con una palabra clave que no dicen nada del elemento: una onda de choque o de sonido no es de agua ni de rayo
const FRASES_SIN_ELEMENTO = /\b(?:shock|energy|sound|sonic|shock)\s?waves?\b/g;
// Un cañón o un láser no hacen a un digimon de metal (Lillymon dispara un Flower Cannon): cuentan solo si ya es metálico por su especie o su grupo
const PALABRAS_DE_ARMA = /\b(?:cannon|laser|missile|gatling)\b/g;

// Especie (tal cual la trae la API) → elemento. Las que no están acá no suman nada (Baby, Armor, Unknown…).
export const ELEMENTO_DE_LA_ESPECIE = {
    // Planta
    Plant: 'Planta',
    'Ancient Plant': 'Planta',
    'Insectivorous Plant': 'Planta',
    Seed: 'Planta',
    Bulb: 'Planta',
    // Agua
    Aquatic: 'Agua',
    'Aquatic Mammal': 'Agua',
    'Aquatic Beast Man': 'Agua',
    'Ancient Aquatic Beast Man': 'Agua',
    Fish: 'Agua',
    'Ancient Fish': 'Agua',
    'Tropical Fish': 'Agua',
    Marine: 'Agua',
    'Marine Beast': 'Agua',
    'Marine Man': 'Agua',
    'Ocean Dragon': 'Agua',
    Mollusk: 'Agua',
    Crustacean: 'Agua',
    'Ancient Crustacean': 'Agua',
    Shellfish: 'Agua',
    Plesiosaur: 'Agua',
    // Fuego e Hielo
    Flame: 'Fuego',
    'Flame Dragon': 'Fuego',
    'Ice-Snow': 'Hielo',
    // Tierra
    Rock: 'Tierra',
    'Rock Dragon': 'Tierra',
    'Earth Dragon': 'Tierra',
    Mineral: 'Tierra',
    'Ancient Mineral': 'Tierra',
    Ore: 'Tierra',
    'Ancient Ore': 'Tierra',
    // Viento
    Bird: 'Viento',
    'Ancient Bird': 'Viento',
    'Giant Bird': 'Viento',
    'Small Bird': 'Viento',
    Chick: 'Viento',
    Pterosaur: 'Viento',
    'Sky Dragon': 'Viento',
    'Bird Dragon': 'Viento',
    // Metal
    Cyborg: 'Metal',
    Machine: 'Metal',
    'Machine Dragon': 'Metal',
    'Synthetic Beast': 'Metal',
    Weapon: 'Metal',
    'Security System': 'Metal',
    // Luz
    Angel: 'Luz',
    Archangel: 'Luz',
    'Small Angel': 'Luz',
    Cherub: 'Luz',
    Ophan: 'Luz',
    Seraph: 'Luz',
    Principality: 'Luz',
    Dominion: 'Luz',
    Virtue: 'Luz',
    'Holy Beast': 'Luz',
    'Holy Knight': 'Luz',
    'Ancient Holy Knight': 'Luz',
    'Holy Dragon': 'Luz',
    'Holy Sword': 'Luz',
    'Holy Bird': 'Luz',
    'Holy Mechanical Warrior': 'Luz',
    'Light Dragon': 'Luz',
    Tathāgata: 'Luz',
    // Oscuridad
    'Demon Beast': 'Oscuridad',
    'Demon Dragon': 'Oscuridad',
    'Demon God': 'Oscuridad',
    'Demon Lord': 'Oscuridad',
    'Demon Man': 'Oscuridad',
    Devil: 'Oscuridad',
    'Devil Dragon': 'Oscuridad',
    'Small Devil': 'Oscuridad',
    'Fallen Angel': 'Oscuridad',
    'Artificial Fallen Angel': 'Oscuridad',
    'Dark Dragon': 'Oscuridad',
    'Dark Knight': 'Oscuridad',
    'Evil Dragon': 'Oscuridad',
    'Wicked God': 'Oscuridad',
    'Bewitching Beast': 'Oscuridad',
    'Bewitching Bird': 'Oscuridad',
    Undead: 'Oscuridad',
    Ghost: 'Oscuridad',
    Skeleton: 'Oscuridad',
    Oni: 'Oscuridad',
    // Veneno
    Parasite: 'Veneno',
};

// Especies de la lista de arriba que cuentan menos (ver PESO_ESPECIE_DEBIL)
const ESPECIES_DEBILES = new Set([
    'Mollusk',
    'Crustacean',
    'Ancient Crustacean',
    'Shellfish',
    'Bewitching Beast',
    'Bewitching Bird',
    'Mineral',
    'Ancient Mineral',
    'Ore',
    'Ancient Ore',
    'Chick',
]);

const pesoDeLaEspecie = especie => (especie === 'Cyborg' ? PESO_ESPECIE_MUY_DEBIL : ESPECIES_DEBILES.has(especie) ? PESO_ESPECIE_DEBIL : PESO_ESPECIE);

// Grupos que apuntan a un elemento claro (los demás mezclan de todo y no cuentan: Nature Spirits, Wind Guardians, Dragon's Roar y Unknown). Salió de medir,
// con los datos de la API, qué parte de los miembros de cada grupo tiene un elemento parecido (herramientas/elementos-auditoria.mjs).
export const ELEMENTO_DEL_GRUPO = {
    'Dark Area': 'Oscuridad',
    'Deep Savers': 'Agua',
    'Nightmare Soldiers': 'Oscuridad',
    'Metal Empire': 'Metal',
    'Virus Busters': 'Luz',
    'Jungle Troopers': 'Planta',
};
// Un digimon con muchos grupos (Agumon está en 6) no dice nada con ellos: a partir de este número, los grupos no suman
export const MAXIMO_DE_GRUPOS = 2;

const ELEMENTOS = Object.keys(REGLAS_ELEMENTO);

// El nombre de un digimon no cuenta para su elemento ("Metal Garurumon" no es de metal por llamarse así, ni "Death Devimon" de oscuridad). Antes de buscar
// palabras clave se borran del texto las palabras del nombre del propio digimon y, si se pasa `nombresDeDigimons`, los nombres de los demás digimons.
export function nombreSinParentesis(nombre) {
    return String(nombre || '')
        .replace(/\(.*?\)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Arma la expresión que borra los nombres de todos los digimons (los más largos primero, para que "Metal Garurumon" no quede a medias en "Garurumon")
export function expresionDeNombres(nombres) {
    const limpios = [
        ...new Set(
            nombres.map(nombreSinParentesis).filter(nombre => nombre.length >= 4 && (/\s/.test(nombre) || !Object.keys(contarPalabrasClave(nombre)).length)),
        ),
    ].sort((a, b) => b.length - a.length);
    const escapados = limpios.map(nombre => nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return escapados.length ? new RegExp(`\\b(?:${escapados.join('|')})\\b`, 'gi') : null;
}

function sinNombres(texto, nombre, nombresDeDigimons) {
    let limpio = nombresDeDigimons ? texto.replace(nombresDeDigimons, ' ') : texto;
    for (const palabra of nombreSinParentesis(nombre).split(/[\s-]+/)) {
        if (palabra.length >= 3) limpio = limpio.replace(new RegExp(`\\b${palabra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ');
    }
    return limpio;
}

// Cuántas veces aparecen en el texto las palabras clave de cada elemento: { Fuego: 2, Agua: 1… } (solo los que aparecen)
export function contarPalabrasClave(texto) {
    const cuentas = {};
    const minusculas = texto.toLowerCase();
    for (const elemento of ELEMENTOS) {
        const coincidencias = (minusculas.match(REGLAS_ELEMENTO[elemento]) || []).length;
        if (coincidencias) cuentas[elemento] = coincidencias;
    }
    return cuentas;
}

// Las palabras clave de cada elemento que hay en un texto: { Fuego: Map('fire' → 2, 'flame' → 1), … }. Aplica las frases sin elemento y, si no se permiten
// (`conArmas` false), borra las palabras de armas.
function palabrasClaveDelTexto(texto, conArmas) {
    let minusculas = texto.toLowerCase().replace(FRASES_SIN_ELEMENTO, ' ');
    if (!conArmas) minusculas = minusculas.replace(PALABRAS_DE_ARMA, ' ');
    const porElemento = {};
    for (const elemento of ELEMENTOS) {
        for (const palabra of minusculas.match(REGLAS_ELEMENTO[elemento]) || []) {
            porElemento[elemento] ??= new Map();
            porElemento[elemento].set(palabra, (porElemento[elemento].get(palabra) ?? 0) + 1);
        }
    }
    return porElemento;
}

const pesoDeLaPalabra = palabra => (PALABRAS_AMBIGUAS.has(palabra) ? PESO_PALABRA_AMBIGUA : 1);

// Puntos de cada elemento: { Planta: { especie: 4, ataques: 1, descripcion: 2, grupo: 0, total: 7 }, … } (solo los que tienen algo)
// `datos`: { nombre: 'Metal Garurumon', nombresDeDigimons: /…/ (opcional), especies: ['Plant'], grupos: ['Deep Savers'], descripcion: '…', habilidades: [{ nombre, traduccion, descripcion }] }
export function puntosPorElemento({ nombre = '', nombresDeDigimons = null, especies = [], grupos = [], descripcion = '', habilidades = [] }) {
    const puntos = {};
    const sumar = (elemento, fuente, cantidad) => {
        if (!elemento || !cantidad) return; // (una especie o un grupo sin elemento no suma)
        puntos[elemento] ??= { especie: 0, ataques: 0, descripcion: 0, grupo: 0, total: 0 };
        puntos[elemento][fuente] += cantidad;
        puntos[elemento].total += cantidad;
    };

    for (const especie of new Set(especies)) sumar(ELEMENTO_DE_LA_ESPECIE[especie], 'especie', pesoDeLaEspecie(especie));
    const conArmas = especies.some(especie => ELEMENTO_DE_LA_ESPECIE[especie] === 'Metal') || grupos.some(grupo => ELEMENTO_DEL_GRUPO[grupo] === 'Metal');

    // Ataques: cada palabra cuenta una vez por ataque (el nombre y la descripción del mismo ataque suelen repetirla); lo de todos los ataques se suma
    const deLosAtaques = {};
    const palabrasDeLosAtaques = new Set(); // (elemento:palabra) para no volver a contarlas en la descripción
    for (const habilidad of habilidades) {
        const texto = sinNombres([habilidad.nombre, habilidad.traduccion, habilidad.descripcion].filter(Boolean).join(' '), nombre, nombresDeDigimons);
        for (const [elemento, palabras] of Object.entries(palabrasClaveDelTexto(texto, conArmas))) {
            for (const palabra of palabras.keys()) {
                deLosAtaques[elemento] = (deLosAtaques[elemento] ?? 0) + pesoDeLaPalabra(palabra);
                palabrasDeLosAtaques.add(`${elemento}:${palabra}`);
            }
        }
    }
    for (const [elemento, n] of Object.entries(deLosAtaques)) sumar(elemento, 'ataques', Math.min(n, TOPE_ATAQUES) * PESO_ATAQUES);

    // Descripción: sin contar otra vez las palabras que ya contaron los ataques (la descripción suele repetir el ataque estrella)
    for (const [elemento, palabras] of Object.entries(palabrasClaveDelTexto(sinNombres(descripcion, nombre, nombresDeDigimons), conArmas))) {
        let n = 0;
        for (const [palabra, veces] of palabras) if (!palabrasDeLosAtaques.has(`${elemento}:${palabra}`)) n += veces * pesoDeLaPalabra(palabra);
        sumar(elemento, 'descripcion', Math.min(n, TOPE_DESCRIPCION) * PESO_DESCRIPCION);
    }
    if (new Set(grupos).size <= MAXIMO_DE_GRUPOS) for (const grupo of new Set(grupos)) sumar(ELEMENTO_DEL_GRUPO[grupo], 'grupo', PESO_GRUPO);
    return puntos;
}

// Con una sola coincidencia de la descripción (o de un grupo) no alcanza; con una de la especie o de un ataque sí
const tieneSenalSuficiente = p => p.total >= PUNTOS_MINIMOS || p.especie + p.ataques >= 1;

// El elemento que gana: { elemento, puntos } (Neutro si no llega al mínimo o si hay un empate que no se puede desempatar)
export function deducirElementoPorPuntos(datos) {
    const puntos = puntosPorElemento(datos);
    const orden = Object.entries(puntos).sort(
        ([, a], [, b]) => b.total - a.total || b.especie - a.especie || b.ataques - a.ataques || b.descripcion - a.descripcion,
    );
    if (!orden.length || !tieneSenalSuficiente(orden[0][1])) return { elemento: 'Neutro', puntos };
    const [mejor, segundo] = orden;
    if (segundo) {
        const a = mejor[1];
        const b = segundo[1];
        if (a.total === b.total && a.especie === b.especie && a.ataques === b.ataques && a.descripcion === b.descripcion) return { elemento: 'Neutro', puntos };
        // Ganó por muy poco y solo con palabras sueltas (sin especie ni grupo): no alcanza para decidir
        if (a.total - b.total <= MARGEN_DUDOSO && !a.especie && !a.grupo) return { elemento: 'Neutro', puntos, enRevision: true };
    }
    return { elemento: mejor[0], puntos };
}
