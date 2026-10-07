// -----------------------------------------------------------------------------------------------------------------
// CARGA DE LOS DIGIMONS DESDE LA API (digi-api.com)
//
// Pide las páginas de la lista y los detalles de cada digimon (con reintentos y una caché en el navegador, IndexedDB), interpreta
// lo que trae la API (el nivel y el elemento) y arma las cartas. También maneja la barra de progreso de la carga.
// -----------------------------------------------------------------------------------------------------------------

import { PANTALLA_DE_CELULAR } from './util.js';
import {
    ASCENSOS,
    CARTAS_PROPIAS,
    ELEMENTOS_MANUALES,
    NIVELES_CORREGIDOS,
    NIVEL_DE_LOS_HYBRID,
    NIVEL_HYBRID_SIN_DATO,
    REGLAS_ELEMENTO,
    tipoDeLaApi,
} from './datos.js';
import { claveDeNombre } from './nombres.js';
import { barraProgreso, listaDigimons } from './pagina.js';
import { agregarCarta, colocarCartas, esperarTipografias, reducirMovimiento, separarXAntibody } from './cartas.js';

// URL base de la API
const URL_DE_LA_API = 'https://digi-api.com/api/v1/digimon';

// Número total de digimons
const TOTAL_DE_DIGIMONS = 1488; // todos los que tiene la API (digi-api.com)

// Número de páginas a recuperar (con pageSize=100 son solo 15 páginas en vez de 298)
const DIGIMONS_POR_PAGINA = 100;
const TOTAL_DE_PAGINAS = Math.ceil(TOTAL_DE_DIGIMONS / DIGIMONS_POR_PAGINA);

// Pasa el nivel que trae la API al nivel con el que se juega. Devuelve { nivel, marca }: la marca ('Armor' o 'Hybrid') solo
// existe si el digimon venía con ese nivel.
function resolverNivelDeLaApi(nombre, nivelApi) {
    if (!nivelApi || nivelApi === 'Unknown') return { nivel: 'Desconocido' };
    if (nivelApi === 'Armor') return { nivel: 'Adult', marca: 'Armor' };
    if (nivelApi === 'Hybrid') {
        const nivel = NIVEL_DE_LOS_HYBRID[claveDeNombre(separarXAntibody(nombre).nombre)] ?? NIVEL_HYBRID_SIN_DATO;
        return { nivel, marca: 'Hybrid' };
    }
    return { nivel: nivelApi };
}

// Deduce el elemento de un digimon a partir de los detalles que devuelve la API
function deducirElemento(id, detalles) {
    if (ELEMENTOS_MANUALES[id]) {
        return ELEMENTOS_MANUALES[id];
    }

    // Juntamos el nombre, la traducción y la descripción de todas sus habilidades
    const texto = (detalles.skills || [])
        .map(habilidad => [habilidad.skill, habilidad.translation, habilidad.description].filter(Boolean).join(' '))
        .join(' ')
        .toLowerCase();

    let elementoGanador = 'Neutro';
    let maximo = 0;
    let empate = false;

    for (const [elemento, regla] of Object.entries(REGLAS_ELEMENTO)) {
        const coincidencias = (texto.match(regla) || []).length;
        if (coincidencias > maximo) {
            elementoGanador = elemento;
            maximo = coincidencias;
            empate = false;
        } else if (coincidencias === maximo && coincidencias > 0) {
            empate = true;
        }
    }

    return empate ? 'Neutro' : elementoGanador;
}

// -----------------------------------------------------------------------------------------------------------------
// Caché en IndexedDB para los detalles de los digimons (así cargan al instante en visitas posteriores y no saturan la API)
// -----------------------------------------------------------------------------------------------------------------
const CACHE_DB_NOMBRE = 'digimon-cache-v1';
const CACHE_STORE_DETALLES = 'detalles';

function abrirCacheDB() {
    return new Promise(resolve => {
        if (!('indexedDB' in window)) return resolve(null);
        try {
            const peticion = indexedDB.open(CACHE_DB_NOMBRE, 1);
            peticion.onupgradeneeded = () => {
                const db = peticion.result;
                if (!db.objectStoreNames.contains(CACHE_STORE_DETALLES)) {
                    db.createObjectStore(CACHE_STORE_DETALLES);
                }
            };
            peticion.onsuccess = () => resolve(peticion.result);
            peticion.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

let promesaDeLaCache = null;
function obtenerCacheDB() {
    if (!promesaDeLaCache) promesaDeLaCache = abrirCacheDB();
    return promesaDeLaCache;
}

async function obtenerDetalleCache(url) {
    try {
        const db = await obtenerCacheDB();
        if (!db) return null;
        return new Promise(resolve => {
            const tx = db.transaction(CACHE_STORE_DETALLES, 'readonly');
            const store = tx.objectStore(CACHE_STORE_DETALLES);
            const req = store.get(url);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

async function guardarDetalleCache(url, datos) {
    if (!datos) return;
    try {
        const db = await obtenerCacheDB();
        if (!db) return;
        const tx = db.transaction(CACHE_STORE_DETALLES, 'readwrite');
        const store = tx.objectStore(CACHE_STORE_DETALLES);
        store.put(datos, url);
    } catch {
        // Silencioso si falla la escritura en cache
    }
}

// Función para obtener los digimons de una página con pageSize=100 y reintentos automáticos
async function obtenerPagina(numeroPagina, reintentos = 3) {
    for (let intento = 1; intento <= reintentos; intento++) {
        try {
            const respuesta = await fetch(`${URL_DE_LA_API}?pageSize=${DIGIMONS_POR_PAGINA}&page=${numeroPagina}`);
            if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
            const datos = await respuesta.json();
            return datos.content || [];
        } catch (error) {
            if (intento === reintentos) {
                console.warn(`Aviso: No se pudo obtener la página ${numeroPagina}:`, error.message);
                return [];
            }
            await new Promise(r => setTimeout(r, 400 * intento));
        }
    }
    return [];
}

// Función para obtener los detalles de un digimon específico con caché y reintentos
async function obtenerDetallesDigimon(url, reintentos = 3) {
    // 1. Intentar desde caché local IndexedDB
    try {
        const cacheado = await obtenerDetalleCache(url);
        if (cacheado) return cacheado;
    } catch {
        // Continuar si la caché no está disponible
    }

    // 2. Si no está en caché, solicitar con reintentos y retroceso exponencial
    for (let intento = 1; intento <= reintentos; intento++) {
        try {
            const respuesta = await fetch(url);
            if (!respuesta.ok) {
                if (respuesta.status === 404) return null;
                throw new Error(`HTTP ${respuesta.status}`);
            }
            const datos = await respuesta.json();
            guardarDetalleCache(url, datos);
            return datos;
        } catch (error) {
            if (intento === reintentos) {
                console.warn('Aviso al obtener detalles del digimon:', url, error.message);
                return null;
            }
            await new Promise(r => setTimeout(r, 500 * intento));
        }
    }
    return null;
}

// Función para obtener los digimons de todas las páginas
async function crearArrayDeDatos() {
    try {
        // Generar array de promesas para todas las páginas (15 páginas en vez de 298)
        const promesasPaginas = [];
        for (let i = 0; i < TOTAL_DE_PAGINAS; i++) {
            promesasPaginas.push(obtenerPagina(i));
        }

        // Esperar a que se resuelvan todas las promesas
        const paginas = await Promise.all(promesasPaginas);

        // Combinar todos los sub-arrays de cada página en un solo array
        const digimons = paginas.flat();

        return digimons; // Devolvemos el array aplanado de digimons
    } catch (error) {
        console.warn('Aviso al obtener todos los digimons:', error.message);
        return [];
    }
}

// Función para actualizar la barra de progreso
export function actualizarBarraProgreso(contador) {
    barraProgreso.value = contador;
    barraProgreso.max = TOTAL_DE_DIGIMONS;
    const completa = TOTAL_DE_DIGIMONS > 0 && contador >= TOTAL_DE_DIGIMONS;
    // En celular la carga es una línea finita en la barra: cuando se completa, se apaga.
    // En computadora el bloque (rótulo + barra) se desvanece y se retira (ver retirarBloqueDeCarga)
    document.getElementById('navbar').classList.toggle('carga-completa', completa);
    if (completa) retirarBloqueDeCarga();
    else document.querySelector('#navbar .carga')?.removeAttribute('hidden');
}

// En computadora el bloque de carga (rótulo + barra) ocupa lugar en la barra de arriba. Cuando la carga termina, el CSS lo
// desvanece (medio segundo después de llegar al 100 % y en 0,4 s) y acá se lo saca de la barra. Las demás piezas de la barra se
// reparten el lugar que queda, y para que no salten de golpe se las desliza de donde estaban a donde quedan (se miden antes y
// después de sacarlo y se anima la diferencia).
let retirandoCarga = false;
function retirarBloqueDeCarga() {
    const barra = document.getElementById('navbar');
    const bloque = barra.querySelector('.carga');
    // En celular la carga es una línea finita que solo se apaga (CSS): ahí no hay nada que retirar
    if (retirandoCarga || !bloque || bloque.hidden || PANTALLA_DE_CELULAR.matches) return;
    retirandoCarga = true;
    setTimeout(() => {
        retirandoCarga = false;
        if (!barra.classList.contains('carga-completa') || PANTALLA_DE_CELULAR.matches) return;
        const piezas = [...barra.querySelectorAll(':scope > img, .combate, .ajustes, .herramientas')];
        const antes = piezas.map(pieza => pieza.getBoundingClientRect());
        bloque.hidden = true;
        if (reducirMovimiento) return;
        piezas.forEach((pieza, i) => {
            const ahora = pieza.getBoundingClientRect();
            const dx = antes[i].left - ahora.left;
            const dy = antes[i].top - ahora.top;
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
            pieza.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], { duration: 450, easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)' });
        });
    }, 1000);
}

export let contadorDigimons = 0; // Contador de digimons cargados
const PEDIDOS_A_LA_VEZ = 6; // detalles que se piden a la API al mismo tiempo mientras carga la página

// Función para crear la lista de digimons
export async function crearListaDeDigimons() {
    try {
        // Obtenemos el array de digimons
        const digimons = await crearArrayDeDatos();

        // Las cartas miden sus nombres con las tipografías nuevas: esperamos a que carguen
        await esperarTipografias();

        // Pedimos los detalles de a varios a la vez (antes era de a uno y la carga duraba muchísimo, sobre todo en el
        // celular), pero las cartas se agregan siempre en orden
        const pedidos = [];
        let proximoPedido = 0;
        const pedirMas = () => {
            while (proximoPedido < digimons.length && proximoPedido - contadorDigimons < PEDIDOS_A_LA_VEZ) {
                pedidos[proximoPedido] = obtenerDetallesDigimon(digimons[proximoPedido].href);
                proximoPedido++;
            }
        };

        // Recorremos toda la lista de digimons
        for (const [indice, digimon] of digimons.entries()) {
            // Obtenemos los detalles de cada digimon
            pedirMas();
            const detalles = await pedidos[indice];
            pedidos[indice] = null;
            if (!detalles) {
                // si la API falló con este, seguimos con los demás (antes se cortaba toda la carga)
                contadorDigimons++;
                continue;
            }

            // Extraemos el tipo (atributo) o, sino tiene, le ponemos "Desconocido"
            const tipo = tipoDeLaApi[detalles.attributes?.[0]?.attribute] || 'Desconocido';

            // Extraemos el nivel original de la API (sin traducir) o, sino tiene, le ponemos "Desconocido".
            // Un nivel "Unknown" de la API también es desconocido. Los Armor y los Hybrid se pasan a uno de los 8 niveles
            // normales y quedan con su marca (resolverNivelDeLaApi). Los digimons de ASCENSOS suben a un nivel inventado.
            const { nivel: nivelDeLaApi, marca } = resolverNivelDeLaApi(digimon.name, detalles.levels?.[0]?.level);
            const nivelOriginal = ASCENSOS[digimon.id] ?? NIVELES_CORREGIDOS[digimon.id] ?? nivelDeLaApi;

            agregarCarta({
                id: digimon.id,
                nombre: digimon.name,
                imagen: digimon.image,
                tipo,
                nivelOriginal,
                marca,
                elemento: deducirElemento(digimon.id, detalles),
                datosDorso: {
                    especie: (detalles.types || []).map(especie => especie.type).join(', ') || '–',
                    campos: (detalles.fields || []).map(campo => campo.field).join(', ') || '–', // los "Fields" de la API: familias o temáticas (Deep Savers, Metal Empire...). Un digimon puede tener varios o ninguno
                    estreno: detalles.releaseDate || '–',
                    // Todos los ataques con su descripción (en inglés): para el botón "⚔️ Ataques" del dorso y para la pelea
                    habilidades: (detalles.skills || [])
                        .filter(habilidad => habilidad.skill)
                        .map(habilidad => ({ nombre: habilidad.skill, traduccion: habilidad.translation || '', descripcion: habilidad.description || '' })),
                    descripcion: (detalles.descriptions || []).find(texto => texto.language === 'en_us')?.description || '',
                    evo: {
                        previas: (detalles.priorEvolutions || []).map(item => ({ id: item.id, condicion: item.condition || '' })),
                        siguientes: (detalles.nextEvolutions || []).map(item => ({ id: item.id, condicion: item.condition || '' })),
                    },
                },
            });

            // Actualizamos el contador (la barra de progreso se actualiza con cada tanda de cartas)
            contadorDigimons++;
        }

        // Las cartas que no están en la API (Yggdrasil y Homeostasis) van al final
        CARTAS_PROPIAS.forEach(agregarCarta);
        colocarCartas(); // entra la última tanda

        // Ya están todas las cartas (y sus nombres medidos): en celular, el navegador puede dejar de dibujar las que no se ven
        listaDigimons.classList.add('lista-completa');
    } catch (error) {
        console.error('Error al crear la lista de digimons:', error);
    }
}
