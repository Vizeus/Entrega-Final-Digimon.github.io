// URL base de la API
const urlBase = 'https://digi-api.com/api/v1/digimon';

// Seleccionar el elemento <ul> (unordered list) donde agregaremos los digimons
const listaDigimons = document.getElementById('listado-digimons');

// Seleccionar la barra de progreso
const barraProgreso = document.getElementById('carga');

// Seleccionar el botón de cambiar niveles
const botonCambiarNiveles = document.getElementById('cambiar-niveles');

// Seleccionar el botón de iniciar combate
const botonIniciarCombate = document.getElementById('iniciar-combate');

// Seleccionar el contador de digimons elegidos (junto a la consigna, arriba)
const contadorSeleccion = document.getElementById('contador-seleccion');

// Número total de Digimons 
const totalDigimons = 1488; // todos los que tiene la API (digi-api.com)

// Número de páginas a recuperar (con pageSize=100 son solo 15 páginas en vez de 298)
const DIGIMONS_POR_PAGINA = 100;
const totalPaginas = Math.ceil(totalDigimons / DIGIMONS_POR_PAGINA);

// Tipo (atributo) de cada Digimon: la API lo trae en inglés y por dentro lo guardamos con estos nombres en español.
// Lo que se ve en pantalla ("Datos" o "Data") lo decide i18n.js según el idioma, ver nombreTipo().
const tipoDeLaApi = {
    'Data': 'Datos',
    'Vaccine': 'Vacuna',
    'Virus': 'Virus',
    'Free': 'Libre',
    'Variable': 'Variable',
    'Unknown': 'Desconocido',
};

// Emoji de cada tipo para mostrar en la carta, en los filtros y en los menús
const EMOJIS_TIPO = {
    'Datos': '🔢',
    'Vacuna': '💉',
    'Virus': '👾',
    'Libre': '🕊️',
    'Variable': '🔀',
    'Desconocido': '❓',
};

// Mapeo de niveles para el cambio de sistema de clasificación de niveles
const nivelesAlternativos = {
    'Baby I': 'Fresh/Slime',
    'Baby II': 'In-Training',
    'Child': 'Rookie',
    'Adult': 'Champion',
    'Perfect': 'Ultimate ',
    'Ultimate': 'Mega',
    'Super Ultimate': 'Ultra', // nivel 7 (inventado para este simulador): por encima del Mega
    'Absolute': 'Apex'         // nivel 8 (inventado para este simulador): lo más alto
};

// Qué sistema de clasificación de niveles se está mostrando (lo guarda el botón de la banderita)
let clasificacionAlternativa = sessionStorage.getItem('clasificacionAlternativa') === 'true';

// Nombre de un nivel para mostrar, según el sistema de clasificación vigente.
// Recibe el nombre original de la API ('Adult'); si no tiene nivel, es 'Desconocido' y se traduce según el idioma.
function nombreNivel(nivelApi) {
    if (nivelApi === 'Desconocido') {
        return t('nivel.Desconocido');
    }
    return (clasificacionAlternativa ? nivelesAlternativos[nivelApi] || nivelApi : nivelApi).trim();
}

// -----------------------------------------------------------------------------------------------------------------
// SISTEMA DE COMBATE: la probabilidad de ganar combina TIPO + NIVEL + ELEMENTO
//
//   probabilidad = 50% + (ventaja de tipo × 20%) + (diferencia de nivel × 15%) + (ventaja de elemento × 10%)
//
// Con esto, una doble ventaja (tipo + elemento = +30%) compensa justo 2 niveles de diferencia (2 × 15%).
// Los niveles 7 y 8 rompen esa escala: pesan mucho más (PODER_EN_COMBATE) y contra ellos casi no sirve el tipo ni el elemento.
// -----------------------------------------------------------------------------------------------------------------

// Cuánto pesa cada factor
const PESO_TIPO = 0.20;
const PESO_NIVEL = 0.15;
const PESO_ELEMENTO = 0.10;

// Fuerza de cada nivel, usando el nombre original de la API (así no importa qué sistema de clasificación se muestre).
// Son 8 niveles, del 1 al 8, sin saltos. (Los "Armor" y los "Hybrid" que trae la API no son niveles de acá: cada uno de esos
// digimons queda en uno de estos 8 y la carta lleva una marca; ver MARCAS_DE_NIVEL más abajo.)
const numeracionNiveles = {
    'Baby I': 1,
    'Baby II': 2,
    'Child': 3,
    'Adult': 4,
    'Perfect': 5,
    'Ultimate': 6,
    'Super Ultimate': 7,
    'Absolute': 8,
};

// Poder en combate: del 1 al 6 es el mismo número que se ve en la carta, pero los niveles 7 y 8 rompen la escala.
// Del 6 al 7 y del 7 al 8 hay 3 niveles de distancia (6 → 9 → 12): un Mega apenas le puede hacer cosquillas a un Ultra
// (lo mismo que un Ultra a un Apex), y entre un Mega y un Apex la diferencia es tan grande que no tiene forma de ganar.
const PODER_EN_COMBATE = { 7: 9, 8: 12 };
const poderEnCombate = nivel => PODER_EN_COMBATE[nivel] ?? nivel;

// Si uno de los dos es nivel 7 u 8 y el otro está muy por debajo, el tipo y el elemento valen cada vez menos:
// hasta 1,5 niveles de diferencia valen todo; más allá valen 1,5 ÷ diferencia (con 3 niveles de diferencia, la mitad).
const ALCANCE_VENTAJAS = 1.5;

// Digimons que la API lista con dos niveles (el Perfect y el Ultimate): el simulador toma siempre el primero, que acá es el más
// bajo, y por su lore les corresponde el más alto. Se corrigen a mano. La clave es el ID de la API.
const NIVELES_CORREGIDOS = {
    1064: 'Ultimate', // Omega Shoutmon: recibió el poder de Omegamon y está al nivel de las formas Mega de Shoutmon (X7, DX, EX6)
    1278: 'Ultimate', // Omega Shoutmon (X-Antibody)
};

// Niveles inventados para este simulador. La API pone a todos estos digimons como "Ultimate" (el Mega), pero por su lore
// están por encima: acá se los sube de nivel. La clave es el ID de la API; el nombre va en el comentario.
// El 7 son Reyes Reales, Soberanos, Lores Demonio y otros seres excepcionales; el 8 es lo más alto de todo.
// (Los X-Antibody y algunos más solo aparecen cuando se carga la API completa.)
const ASCENSOS = {
    // Nivel 7 (Super Ultimate) · Reyes Reales
    183: 'Super Ultimate',  // Omegamon
    636: 'Super Ultimate',  // Alphamon
    637: 'Super Ultimate',  // Alphamon (Ouryuken)
    434: 'Super Ultimate',  // Dukemon
    435: 'Super Ultimate',  // Dukemon (Crimson Mode)
    658: 'Super Ultimate',  // Dukemon (X-Antibody)
    430: 'Super Ultimate',  // Chaos Dukemon (forma oscura de Dukemon)
    543: 'Super Ultimate',  // Gallantmon Chaos Mode (el mismo Chaos Dukemon, con su nombre en inglés)
    545: 'Super Ultimate',  // Dynasmon
    659: 'Super Ultimate',  // Dynasmon (X-Antibody)
    760: 'Super Ultimate',  // Craniummon
    1228: 'Super Ultimate', // Craniummon (X-Antibody)
    776: 'Super Ultimate',  // Sleipmon
    1237: 'Super Ultimate', // Sleipmon (X-Antibody)
    916: 'Super Ultimate',  // Sleipmon (Burst Mode)
    315: 'Super Ultimate',  // Magnamon
    588: 'Super Ultimate',  // Ulforce V-dramon
    700: 'Super Ultimate',  // Ulforce V-dramon (X-Antibody)
    699: 'Super Ultimate',  // Ulforce V-dramon Future Mode
    554: 'Super Ultimate',  // Lord Knightmon
    1233: 'Super Ultimate', // Lord Knightmon (X-Antibody)
    895: 'Super Ultimate',  // Examon
    1262: 'Super Ultimate', // Examon (X-Antibody)
    1135: 'Super Ultimate', // Gankoomon
    1263: 'Super Ultimate', // Gankoomon (X-Antibody)
    892: 'Super Ultimate',  // Duftmon
    893: 'Super Ultimate',  // Duftmon (X-Antibody)
    894: 'Super Ultimate',  // Duftmon (Leopard Mode)
    1187: 'Super Ultimate', // JESmon
    1250: 'Super Ultimate', // JESmon (X-Antibody)
    1295: 'Super Ultimate', // JESmon GX
    961: 'Super Ultimate',  // Omegamon Zwart
    686: 'Super Ultimate',  // Omegamon (X-Antibody)
    1196: 'Super Ultimate', // Omegamon Alter-B
    1197: 'Super Ultimate', // Omegamon Zwart Defeat
    1209: 'Super Ultimate', // Omegamon Alter-S
    1235: 'Super Ultimate', // Omegamon (Merciful Mode)
    // Nivel 7 · Los 5 Soberanos
    272: 'Super Ultimate',  // Baihumon
    361: 'Super Ultimate',  // Zhuqiaomon
    357: 'Super Ultimate',  // Xuanwumon
    374: 'Super Ultimate',  // Qinglongmon
    620: 'Super Ultimate',  // Huanglongmon
    1428: 'Super Ultimate', // Huanglongmon (Ruin Mode)
    // Nivel 7 · Los 7 Lores Demonio
    667: 'Super Ultimate',  // Leviamon
    1264: 'Super Ultimate', // Leviamon (X-Antibody)
    640: 'Super Ultimate',  // Barbamon
    1254: 'Super Ultimate', // Barbamon (X-Antibody)
    739: 'Super Ultimate',  // Belphemon (Rage Mode)
    1255: 'Super Ultimate', // Belphemon (X-Antibody)
    422: 'Super Ultimate',  // Beelzebumon (Blast Mode)
    753: 'Super Ultimate',  // Beelzebumon (X-Antibody)
    154: 'Super Ultimate',  // Demon
    1261: 'Super Ultimate', // Demon (X-Antibody)
    648: 'Super Ultimate',  // Demon Super Ultimate
    639: 'Super Ultimate',  // Arkadimon Super Ultimate (su forma final se llama así: es el nivel que está por encima del Mega)
    552: 'Super Ultimate',  // Lilithmon
    1265: 'Super Ultimate', // Lilithmon (X-Antibody)
    556: 'Super Ultimate',  // Lucemon (Falldown Mode): el más fuerte de los 7 Lores Demonio
    1267: 'Super Ultimate', // Lucemon (X-Antibody)
    // Nivel 7 · Excepcionales
    576: 'Super Ultimate',  // Susanoomon
    132: 'Super Ultimate',  // Apocalymon
    384: 'Super Ultimate',  // Seraphimon
    445: 'Super Ultimate',  // Ofanimon
    1275: 'Super Ultimate', // Ofanimon (X-Antibody)
    1061: 'Super Ultimate', // Ofanimon (Falldown Mode)
    1276: 'Super Ultimate', // Ofanimon (Falldown Mode, X-Antibody)
    287: 'Super Ultimate',  // Cherubimon (Vice): el tercero de los Tres Arcángeles, igual que Seraphimon y Ofanimon
    288: 'Super Ultimate',  // Cherubimon (Virtue)
    1256: 'Super Ultimate', // Cherubimon (Vice) (X-Antibody)
    1257: 'Super Ultimate', // Cherubimon (Virtue) (X-Antibody)
    904: 'Super Ultimate',  // Ogudomon (la versión X-Antibody queda en el nivel 8)
    // Nivel 8 (Absolute)
    457: 'Absolute',        // Zeed Millenniumon
    1277: 'Absolute',       // Ogudomon (X-Antibody)
    557: 'Absolute',        // Lucemon (Satan Mode)
};

// ARMOR e HYBRID: la API los trae como niveles propios, pero son solo 34 digimons (4 Armor y 30 Hybrid) y ensuciaban el filtro y
// la info de niveles. Acá no son un nivel: cada uno se queda en uno de los 8 normales y la carta lleva un circulito (A o H) en la
// esquina, como el de la X-Antibody, que al pasar el mouse dice "Armor" o "Hybrid".
//   · Armor (Digimon Adventure 02): los 4 tienen el poder de un Adult.
//   · Hybrid (Digimon Frontier): según la forma van de Adult a Ultimate. Las formas humanas son Adult, las bestia son Perfect y
//     las fusiones (y las formas supremas) son Ultimate. Se asignaron a mano, uno por uno, mirando Wikimon y la Digimon Wiki.
//     La clave es el nombre de la API sin tildes, mayúsculas ni símbolos (claveDeNombre, de nombres.js: 'Löwemon' → 'lowemon', 'Jet Silphymon' → 'jetsilphymon').
const NIVEL_DE_LOS_HYBRID = {
    // Formas humanas (los Human Spirits) → Adult
    agunimon: 'Adult',        // fuego
    kazemon: 'Adult',         // viento
    lobomon: 'Adult',         // luz
    lanamon: 'Adult',         // agua (Ranamon)
    arbormon: 'Adult',        // madera
    blitzmon: 'Adult',        // trueno
    chackmon: 'Adult',        // hielo
    mercuremon: 'Adult',      // acero
    grumblemon: 'Adult',      // tierra
    duskmon: 'Adult',         // oscuridad (el poder de Duskmon es de fusión, pero todos lo ponen en la clase Adult)
    lowemon: 'Adult',         // oscuridad (Löwemon): el techo de la clase Adult
    // Formas bestia (los Beast Spirits) → Perfect
    burninggreymon: 'Perfect', // fuego (Vritramon)
    shutumon: 'Perfect',       // viento
    kendogarurumon: 'Perfect', // luz (Garummon)
    calamaramon: 'Perfect',    // agua
    petaldramon: 'Perfect',    // madera
    bolgmon: 'Perfect',        // trueno
    blizzarmon: 'Perfect',     // hielo
    sephirothmon: 'Perfect',   // acero
    gigasmon: 'Perfect',       // tierra
    velgrmon: 'Perfect',       // oscuridad (la bestia corrupta de Duskmon)
    kaiserleomon: 'Perfect',   // oscuridad (la bestia purificada de Löwemon)
    // Fusiones y formas supremas → Ultimate
    aldamon: 'Ultimate',          // fusión de fuego
    beowolfmon: 'Ultimate',       // fusión de luz
    daipenmon: 'Ultimate',        // fusión de hielo
    raihimon: 'Ultimate',         // fusión de oscuridad (Löwemon + Kaiser Leomon)
    rhinokabuterimon: 'Ultimate', // fusión de trueno
    jetsilphymon: 'Ultimate',     // fusión de viento
    magnagarurumon: 'Ultimate',   // forma suprema de luz
    emperorgreymon: 'Ultimate',   // forma suprema de fuego
};
const NIVEL_HYBRID_SIN_DATO = 'Perfect'; // para un Hybrid que no esté en la lista (si la API algún día suma uno): el punto medio

// Las marcas de la carta: qué letra lleva el círculo y cómo se llama (es lo que dice al pasar el mouse)
const MARCAS_DE_NIVEL = {
    'Armor': { letra: 'A', nombre: 'Armor' },
    'Hybrid': { letra: 'H', nombre: 'Hybrid' },
};

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

// Cartas que no están en la API: las agrega el simulador (después de las de la API). Su ID es alto para no chocar con los de ella.
const CARTAS_PROPIAS = [
    {
        id: 9001,
        etiquetaId: '★',
        nombre: 'Yggdrasil',
        imagen: './img/yggdrasil.webp',
        tipo: 'Datos',
        elemento: 'Planta',
        nivelOriginal: 'Absolute',
        datosDorso: {
            especie: 'Host Computer',
            campos: '–',
            estreno: '–',
            habilidades: [],
            descripcion: 'The host computer that rules over the Digital World, treated in many adaptations as the God of the Digital World. This card was added by the simulator: it is not part of the API.',
            evo: { previas: [], siguientes: [] },
        },
    },
    {
        id: 9002,
        etiquetaId: '★',
        nombre: 'Homeostasis (Kami)',
        imagen: './img/homeostasis.webp',
        tipo: 'Vacuna',
        elemento: 'Luz',
        nivelOriginal: 'Absolute',
        datosDorso: {
            especie: 'Security System',
            campos: '–',
            estreno: '–',
            habilidades: [],
            descripcion: 'The security system of the Digital World, which keeps the balance between good and evil. In some stories it takes the place of Yggdrasil as the God of the Digital World. This card was added by the simulator: it is not part of the API.',
            evo: { previas: [], siguientes: [] },
        },
    },
];

// Orden en que se muestran los niveles en los menús y en los filtros (el último, 'Desconocido', es el que no tiene nivel)
const ORDEN_NIVELES = ['Baby I', 'Baby II', 'Child', 'Adult', 'Perfect', 'Ultimate', 'Super Ultimate', 'Absolute', 'Desconocido'];

// Triángulo de tipos: cada tipo es fuerte contra el que tiene en su lista
const TIPO_FUERTE_CONTRA = {
    'Vacuna': ['Virus'],
    'Virus': ['Datos'],
    'Datos': ['Vacuna'],
};

// Elementos: cada elemento es fuerte contra los que tiene en su lista.
// Si dos elementos se tienen ventaja mutuamente (Luz y Oscuridad), se cancelan.
// Tipo Libre, Variable, Desconocido y elemento Neutro no dan ni quitan nada.
const ELEMENTO_FUERTE_CONTRA = {
    'Agua': ['Fuego', 'Tierra'],
    'Fuego': ['Planta', 'Hielo', 'Oscuridad'],
    'Hielo': ['Planta', 'Viento', 'Agua'],
    'Luz': ['Oscuridad', 'Veneno'],
    'Metal': ['Hielo', 'Luz'],
    'Oscuridad': ['Luz', 'Metal'],
    'Planta': ['Agua', 'Tierra'],
    'Rayo': ['Agua'],
    'Tierra': ['Rayo', 'Fuego', 'Veneno'],
    'Veneno': ['Agua'],
    'Viento': ['Tierra'],
};

// La API no trae el elemento, así que lo deducimos buscando palabras clave en las habilidades del Digimon.
// El elemento con más coincidencias gana; si hay empate o ninguna coincidencia, es Neutro.
const REGLAS_ELEMENTO = {
    'Fuego': /\b(fire|flame|flames|flaming|blaze|blazing|burn|burning|inferno|heat|lava|magma|scorch|ember)\b/g,
    'Agua': /\b(water|aqua|bubble|bubbles|wave|ocean|torrent|tide|splash|hydro|rain|sea)\b/g,
    'Planta': /\b(plant|leaf|leaves|vine|vines|thorn|thorns|flower|petal|petals|seed|seeds|tree|forest|pollen|rose|spore|spores)\b/g,
    'Hielo': /\b(ice|icy|frost|freeze|freezing|frozen|snow|blizzard|cold|glacier)\b/g,
    'Rayo': /\b(thunder|lightning|electric|electricity|bolt|shock|spark|volt|plasma)\b/g,
    'Viento': /\b(wind|tornado|gale|cyclone|hurricane|storm|tempest|whirlwind|air|breeze)\b/g,
    'Tierra': /\b(earth|rock|rocks|stone|sand|quake|earthquake|ground|mud|boulder)\b/g,
    'Luz': /\b(light|holy|sacred|heaven|heavenly|divine|shining|radiant|sun|solar)\b/g,
    'Oscuridad': /\b(dark|darkness|shadow|shadows|evil|nightmare|death|hell|abyss|curse|cursed)\b/g,
    'Metal': /\b(metal|steel|iron|chrome|gatling|missile|cannon|laser)\b/g,
    'Veneno': /\b(poison|toxic|venom|acid)\b/g,
};

// Correcciones a mano (id del Digimon → elemento) para los casos en que la deducción automática no acierta
const ELEMENTOS_MANUALES = {
    4: 'Rayo', // Betamon: sus habilidades empatan entre Rayo y Agua, pero es eléctrico
    457: 'Oscuridad', // Zeed Millenniumon: la deducción le daba Hielo por la palabra "freeze" de una habilidad, pero por lore es oscuridad y destrucción
};

// Emoji de cada elemento para mostrar en la carta
const EMOJIS_ELEMENTO = {
    'Fuego': '🔥',
    'Agua': '💧',
    'Planta': '🌿',
    'Hielo': '❄️',
    'Rayo': '⚡',
    'Viento': '🌪️',
    'Tierra': '🪨',
    'Luz': '✨',
    'Oscuridad': '🌑',
    'Metal': '⚙️',
    'Veneno': '☠️',
    'Neutro': '⚪',
};

// Orden en que se muestran los elementos en los menús y en los filtros
const ORDEN_ELEMENTOS = Object.keys(EMOJIS_ELEMENTO);

// Deduce el elemento de un Digimon a partir de los detalles que devuelve la API
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

// Devuelve +1 si "a" tiene ventaja sobre "b", -1 si "b" tiene ventaja sobre "a", y 0 si están parejos
function calcularVentaja(tabla, a, b) {
    const aVenceAb = tabla[a]?.includes(b) ? 1 : 0;
    const bVenceAa = tabla[b]?.includes(a) ? 1 : 0;
    return aVenceAb - bVenceAa;
}

// -----------------------------------------------------------------------------------------------------------------
// Caché en IndexedDB para los detalles de los Digimons (así cargan al instante en visitas posteriores y no saturan la API)
// -----------------------------------------------------------------------------------------------------------------
const CACHE_DB_NOMBRE = 'digimon-cache-v1';
const CACHE_STORE_DETALLES = 'detalles';

function abrirCacheDB() {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !('indexedDB' in window)) return resolve(null);
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

let dbPromise = null;
function getCacheDB() {
    if (!dbPromise) dbPromise = abrirCacheDB();
    return dbPromise;
}

async function obtenerDetalleCache(url) {
    try {
        const db = await getCacheDB();
        if (!db) return null;
        return new Promise((resolve) => {
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
        const db = await getCacheDB();
        if (!db) return;
        const tx = db.transaction(CACHE_STORE_DETALLES, 'readwrite');
        const store = tx.objectStore(CACHE_STORE_DETALLES);
        store.put(datos, url);
    } catch {
        // Silencioso si falla la escritura en cache
    }
}

// Función para obtener los Digimons de una página con pageSize=100 y reintentos automáticos
async function obtenerPagina(numeroPagina, reintentos = 3) {
    for (let intento = 1; intento <= reintentos; intento++) {
        try {
            const respuesta = await fetch(`${urlBase}?pageSize=${DIGIMONS_POR_PAGINA}&page=${numeroPagina}`);
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

// Función para obtener los detalles de un Digimon específico con caché y reintentos
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
                console.warn('Aviso al obtener detalles del Digimon:', url, error.message);
                return null;
            }
            await new Promise(r => setTimeout(r, 500 * intento));
        }
    }
    return null;
}

// Función para obtener los Digimons de todas las páginas
async function crearArrayDeDatos() {
    try {
        // Generar array de promesas para todas las páginas (15 páginas en vez de 298)
        const promesasPaginas = [];
        for (let i = 0; i < totalPaginas; i++) {
            promesasPaginas.push(obtenerPagina(i));
        }

        // Esperar a que se resuelvan todas las promesas
        const paginas = await Promise.all(promesasPaginas);

        // Combinar todos los sub-arrays de cada página en un solo array
        const digimons = paginas.flat();

        return digimons; // Devolvemos el array aplanado de Digimons
    } catch (error) {
        console.warn('Aviso al obtener todos los Digimons:', error.message);
        return [];
    }
}

// Función para actualizar la barra de progreso
function actualizarBarraProgreso(contador) {
    barraProgreso.value = contador;
    barraProgreso.max = totalDigimons;
    const completa = totalDigimons > 0 && contador >= totalDigimons;
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
    if (retirandoCarga || !bloque || bloque.hidden || window.matchMedia('(max-width: 700px)').matches) return;
    retirandoCarga = true;
    setTimeout(() => {
        retirandoCarga = false;
        if (!barra.classList.contains('carga-completa') || window.matchMedia('(max-width: 700px)').matches) return;
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

// Selector de niveles: resalta el sistema vigente (Japón o EE.UU.) y escribe su ayuda (título y aria-label) en el idioma actual.
// El sistema vigente se recuperó de sessionStorage más arriba.
function mostrarSistemaDeNiveles() {
    const sistema = clasificacionAlternativa ? 'eeuu' : 'japon';
    botonCambiarNiveles.querySelectorAll('.sn-opcion').forEach(opcion => {
        opcion.classList.toggle('activo', opcion.dataset.sistema === sistema);
    });
    const ayuda = t(`niveles.ayuda.${sistema}`);
    botonCambiarNiveles.title = ayuda;
    botonCambiarNiveles.setAttribute('aria-label', ayuda);
}

document.addEventListener('DOMContentLoaded', () => {
    mostrarSistemaDeNiveles();
    // Llamar a la función para cargar los Digimons después de inicializar la configuración
    crearListaDeDigimons();
});

// Si se cambia el idioma, la ayuda del selector se vuelve a escribir en el idioma nuevo
document.addEventListener('idioma-cambiado', mostrarSistemaDeNiveles);

let contadorDigimons = 0; // Contador de Digimons cargados
const PEDIDOS_A_LA_VEZ = 6; // detalles que se piden a la API al mismo tiempo mientras carga la página

// Array para almacenar los elementos seleccionados
const seleccionados = [];

// Función para manejar el boton de combate
function verificarSeleccion() {
    if (seleccionados.length > 0) precargarPajita(); // el GIF y el sonido del primer cartel de combate se bajan mientras eligen
    contadorSeleccion.textContent = `${seleccionados.length}/2`;
    contadorSeleccion.classList.toggle('completo', seleccionados.length === 2);
    mostrarAyudaDelContador();
    botonIniciarCombate.disabled = seleccionados.length !== 2;
    // El color del botón (verde si se puede pelear, gris si no) y su latido cada 2 s (solo mientras se puede pelear) los pone el CSS según :disabled
    document.dispatchEvent(new CustomEvent('seleccion-cambio')); // el aviso de ayuda del inicio se va cuando ya eligió las 2
}

// El contador de elegidos también es un botón: sin ninguno elegido está apagado; con 1 o 2 se puede tocar para quitar la selección
function mostrarAyudaDelContador() {
    const hayElegidos = seleccionados.length > 0;
    const ayuda = t(hayElegidos ? 'combate.contador.limpiar' : 'combate.contador');
    contadorSeleccion.disabled = !hayElegidos;
    contadorSeleccion.title = ayuda;
    contadorSeleccion.setAttribute('aria-label', `${seleccionados.length}/2 · ${ayuda}`);
}

function quitarSeleccion() {
    if (seleccionados.length === 0) return;
    seleccionados.forEach(carta => carta.classList.remove('seleccionado'));
    seleccionados.length = 0;
    verificarSeleccion();
}

contadorSeleccion.addEventListener('click', () => {
    quitarSeleccion();
    quitarAvisoDelContador();
});
document.addEventListener('idioma-cambiado', mostrarAyudaDelContador);
mostrarAyudaDelContador();

// -----------------------------------------------------------------------------------------------------------------
// AVISO DEL CONTADOR: una sola vez por sesión del navegador, cuando termina el primer combate (o se lo cierra a medio camino), de
// la bolita "2/2" de la barra sale un minicartel con una flechita que cuenta que ahí se puede tocar para quitar la selección de las
// cartas, o tocar las cartas de a una para soltarlas. Se va solo a los pocos segundos y antes si la persona cambia la selección,
// empieza otro combate, amplía una carta o (en celular) la barra se esconde al bajar por la lista.
// Solo en las primeras 3 visitas (se usa el mismo contador de visitas de los avisos de ayuda, ver registrarVisitaDeAvisos): desde la
// cuarta vez que entra a la página ya no sale.
// -----------------------------------------------------------------------------------------------------------------
const AVISO_CONTADOR_SESION = 'digimon-aviso-contador'; // sessionStorage: recargar la página no lo vuelve a mostrar, abrirla de nuevo sí
const AVISO_CONTADOR_ESPERA = 300;     // ms después de que se cierra el último cartel del combate (además de lo que tarde en irse)
const AVISO_CONTADOR_DURACION = 9000;  // ms que queda a la vista
const AVISO_CONTADOR_VISITAS_MAXIMAS = 3; // desde la cuarta visita ya no sale
let avisoContadorVisto = false;
let avisoDelContador = null;
let temporizadorAvisoContador = 0;
let vigilanteDeLaBarra = null;

try {
    avisoContadorVisto = sessionStorage.getItem(AVISO_CONTADOR_SESION) === '1';
} catch (error) {
    // Sin sessionStorage solo se recuerda mientras la página siga abierta
}

function escribirAvisoDelContador() {
    if (!avisoDelContador) return;
    const conDedo = window.matchMedia('(hover: none)').matches;
    avisoDelContador.querySelector('.aviso-texto').textContent = t(conDedo ? 'aviso.contador.dedos' : 'aviso.contador.mouse');
}

// Debajo del contador, con la flechita justo debajo de él (el cartel se corre para no salirse de la pantalla)
function ubicarAvisoDelContador() {
    if (!avisoDelContador) return;
    const margen = 8;
    const boton = contadorSeleccion.getBoundingClientRect();
    const ancho = avisoDelContador.offsetWidth;
    const centro = boton.left + boton.width / 2;
    const izquierda = Math.max(margen, Math.min(centro - ancho / 2, window.innerWidth - ancho - margen));
    avisoDelContador.style.left = `${Math.round(izquierda)}px`;
    avisoDelContador.style.top = `${Math.round(boton.bottom + 12)}px`;
    avisoDelContador.style.setProperty('--punta', `${Math.round(centro - izquierda)}px`);
}

function quitarAvisoDelContador() {
    if (!avisoDelContador) return;
    const aviso = avisoDelContador;
    avisoDelContador = null;
    clearTimeout(temporizadorAvisoContador);
    vigilanteDeLaBarra?.disconnect();
    vigilanteDeLaBarra = null;
    aviso.classList.remove('visible'); // se vuelve a achicar hacia el contador
    setTimeout(() => aviso.remove(), 500);
}

function mostrarAvisoDelContador(reintentos = 15) {
    if (memoriaAvisos.visitas > AVISO_CONTADOR_VISITAS_MAXIMAS) return; // ya entró 4 veces o más: no hace falta
    if (avisoContadorVisto || avisoDelContador || seleccionados.length === 0) return;
    if (document.querySelector('.combate-contenedor')) { // el último cartel todavía se está desvaneciendo: se espera a que se vaya del todo
        if (reintentos > 0) setTimeout(() => mostrarAvisoDelContador(reintentos - 1), 150);
        return;
    }
    const barra = document.getElementById('navbar');
    if (barra.classList.contains('barra-escondida')) return; // el contador no se ve: queda para el próximo combate
    avisoContadorVisto = true;
    try {
        sessionStorage.setItem(AVISO_CONTADOR_SESION, '1');
    } catch (error) {
        // Sin sessionStorage solo se recuerda mientras la página siga abierta
    }

    avisoDelContador = document.createElement('div');
    avisoDelContador.id = 'aviso-contador';
    avisoDelContador.className = 'aviso-contador';
    avisoDelContador.setAttribute('role', 'status');
    avisoDelContador.innerHTML = '<span class="aviso-icono" aria-hidden="true">👆</span><span class="aviso-texto"></span>';
    escribirAvisoDelContador();
    avisoDelContador.addEventListener('click', quitarAvisoDelContador);
    document.body.appendChild(avisoDelContador);
    ubicarAvisoDelContador();
    void avisoDelContador.offsetWidth; // para que la entrada se anime
    avisoDelContador.classList.add('visible');
    temporizadorAvisoContador = setTimeout(quitarAvisoDelContador, AVISO_CONTADOR_DURACION);

    // En celular, si la barra se esconde el contador sale de la pantalla y el cartel quedaría colgando
    vigilanteDeLaBarra = new MutationObserver(() => {
        if (barra.classList.contains('barra-escondida')) quitarAvisoDelContador();
    });
    vigilanteDeLaBarra.observe(barra, { attributes: true, attributeFilter: ['class'] });
}

// Al seleccionar o deseleccionar cartas el cartel NO se cancela: queda los segundos para que se pueda leer,
// a menos que la persona toque directamente el botón contador (o empiece otro combate o amplíe una carta).
document.addEventListener('seleccion-cambio', ubicarAvisoDelContador);
botonIniciarCombate.addEventListener('click', quitarAvisoDelContador);
document.addEventListener('zoom-cambio', () => { if (cartaEnZoom) quitarAvisoDelContador(); });
document.addEventListener('idioma-cambiado', () => {
    escribirAvisoDelContador();
    ubicarAvisoDelContador();
});
window.addEventListener('resize', ubicarAvisoDelContador);
// La barra también cambia de alto sin que cambie la ventana (por ejemplo, cuando el bloque de carga desaparece)
if ('ResizeObserver' in window) new ResizeObserver(ubicarAvisoDelContador).observe(document.getElementById('navbar'));

// -----------------------------------------------------------------------------------------------------------------
// DISEÑO DE LAS CARTAS: nombre ajustado al largo, dorso con la descripción, giro 3D, inclinación con reflejo y sonidos
// -----------------------------------------------------------------------------------------------------------------

// Si la persona pidió menos animaciones en su sistema, no giramos ni inclinamos las cartas
const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// El "(X-Antibody)" no va en el nombre de la carta: se muestra aparte, como una gema con una X (.c-x).
// separarXAntibody('Omegamon (X-Antibody)') → { nombre: 'Omegamon', xAntibody: true }
function separarXAntibody(nombre) {
    const limpio = nombre.replace(/\s*\(\s*x-antibody\s*\)/i, '').trim();
    return { nombre: limpio, xAntibody: limpio !== nombre.trim() };
}

// Nombre completo de una carta, con su "(X-Antibody)" si lo tiene. Lo usan el combate, la evolución y el dorso,
// para que no se confunda con la versión normal del mismo digimon. Es el que se ve, o sea, el del idioma actual (ver nombres.js).
const conXAntibody = (carta, nombre) => carta.dataset.xAntibody ? `${nombre} (X-Antibody)` : nombre;

function nombreCompleto(carta) {
    return conXAntibody(carta, carta.querySelector('h4').textContent.trim());
}

// Los dos nombres de un digimon, también con su "(X-Antibody)": el original (el que trae la API) y el occidental.
// El buscador usa los dos, así se lo encuentra por cualquiera.
const nombreApiCompleto = carta => conXAntibody(carta, carta.dataset.nombreApi);
const nombreOccidentalCompleto = carta => conXAntibody(carta, nombreOccidental(carta.dataset.nombreApi));

// El otro nombre del digimon, el que NO se ve en la carta, si tiene uno distinto. Se cuenta en el dorso. En español y en inglés la carta muestra
// el occidental, así que el otro es el original japonés (el de la API); con el japonés sería al revés. Si los dos nombres son iguales (casi
// todos los digimon), devuelve null. Tampoco cuenta como otro nombre el que solo se diferencia en los espacios, los guiones, las mayúsculas o las
// tildes ('MetalSeadramon' y 'Metal Seadramon'): contarlo en el dorso sería repetir lo mismo.
// nombreAlternativo(carta de Omnimon) → { etiqueta: 'carta.nombreOriginal', nombre: 'Omegamon' }
function nombreAlternativo(carta) {
    const original = nombreApiCompleto(carta);
    const occidental = nombreOccidentalCompleto(carta);
    if (claveDeNombre(original) === claveDeNombre(occidental)) return null; // (claveDeNombre: ver nombres.js)
    const visible = conXAntibody(carta, nombreParaMostrar(carta.dataset.nombreApi));
    return visible === original
        ? { etiqueta: 'carta.nombreOccidental', nombre: occidental }
        : { etiqueta: 'carta.nombreOriginal', nombre: original };
}

// Nombre en la carta: lo que va entre paréntesis pasa a una segunda línea, más chica.
// El texto completo del <h4> no cambia (el combate lo lee con textContent).
function ponerNombre(elemento, nombre) {
    const posicion = nombre.indexOf('(');
    if (posicion <= 0) {
        elemento.textContent = nombre;
        return;
    }
    const aparte = document.createElement('span');
    aparte.className = 'c-aparte';
    aparte.textContent = nombre.slice(posicion);
    elemento.append(nombre.slice(0, posicion), aparte);
}

// Escribe el nombre de la carta (en el idioma actual) en el frente, en el dorso si ya se armó y en el texto de su imagen
function escribirNombre(carta) {
    const titulo = carta.querySelector('h4');
    titulo.textContent = '';
    ponerNombre(titulo, nombreParaMostrar(carta.dataset.nombreApi));
    carta.querySelector('.c-arte img').alt = nombreCompleto(carta);

    const nombreDorso = carta.querySelector('.c-dorso .c-nombre');
    if (nombreDorso) {
        nombreDorso.textContent = '';
        ponerNombre(nombreDorso, nombreCompleto(carta));
    }
}

// Tamaño del nombre según su largo: los cortos se agrandan hasta llenar la placa y los largos quedan chicos
// (en dos líneas si no entran). Se mide con un canvas, usando la misma tipografía que el CSS.
const MAX_CRECIMIENTO = 1.5;        // un nombre corto puede crecer hasta 1,5 veces el tamaño base
const MAX_CRECIMIENTO_PAREN = 1.25; // si tiene paréntesis, la línea de arriba crece menos para que entren las dos líneas
const MIN_TAMANO_PAREN = 7.5;       // tamaño mínimo (en px) de la línea del paréntesis

let medidasNombre = null; // se calculan una sola vez, con la primera carta

function medirPlaca(carta) {
    const raiz = getComputedStyle(document.documentElement);
    const cabecera = carta.querySelector('.c-cab');
    const estilo = getComputedStyle(cabecera);
    const base = parseFloat(raiz.getPropertyValue('--t-nombre'));
    const contexto = document.createElement('canvas').getContext('2d');
    contexto.font = `${raiz.getPropertyValue('--p-titulo').trim()} ${base}px ${raiz.getPropertyValue('--f-titulo').trim()}, sans-serif`;
    const altoUtil = cabecera.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
    return {
        base,
        contexto,
        espaciado: parseFloat(raiz.getPropertyValue('--ls-titulo')) || 0,
        ancho: cabecera.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight),
        limiteSuma: altoUtil / 1.15, // suma máxima de los tamaños de las dos líneas
    };
}

// La carta tiene que estar ya agregada a la página para poder medir su placa
function ajustarNombre(carta) {
    if (!medidasNombre) {
        medidasNombre = medirPlaca(carta);
    }
    const { base, contexto, espaciado, ancho, limiteSuma } = medidasNombre;
    const medir = texto => contexto.measureText(texto).width + espaciado * texto.length;

    const titulo = carta.querySelector('.c-cab h4');
    const aparte = titulo.querySelector('.c-aparte');

    if (!aparte) {
        // Si entra en una línea al tamaño base, lo agrandamos hasta llenar ~92% de la placa; si no, queda en dos líneas
        const anchoNombre = medir(titulo.textContent.trim());
        const k = anchoNombre < ancho ? Math.max(1, Math.min(MAX_CRECIMIENTO, ancho * 0.92 / anchoNombre)) : 1;
        carta.style.setProperty('--k', k.toFixed(3));
        return;
    }

    // Con paréntesis: arriba el nombre y abajo el paréntesis, más chico (los dos tienen que entrar en la placa)
    const principal = titulo.firstChild.textContent.trim();
    let tamanoPrincipal = base * Math.max(0.75, Math.min(MAX_CRECIMIENTO_PAREN, ancho * 0.94 / medir(principal)));
    const anchoPorPx = medir(aparte.textContent.trim()) / base;
    let tamanoAparte = Math.max(MIN_TAMANO_PAREN, Math.min(tamanoPrincipal * 0.8, ancho * 0.94 / anchoPorPx));
    if (tamanoPrincipal + tamanoAparte > limiteSuma) {
        tamanoAparte = Math.max(MIN_TAMANO_PAREN, limiteSuma - tamanoPrincipal);
        if (tamanoPrincipal + tamanoAparte > limiteSuma) {
            tamanoPrincipal = limiteSuma - tamanoAparte;
        }
    }
    carta.style.setProperty('--k', (tamanoPrincipal / base).toFixed(3));
    carta.style.setProperty('--sp', `${tamanoAparte.toFixed(1)}px`);
}

// Espera a que carguen las tipografías de las cartas (si tardan más de 3 segundos, sigue igual)
function esperarTipografias() {
    const cargas = ['800 12px "Orbitron"', '700 12px "Pixelify Sans"', '500 12px "Exo 2"', '12px "DotGothic16"']
        .map(fuente => document.fonts.load(fuente).catch(() => null));
    return Promise.race([Promise.all(cargas), new Promise(resolve => setTimeout(resolve, 3000))]);
}

// Dorso de la carta: se arma la primera vez que se gira, con los datos que ya trajimos de la API
function construirDorso(carta) {
    const datos = carta.datosDorso;
    const dorso = document.createElement('div');
    dorso.className = 'c-dorso';
    dorso.innerHTML = '<div class="c-cab"><div class="c-nombre"></div></div><div class="c-cuerpo"></div>';
    ponerNombre(dorso.querySelector('.c-nombre'), nombreCompleto(carta));

    const cuerpo = dorso.querySelector('.c-cuerpo');
    for (const [etiqueta, valor] of [['carta.especie', datos.especie], ['carta.campos', datos.campos ?? '–'], ['carta.estreno', datos.estreno]]) {
        const linea = document.createElement('p');
        linea.className = 'dato';
        const negrita = document.createElement('b');
        negrita.textContent = `${t(etiqueta)}:`;
        linea.append(negrita, ` ${valor}`);
        cuerpo.append(linea);
    }

    // Si el digimon tiene otro nombre (el original japonés, que la carta no muestra), se cuenta justo antes de la descripción
    const alternativo = nombreAlternativo(carta);
    if (alternativo) {
        const linea = document.createElement('p');
        linea.className = 'dato c-alias';
        const negrita = document.createElement('b');
        negrita.textContent = `${t(alternativo.etiqueta)}:`;
        linea.append(negrita, ` ${alternativo.nombre}`);
        cuerpo.append(linea);
    }

    const descripcion = document.createElement('p');
    descripcion.className = 'c-desc';
    descripcion.textContent = datos.descripcion || t('carta.sinDescripcion');
    cuerpo.append(descripcion);

    // La descripción de la API siempre viene en inglés: para quien lee en español se avisa; en inglés no hace falta
    const aviso = t('carta.idiomaOriginal');
    if (aviso) {
        const nota = document.createElement('p');
        nota.className = 'c-idioma';
        nota.textContent = aviso;
        cuerpo.append(nota);
    }

    // Botones del pie: "⚔️ Ataques" (info.js; solo si tiene ataques), con todos sus ataques y qué hace cada uno, y
    // "🧬 Evolución" (evolucion.js), con el árbol de de quién viene y a qué evoluciona
    const botones = document.createElement('div');
    botones.className = 'c-botones';
    if (datos.habilidades?.length) botones.append(crearBotonAtaques(carta));
    botones.append(crearBotonEvolucion(carta));
    dorso.append(botones);

    return dorso;
}

// Escribe en el idioma actual los textos de una carta: "NV", el nivel, el tipo, el elemento y el botón de dar vuelta.
// Si el dorso ya se había armado, se rehace para que también quede traducido.
function traducirCarta(carta) {
    const { tipo, elemento, nivelApi } = carta.dataset;

    const gema = carta.querySelector('.c-gema');
    const nivel = carta.querySelector('.c-nivel');
    const chipTipo = carta.querySelector('.c-tipo');
    const chipElem = carta.querySelector('.c-elem');

    const textoNivel = nombreNivel(nivelApi);
    const textoTipo = nombreTipo(tipo);
    const textoElem = nombreElemento(elemento);

    if (gema) {
        gema.querySelector('small').textContent = t('carta.nv');
        const ayudaNivel = t('carta.infoNivel', { nivel: textoNivel });
        gema.title = ayudaNivel;
        gema.setAttribute('aria-label', ayudaNivel);
    }
    if (nivel) {
        nivel.textContent = textoNivel;
        const ayudaNivel = t('carta.infoNivel', { nivel: textoNivel });
        nivel.title = ayudaNivel;
        nivel.setAttribute('aria-label', ayudaNivel);
    }
    if (chipTipo) {
        chipTipo.textContent = `${textoTipo} ${EMOJIS_TIPO[tipo]}`;
        const ayudaTipo = t('carta.infoTipo', { tipo: textoTipo });
        chipTipo.title = ayudaTipo;
        chipTipo.setAttribute('aria-label', ayudaTipo);
    }
    if (chipElem) {
        chipElem.textContent = `${textoElem} ${EMOJIS_ELEMENTO[elemento]}`;
        const ayudaElem = t('carta.infoElemento', { elemento: textoElem });
        chipElem.title = ayudaElem;
        chipElem.setAttribute('aria-label', ayudaElem);
    }

    const botonVoltear = carta.querySelector('.c-flip');
    if (botonVoltear) {
        botonVoltear.title = t('carta.voltear');
        botonVoltear.setAttribute('aria-label', t('carta.voltear'));
    }

    const dorsoViejo = carta.querySelector('.c-dorso');
    if (dorsoViejo) {
        const dorsoNuevo = construirDorso(carta);
        dorsoNuevo.style.height = dorsoViejo.style.height; // mide lo mismo que antes
        dorsoViejo.replaceWith(dorsoNuevo);
    }
}

// Al cambiar de idioma se traducen todas las cartas que ya están en la página
document.addEventListener('idioma-cambiado', () => {
    listaDigimons.querySelectorAll(':scope > li').forEach(traducirCarta);
});

// Da vuelta la carta entera en 3D: gira hasta 90° (de canto), cambia de cara y termina de girar
const PERSPECTIVA = 'perspective(800px) ';

// direccion: 1 gira hacia un lado y -1 hacia el otro (con el barrido del dedo, la carta gira hacia donde va el dedo)
async function voltearCarta(carta, direccion = 1) {
    if (carta.girando || (zoomOcupado && carta === cartaEnZoom)) return;
    document.dispatchEvent(new CustomEvent('click-chip-carta', { detail: { accion: 'voltear' } }));
    carta.girando = true;
    if (carta === cartaEnZoom && zoomExtra) await volverAlZoomNormal(carta); // el zoom extra es solo del frente

    const frente = carta.querySelector('.c-frente');
    let dorso = carta.querySelector('.c-dorso');
    const estabaDeFrente = !carta.classList.contains('de-dorso');

    if (estabaDeFrente) {
        if (!dorso) {
            dorso = construirDorso(carta);
            carta.appendChild(dorso);
        }
        dorso.style.height = `${frente.offsetHeight}px`; // el dorso mide lo mismo que el frente
    }

    sonidoVuelta();

    if (reducirMovimiento) {
        carta.classList.toggle('de-dorso');
        carta.girando = false;
        return;
    }

    const primeraMitad = carta.animate(
        [{ transform: `${PERSPECTIVA}rotateY(0deg)`, scale: 1 }, { transform: `${PERSPECTIVA}rotateY(${90 * direccion}deg)`, scale: 1.06 }],
        { duration: 230, easing: 'ease-in', fill: 'forwards' }
    );
    await primeraMitad.finished;

    carta.classList.toggle('de-dorso'); // de canto no se ve: cambiamos de cara
    const segundaMitad = carta.animate(
        [{ transform: `${PERSPECTIVA}rotateY(${-90 * direccion}deg)`, scale: 1.06 }, { transform: `${PERSPECTIVA}rotateY(0deg)`, scale: 1 }],
        { duration: 230, easing: 'ease-out' }
    );
    primeraMitad.cancel();
    await segundaMitad.finished;

    carta.girando = false;
    document.dispatchEvent(new CustomEvent('giro-terminado', { detail: carta })); // la inclinación retoma si el mouse sigue encima
}

// -----------------------------------------------------------------------------------------------------------------
// ZOOM: con doble clic la carta "vuela" al centro de la pantalla, bien grande, y el resto se oscurece.
//   La carta NO se mueve del <ul>: se traslada y se agranda con las propiedades "translate" y "scale" (así en su lugar
//   queda un hueco del tamaño de la carta, con el fondo a la vista) y sigue funcionando la inclinación ("transform") y
//   el dar vuelta. Se cierra con Esc, con un clic afuera o con la ✕.
// -----------------------------------------------------------------------------------------------------------------
let cartaEnZoom = null;          // la carta que está en el centro (o volviendo a su lugar)
let zoomOcupado = false;         // mientras vuela, no se inclina, no se da vuelta y no se cierra
let cierrePendiente = false;     // pidieron cerrar mientras todavía estaba llegando
let zoomCerrando = false;        // la carta ya está volviendo a su lugar: pedir cerrar otra vez no hace falta (ver cerrarZoom)
let seleccionAntesDelClic = { carta: null, estado: [] }; // cómo estaba la selección antes del primer clic de un doble clic

// Al pasar de una carta a otra dentro del zoom (con el teclado o con las flechas), la carta nueva suele quedar justo debajo del puntero, que
// no se movió. Sin esto el navegador le daba el "hover" (a veces tarde o de más) y aparecía el reflejo quieto en el medio. Ahora la carta nueva
// (clase "reflejo-quieto", ver el CSS) no se inclina ni brilla hasta que el mouse se mueve de verdad, aunque sea un píxel: un movimiento
// "falso" que el navegador manda sin mover el mouse (misma posición) no cuenta, ni el que ocurre mientras la carta todavía está llegando.
let zoomEsperaMovimiento = false;   // true mientras se espera ese movimiento (la inclinación lo mira: ver activarInclinacion)
let ultimoPuntero = null;           // dónde estuvo el mouse la última vez que mandó un evento

function pedirMovimientoDelPuntero(carta) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return; // solo con mouse: con el dedo no hay hover
    zoomEsperaMovimiento = true;
    carta.classList.add('reflejo-quieto');
}

function soltarReflejoQuieto() {
    zoomEsperaMovimiento = false;
    listaDigimons.querySelectorAll(':scope > li.reflejo-quieto').forEach(carta => carta.classList.remove('reflejo-quieto'));
}

function activarReflejoQuieto() {
    // (en la fase de captura, para ir antes que la inclinación, que mira el mismo movimiento)
    document.addEventListener('pointermove', (evento) => {
        if (evento.pointerType === 'touch') return;
        const seMovio = !ultimoPuntero || evento.clientX !== ultimoPuntero.x || evento.clientY !== ultimoPuntero.y;
        ultimoPuntero = { x: evento.clientX, y: evento.clientY };
        if (zoomEsperaMovimiento && seMovio && !zoomOcupado) soltarReflejoQuieto();
    }, true);
    document.addEventListener('touchstart', () => { if (zoomEsperaMovimiento) soltarReflejoQuieto(); }, { capture: true, passive: true }); // (pantalla táctil con mouse: el dedo manda)
}

const ZOOM_ANCHO = 0.9;          // la carta ocupa hasta el 90 % del ancho de la ventana (80 % en celular, para dejar lugar a las flechas)...
const ZOOM_ALTO = 0.86;          // ...y el 86 % del alto
const ZOOM_ANCHO_CELULAR = 0.8;
const ZOOM_MAXIMO = 4.5;
const ZOOM_MINIMO = 1.25;
const TECLAS_DE_DESPLAZAMIENTO = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];

// Dónde está la carta en la grilla (sin el levante del hover ni la inclinación) y cuánto hay que moverla y agrandarla
function calcularZoom(carta) {
    carta.classList.add('zoom-midiendo');
    const caja = carta.getBoundingClientRect();
    const zoomCss = parseFloat(getComputedStyle(carta).zoom) || 1; // en celular las cartas se achican con "zoom"
    carta.classList.remove('zoom-midiendo');

    const ancho = document.documentElement.clientWidth;
    const alto = window.innerHeight;
    const anchoUtil = ancho * (ancho < 600 ? ZOOM_ANCHO_CELULAR : ZOOM_ANCHO);
    const escala = Math.max(ZOOM_MINIMO, Math.min(ZOOM_MAXIMO, anchoUtil / caja.width, alto * ZOOM_ALTO / caja.height));
    return {
        escala,
        anchoFinal: caja.width * escala, // lo que va a medir la carta de ancho en pantalla
        dx: (ancho / 2 - (caja.left + caja.width / 2)) / zoomCss,
        dy: (alto / 2 - (caja.top + caja.height / 2)) / zoomCss,
        // Para el zoom extra (ver más abajo): lo que mide la carta en su lugar (a escala 1), el "zoom" de CSS del celular y cuánto está
        // agrandada de más: "factor" es lo que tiene ahora, "objetivo" lo que se le pidió, y x e y cuánto se corrió del centro (px de pantalla;
        // "ix" e "iy" son lo que se correría si la carta pudiera quedar con huecos: ver ponerZoomExtra)
        anchoBase: caja.width,
        altoBase: caja.height,
        zoomCss,
        extra: { factor: 1, objetivo: 1, x: 0, y: 0, ix: 0, iy: 0 },
    };
}

// El color de la carta ya resuelto (--base usa variables que solo existen adentro de la carta)
function colorDeCarta(carta) {
    const muestra = document.createElement('i');
    muestra.style.cssText = 'position:absolute;visibility:hidden;color:var(--base)';
    carta.appendChild(muestra);
    const color = getComputedStyle(muestra).color;
    muestra.remove();
    return color;
}

function crearFondoZoom(carta) {
    const fondo = document.createElement('div');
    fondo.id = 'zoom-fondo';
    fondo.innerHTML = '<button type="button" class="zoom-cerrar">✕</button><p class="zoom-ayuda"></p>';
    const cerrar = fondo.querySelector('.zoom-cerrar');
    cerrar.title = t('zoom.cerrar');
    cerrar.setAttribute('aria-label', t('zoom.cerrar'));
    fondo.querySelector('.zoom-ayuda').textContent = t('zoom.ayuda');
    fondo.style.setProperty('--zc', colorDeCarta(carta));
    fondo.addEventListener('click', () => {
        if (performance.now() - ultimoDeslizamiento < 500) return; // soltar el dedo después de deslizar no cierra el zoom
        cerrarZoom();
    });
    activarCambioConDedo(fondo);
    document.body.appendChild(fondo);
    return fondo;
}

// La carta se queda en el centro: translate y scale "importantes" para que no los pisen el hover ni la animación de flotar
// Además la carta queda como capa propia (will-change) ya dibujada a tamaño grande: si el navegador la tuviera que crear
// recién al empezar la inclinación (y deshacer al terminarla), por un instante la mostraría a baja resolución (pixelada).
function fijarZoom(carta) {
    const { escala, dx, dy } = zoomVigente(carta.datosZoom);
    carta.style.setProperty('translate', `${dx}px ${dy}px`, 'important');
    carta.style.setProperty('scale', String(escala), 'important');
    // Con el zoom extra no va el will-change: dejaría la carta dibujada al tamaño de antes y, agrandada, se vería borrosa
    if (carta.datosZoom.extra.factor > 1) carta.style.removeProperty('will-change');
    else carta.style.willChange = 'transform';
}

// Dónde está y cuánto mide la carta ampliada ahora, con el zoom extra (si lo tiene) incluido
function zoomVigente({ escala, dx, dy, extra, zoomCss }) {
    return { escala: escala * extra.factor, dx: dx + extra.x / zoomCss, dy: dy + extra.y / zoomCss };
}

function soltarZoom(carta) {
    carta.style.removeProperty('translate');
    carta.style.removeProperty('scale');
    carta.style.removeProperty('will-change');
}

// El scroll de la página queda quieto mientras hay zoom (sin tocar el overflow del body, que haría saltar la grilla).
// Solo se puede desplazar la descripción del dorso, que tiene su propio scroll.
function zonaConScroll(destino, delta = 0, selector = '.c-cuerpo') {
    const zona = destino.closest?.(selector);
    if (!zona || zona.scrollHeight <= zona.clientHeight) return false;
    if (delta === 0) return true;
    return delta < 0 ? zona.scrollTop > 0 : zona.scrollTop + zona.clientHeight < zona.scrollHeight - 1;
}

const frenarRueda = (evento) => {
    // Si hay un cartel de SweetAlert abierto (ataques, evolución, etc.), permitimos su propio desplazamiento
    if (document.querySelector('.swal2-container')) return;
    // Sobre el frente de la carta ampliada, la rueda la agranda todavía más (ver "ZOOM EXTRA"). En el dorso no: ahí la rueda es para la descripción
    if (zoomExtraDisponible() && cartaEnZoom.contains(evento.target)) {
        evento.preventDefault();
        if (evento.deltaY) acercarConRueda(evento);
        return;
    }
    if (!zonaConScroll(evento.target, evento.deltaY)) evento.preventDefault();
};

const frenarToque = (evento) => {
    if (document.querySelector('.swal2-container')) return;
    if (!zonaConScroll(evento.target) && evento.cancelable) evento.preventDefault();
};

const alTeclearConZoom = (evento) => {
    // Si hay un cartel de SweetAlert abierto, SweetAlert maneja sus teclas (Escape para cerrar el cartel, etc.)
    if (document.querySelector('.swal2-container')) return;
    if (evento.key === 'Escape') {
        evento.preventDefault();
        cerrarZoom();
    } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') {
        evento.preventDefault();
        cambiarZoom(evento.key === 'ArrowRight' ? 1 : -1, evento.repeat);
    } else if (TECLAS_DE_DESPLAZAMIENTO.includes(evento.key) && !evento.target.closest?.('button')) {
        evento.preventDefault();
    }
};

const alRedimensionarConZoom = () => {
    if (!cartaEnZoom || zoomOcupado) return;
    limpiarZoomExtra(); // con otro tamaño de ventana, el zoom extra vuelve a lo normal
    soltarZoom(cartaEnZoom); // para medir dónde está la carta en la grilla (los estilos "importantes" de la carta no se pueden pisar)
    cartaEnZoom.datosZoom = calcularZoom(cartaEnZoom);
    fijarZoom(cartaEnZoom);
    actualizarFlechasZoom();
    document.dispatchEvent(new CustomEvent('zoom-cambio'));
};

function bloquearDesplazamiento(bloquear) {
    const accion = bloquear ? 'addEventListener' : 'removeEventListener';
    window[accion]('wheel', frenarRueda, { passive: false });
    window[accion]('touchmove', frenarToque, { passive: false });
    window[accion]('keydown', alTeclearConZoom, true);
    window[accion]('resize', alRedimensionarConZoom);
}

// ZOOM EXTRA: con una carta ampliada y DE FRENTE (el dorso no: ahí la rueda y el pellizco son para la descripción), la rueda del mouse
// hacia arriba, con el puntero sobre la carta, la agranda todavía más, y hacia abajo la devuelve al tamaño normal. Lo que está bajo el
// puntero se queda bajo el puntero (se acerca a donde se mira). En celular se hace separando los dedos (y juntándolos vuelve), y mover los
// dos dedos a la vez la desplaza. Mientras está agrandada de más la carta no se inclina: la inclinación se cancela (y vuelve sola cuando
// se la devuelve al tamaño normal). Las flechas de los costados se esconden, y si se da vuelta la carta, se pasa a otra o se cierra el
// zoom, vuelve a lo normal.
const ZOOM_EXTRA_MAXIMO = 3;       // veces el tamaño del zoom normal
const ZOOM_EXTRA_RUEDA = 0.0016;   // cuánto crece por cada unidad de la rueda (una muesca del mouse trae ~100: ×1,17)
const ZOOM_EXTRA_SUAVIZADO = 60;   // ms que tarda en alcanzar lo pedido con la rueda
let zoomExtra = false;             // true mientras la carta ampliada está más grande que el zoom normal
let zoomExtraCuadro = 0;           // pedido de animationFrame pendiente
let zoomExtraUltimoCuadro = 0;
let zoomExtraAncla = { x: 0, y: 0 }; // el punto de la pantalla que se queda quieto al agrandar (el puntero)
const zoomExtraTerminados = [];    // quienes esperan a que termine de volver a lo normal (ver volverAlZoomNormal)

// ¿Se puede agrandar de más la carta ampliada? Solo si ya llegó al centro, no se está dando vuelta y está de frente
const zoomExtraDisponible = () => !!cartaEnZoom?.datosZoom && !zoomOcupado && !zoomCerrando && !cartaEnZoom.girando
    && !cartaEnZoom.classList.contains('de-dorso');

// Pone el zoom extra de la carta en "factor". "anclaVieja" es el punto de la pantalla que estaba sobre cierto lugar de la carta, y "anclaNueva"
// adónde tiene que quedar ese mismo lugar (es el mismo punto con la rueda; con el pellizco los dedos se pueden mover mientras se separan).
// La carta nunca deja huecos de la pantalla hacia un lado: puede correrse solo hasta que el borde llega al de la pantalla (y si es más chica
// que la pantalla, queda centrada). Pero se sigue calculando adónde estaría sin ese tope ("ix", "iy"), así acercar mirando cerca de un borde
// (la rueda) deja ese borde a la vista aunque la carta todavía fuera más chica que la pantalla al empezar a acercar. Con el pellizco, en
// cambio, la carta sigue a los dedos tal cual: ahí lo de sin el tope se descarta ("directo").
function ponerZoomExtra(carta, factor, anclaVieja, anclaNueva = anclaVieja, directo = false) {
    const datos = carta.datosZoom;
    const extra = datos.extra;
    const nuevo = Math.max(1, Math.min(ZOOM_EXTRA_MAXIMO, factor));
    const razon = nuevo / extra.factor;
    const ancho = document.documentElement.clientWidth;
    const alto = window.innerHeight;
    const escala = datos.escala * nuevo;
    const sobraX = Math.max(0, (datos.anchoBase * escala - ancho) / 2); // cuánto sobra la carta de la pantalla en cada eje
    const sobraY = Math.max(0, (datos.altoBase * escala - alto) / 2);
    const viejaX = anclaVieja.x - ancho / 2;
    const viejaY = anclaVieja.y - alto / 2;
    const nuevaX = anclaNueva.x - ancho / 2;
    const nuevaY = anclaNueva.y - alto / 2;
    if (nuevo === 1) {
        extra.ix = extra.iy = extra.x = extra.y = 0;
    } else {
        extra.ix = nuevaX - (viejaX - extra.ix) * razon;
        extra.iy = nuevaY - (viejaY - extra.iy) * razon;
        extra.x = Math.max(-sobraX, Math.min(sobraX, extra.ix));
        extra.y = Math.max(-sobraY, Math.min(sobraY, extra.iy));
        if (directo) {
            extra.ix = extra.x;
            extra.iy = extra.y;
        }
    }
    extra.factor = nuevo;
    fijarZoom(carta);
    avisarZoomExtra();
}

// Cuando la carta pasa a estar (o deja de estar) agrandada de más: las flechas se esconden, y se avisa (la inclinación se cancela o se retoma)
function avisarZoomExtra() {
    const ahora = !!cartaEnZoom?.datosZoom && cartaEnZoom.datosZoom.extra.factor > 1;
    if (ahora === zoomExtra) return;
    zoomExtra = ahora;
    document.getElementById('zoom-flechas')?.classList.toggle('zoom-extra', zoomExtra);
    marcarCartaConZoomExtra(zoomExtra ? cartaEnZoom : null);
    document.dispatchEvent(new CustomEvent('zoom-extra'));
}

// La carta agrandada de más lleva la clase "zoom-extra-activo": con ella el CSS le apaga el reflejo y la textura holográfica (igual que
// la inclinación, que se cancela). Se le saca a cualquier otra carta que la tuviera.
function marcarCartaConZoomExtra(carta) {
    listaDigimons.querySelectorAll(':scope > li.zoom-extra-activo').forEach((otra) => {
        if (otra !== carta) otra.classList.remove('zoom-extra-activo');
    });
    carta?.classList.add('zoom-extra-activo');
}

function animarZoomExtra(ahora) {
    zoomExtraCuadro = 0;
    const carta = cartaEnZoom;
    if (!carta?.datosZoom || zoomOcupado) {
        limpiarZoomExtra();
        return;
    }
    const extra = carta.datosZoom.extra;
    const paso = Math.min(ahora - zoomExtraUltimoCuadro, 64);
    zoomExtraUltimoCuadro = ahora;
    let factor = extra.factor + (extra.objetivo - extra.factor) * (1 - Math.exp(-paso / ZOOM_EXTRA_SUAVIZADO));
    if (Math.abs(extra.objetivo - factor) < 0.003) factor = extra.objetivo;
    ponerZoomExtra(carta, factor, zoomExtraAncla);
    if (extra.factor !== extra.objetivo) {
        zoomExtraCuadro = requestAnimationFrame(animarZoomExtra);
    } else {
        zoomExtraTerminados.splice(0).forEach(resolver => resolver());
    }
}

// Le pide a la carta que vaya (suavemente) a ese zoom extra, achicándose o agrandándose alrededor de "ancla"
function pedirZoomExtra(carta, objetivo, ancla) {
    const extra = carta.datosZoom.extra;
    extra.objetivo = Math.max(1, Math.min(ZOOM_EXTRA_MAXIMO, objetivo));
    zoomExtraAncla = ancla;
    if (reducirMovimiento) {
        ponerZoomExtra(carta, extra.objetivo, ancla);
        zoomExtraTerminados.splice(0).forEach(resolver => resolver());
    } else if (!zoomExtraCuadro) {
        zoomExtraUltimoCuadro = performance.now();
        zoomExtraCuadro = requestAnimationFrame(animarZoomExtra);
    }
}

function acercarConRueda(evento) {
    const unidad = evento.deltaMode === 1 ? 33 : evento.deltaMode === 2 ? 800 : 1; // (algunos navegadores cuentan en líneas o en páginas)
    const delta = evento.deltaY * unidad * (evento.ctrlKey ? 6 : 1); // (con Ctrl llega el pellizco del trackpad, que manda valores chicos)
    const extra = cartaEnZoom.datosZoom.extra;
    pedirZoomExtra(cartaEnZoom, extra.objetivo * Math.exp(-delta * ZOOM_EXTRA_RUEDA), { x: evento.clientX, y: evento.clientY });
}

// Corre la carta agrandada de más "dx" y "dy" píxeles de pantalla (es lo que usa el arrastre con el mouse). Igual que con el pellizco,
// la carta sigue al puntero tal cual ("ix" e "iy" quedan donde está) y no deja huecos de pantalla: se corre solo hasta que su borde
// llega al de la pantalla (ver ponerZoomExtra).
function moverZoomExtra(carta, dx, dy) {
    const datos = carta.datosZoom;
    const extra = datos.extra;
    const escala = datos.escala * extra.factor;
    const sobraX = Math.max(0, (datos.anchoBase * escala - document.documentElement.clientWidth) / 2);
    const sobraY = Math.max(0, (datos.altoBase * escala - window.innerHeight) / 2);
    extra.x = extra.ix = Math.max(-sobraX, Math.min(sobraX, extra.x + dx));
    extra.y = extra.iy = Math.max(-sobraY, Math.min(sobraY, extra.y + dy));
    fijarZoom(carta);
}

// Con el mouse, la carta agrandada de más se puede AGARRAR: se aprieta el botón izquierdo sobre su frente y, sin soltar, se arrastra para
// verla de un lado a otro (solo con la rueda costaba mucho apuntar justo adonde se quería mirar). El cursor pasa a ser una mano (abierta
// sobre la carta y cerrada al agarrarla: ver "zoom-arrastrando" en el CSS). Los botones de la carta no la agarran, y soltar después de
// arrastrar no cierra el zoom aunque el mouse termine sobre el fondo. Con el dedo se corre con dos dedos (ver el pellizco).
const ARRASTRE_MINIMO = 3; // px que hay que mover el mouse antes de que cuente como arrastre (un clic quieto no corre nada)

function activarArrastreDeZoomExtra() {
    let arrastre = null; // { carta, id, x, y, movio }: el mouse que tiene agarrada la carta

    const terminar = () => {
        if (!arrastre) return;
        const { carta, id, movio } = arrastre;
        arrastre = null;
        carta.classList.remove('zoom-arrastrando');
        if (carta.hasPointerCapture?.(id)) carta.releasePointerCapture(id);
        if (movio) ultimoDeslizamiento = performance.now(); // soltar después de arrastrar no cierra el zoom (ver crearFondoZoom)
    };

    listaDigimons.addEventListener('pointerdown', (evento) => {
        if (evento.pointerType === 'touch' || evento.button !== 0) return;
        if (!zoomExtra || !zoomExtraDisponible() || !cartaEnZoom.contains(evento.target)) return;
        if (evento.target.closest('button, a, .c-evo, .c-ataques')) return;
        terminar();
        arrastre = { carta: cartaEnZoom, id: evento.pointerId, x: evento.clientX, y: evento.clientY, movio: false };
        cartaEnZoom.setPointerCapture(evento.pointerId); // así sigue agarrada aunque el mouse se pase de la carta (o de la ventana)
        cartaEnZoom.classList.add('zoom-arrastrando');
        evento.preventDefault(); // no selecciona texto ni arrastra la imagen
    });

    listaDigimons.addEventListener('pointermove', (evento) => {
        if (!arrastre || evento.pointerId !== arrastre.id) return;
        if (!zoomExtra || cartaEnZoom !== arrastre.carta || evento.buttons === 0) { // (sin botones: se soltó fuera de la ventana y no nos enteramos)
            terminar();
            return;
        }
        const dx = evento.clientX - arrastre.x;
        const dy = evento.clientY - arrastre.y;
        if (!arrastre.movio && Math.hypot(dx, dy) < ARRASTRE_MINIMO) return;
        arrastre.movio = true;
        arrastre.x = evento.clientX;
        arrastre.y = evento.clientY;
        moverZoomExtra(arrastre.carta, dx, dy);
    });

    for (const tipo of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listaDigimons.addEventListener(tipo, (evento) => {
            if (arrastre && evento.pointerId === arrastre.id) terminar();
        });
    }

    // Si la carta deja de estar agrandada de más, se da vuelta, se cambia o se cierra el zoom, ya no hay nada que agarrar
    document.addEventListener('zoom-extra', () => { if (!zoomExtra) terminar(); });
    document.addEventListener('zoom-cambio', terminar);

    // Que el navegador no arranque su propio arrastre de la imagen
    listaDigimons.addEventListener('dragstart', (evento) => {
        if (zoomExtra && cartaEnZoom?.contains(evento.target)) evento.preventDefault();
    });
}

// Devuelve la carta al tamaño normal y avisa cuando llegó (se usa antes de darla vuelta)
function volverAlZoomNormal(carta) {
    return new Promise((resolver) => {
        if (!carta.datosZoom || carta.datosZoom.extra.factor === 1) {
            resolver();
            return;
        }
        zoomExtraTerminados.push(resolver);
        pedirZoomExtra(carta, 1, { x: document.documentElement.clientWidth / 2, y: window.innerHeight / 2 });
    });
}

// Corta lo que esté en marcha y deja el zoom extra como "no hay" (la carta que estaba agrandada de más ya no lo está, o se va)
function limpiarZoomExtra() {
    cancelAnimationFrame(zoomExtraCuadro);
    zoomExtraCuadro = 0;
    zoomExtraTerminados.splice(0).forEach(resolver => resolver());
    if (cartaEnZoom?.datosZoom) cartaEnZoom.datosZoom.extra.objetivo = cartaEnZoom.datosZoom.extra.factor;
    if (zoomExtra) {
        zoomExtra = false;
        document.getElementById('zoom-flechas')?.classList.remove('zoom-extra');
        marcarCartaConZoomExtra(null);
        document.dispatchEvent(new CustomEvent('zoom-extra'));
    }
}

// Flechas a los costados de la carta ampliada para pasar a la anterior o a la siguiente sin salir del zoom
// (también con las flechas ← → del teclado). Las cartas que esconden los filtros no cuentan.
function cartaVecina(carta, direccion) {
    let vecina = direccion > 0 ? carta.nextElementSibling : carta.previousElementSibling;
    while (vecina && (vecina.tagName !== 'LI' || vecina.classList.contains('filtrada'))) {
        vecina = direccion > 0 ? vecina.nextElementSibling : vecina.previousElementSibling;
    }
    return vecina;
}

// En celulares también se pasa de carta deslizando el dedo hacia un costado, pero empezando AFUERA de la carta (sobre el fondo):
// hacia la izquierda va a la siguiente y hacia la derecha a la anterior. Si empieza sobre la carta, ese barrido la da vuelta;
// y un toque simple afuera sigue cerrando el zoom.
const DESLIZAR_DISTANCIA = 45; // px que tiene que recorrer el dedo hacia un costado
let ultimoDeslizamiento = 0;

function activarCambioConDedo(fondo) {
    let gesto = null; // { x0, y0, resuelto }: el dedo que está apoyado en el fondo

    fondo.addEventListener('touchstart', (evento) => {
        gesto = null;
        if (evento.touches.length !== 1 || evento.target.closest('button')) return;
        const toque = evento.touches[0];
        gesto = { x0: toque.clientX, y0: toque.clientY, resuelto: false };
    }, { passive: true });

    fondo.addEventListener('touchmove', (evento) => {
        if (!gesto || gesto.resuelto) return;
        if (evento.touches.length !== 1) {
            gesto = null;
            return;
        }
        const toque = evento.touches[0];
        const dx = toque.clientX - gesto.x0;
        const dy = toque.clientY - gesto.y0;
        if (Math.abs(dx) >= DESLIZAR_DISTANCIA && Math.abs(dx) > Math.abs(dy) * 1.5) {
            gesto.resuelto = true;
            ultimoDeslizamiento = performance.now();
            vibrar(8);
            cambiarZoom(dx < 0 ? 1 : -1);
        }
    }, { passive: true });

    const terminar = () => { gesto = null; };
    fondo.addEventListener('touchend', terminar);
    fondo.addEventListener('touchcancel', terminar);
}

const ICONO_FLECHA = (puntos) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${puntos}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function crearFlechasZoom() {
    const flechas = document.createElement('div');
    flechas.id = 'zoom-flechas';
    flechas.innerHTML = `<button type="button" class="zoom-flecha zoom-anterior">${ICONO_FLECHA('M15 5l-7 7 7 7')}</button>`
        + `<button type="button" class="zoom-flecha zoom-siguiente">${ICONO_FLECHA('M9 5l7 7-7 7')}</button>`;
    const anterior = flechas.querySelector('.zoom-anterior');
    const siguiente = flechas.querySelector('.zoom-siguiente');
    anterior.title = t('zoom.anterior');
    anterior.setAttribute('aria-label', t('zoom.anterior'));
    siguiente.title = t('zoom.siguiente');
    siguiente.setAttribute('aria-label', t('zoom.siguiente'));
    anterior.addEventListener('click', () => cambiarZoom(-1));
    siguiente.addEventListener('click', () => cambiarZoom(1));
    document.body.appendChild(flechas);
    actualizarFlechasZoom();
    void flechas.offsetWidth; // para que aparezcan con un fundido
    flechas.classList.add('abierto');
}

// Pone las flechas pegadas a los costados de la carta (en celular, en el margen que queda) y apaga la que no tiene a dónde ir
function actualizarFlechasZoom() {
    const flechas = document.getElementById('zoom-flechas');
    if (!flechas || !cartaEnZoom) return;
    const ancho = document.documentElement.clientWidth;
    const celular = ancho < 600;
    const lado = celular ? 34 : 48;
    const separacion = celular ? 3 : 10;
    const margen = celular ? 3 : 8;
    const distancia = Math.max(margen, ancho / 2 - cartaEnZoom.datosZoom.anchoFinal / 2 - separacion - lado);
    flechas.style.setProperty('--flecha', `${lado}px`);
    flechas.style.setProperty('--fl-izq', `${distancia}px`);
    flechas.style.setProperty('--fl-der', `${distancia}px`);
    flechas.querySelector('.zoom-anterior').disabled = !cartaVecina(cartaEnZoom, -1);
    flechas.querySelector('.zoom-siguiente').disabled = !cartaVecina(cartaEnZoom, 1);
}

// Pasa el zoom a la carta anterior (-1) o a la siguiente (1): la actual se va hacia un costado y la otra entra por el opuesto
// Si se pide otro cambio mientras todavía se está yendo la carta anterior, no hace falta esperar: se apura lo que queda de esa
// transición y se sigue enseguida (y la nueva dura menos). Así se pueden pasar muchas cartas seguidas rápido.
let cambioEnCurso = null; // la transición de carta que está en marcha: { acelerar(), listo }
let cambiosEsperando = 0; // pedidos que esperan a que termine la transición en marcha

// "repetida": el pedido viene de dejar apretada una tecla; esos no se acumulan (si no, seguiría pasando cartas después de soltarla)
async function cambiarZoom(direccion, repetida = false) {
    let apurado = false;
    while (zoomOcupado && cambioEnCurso) {
        if (cambiosEsperando >= (repetida ? 1 : 8)) return;
        apurado = true;
        cambiosEsperando++;
        cambioEnCurso.acelerar();
        await cambioEnCurso.listo;
        cambiosEsperando--;
    }
    const vieja = cartaEnZoom;
    if (!vieja || zoomOcupado) return;
    const nueva = cartaVecina(vieja, direccion);
    if (!nueva) return;
    zoomOcupado = true;
    let terminarCambio = null;
    document.dispatchEvent(new CustomEvent('zoom-cambio'));
    sonidoZoom(true);

    const zoomCss = parseFloat(getComputedStyle(vieja).zoom) || 1;
    const salto = direccion * document.documentElement.clientWidth * 0.55 / zoomCss;
    const antes = zoomVigente(vieja.datosZoom); // (con el zoom extra que tenga)
    // La que se va, si no mostraba el reflejo (porque la carta recién había aparecido y el mouse no se movió, o porque estaba agrandada de más),
    // se va igual sin mostrarlo: el puntero sigue encima de ella y, sin esa marca, el "hover" se lo prendería justo cuando se está yendo
    const seVaSinReflejo = vieja.classList.contains('reflejo-quieto') || vieja.classList.contains('zoom-extra-activo');
    limpiarZoomExtra(); // la nueva entra con el zoom normal
    nueva.datosZoom = calcularZoom(nueva);
    const despues = nueva.datosZoom;
    cartaEnZoom = nueva;
    nueva.classList.add('zoom-activa');
    if (seVaSinReflejo) vieja.classList.add('reflejo-quieto'); // (se la saca cuando termina de irse)
    pedirMovimientoDelPuntero(nueva); // aparece sin inclinación ni reflejo hasta que el mouse se mueva
    document.getElementById('zoom-fondo')?.style.setProperty('--zc', colorDeCarta(nueva));
    soltarZoom(vieja);

    if (reducirMovimiento) {
        vieja.classList.remove('zoom-activa', 'reflejo-quieto');
        vieja.datosZoom = null;
    } else {
        const sale = vieja.animate([
            { translate: `${antes.dx}px ${antes.dy}px`, scale: antes.escala, opacity: 1 },
            { translate: `${antes.dx - salto}px ${antes.dy}px`, scale: antes.escala * 0.92, opacity: 0 },
        ], { duration: apurado ? 110 : 170, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', fill: 'forwards' });
        const entra = nueva.animate([
            { translate: `${despues.dx + salto}px ${despues.dy}px`, scale: despues.escala * 0.92, opacity: 0 },
            { translate: `${despues.dx}px ${despues.dy}px`, scale: despues.escala, opacity: 1 },
        ], { duration: apurado ? 170 : 270, delay: apurado ? 20 : 50, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)', fill: 'both' });
        cambioEnCurso = {
            listo: new Promise((resolver) => { terminarCambio = resolver; }),
            acelerar: () => {
                sale.updatePlaybackRate(3.5);
                entra.updatePlaybackRate(3.5);
            },
        };
        try {
            await Promise.all([sale.finished, entra.finished]);
        } catch (error) {
            // Si alguien cancela una animación, seguimos igual
        }
        fijarZoom(nueva);
        entra.cancel();
        sale.cancel();
        vieja.classList.remove('zoom-activa', 'reflejo-quieto');
        vieja.datosZoom = null;
    }
    if (reducirMovimiento) fijarZoom(nueva);

    // Que la carta quede a la vista en la grilla para cuando se cierre el zoom (si no, se corre la página hasta ella)
    nueva.classList.add('zoom-midiendo');
    soltarZoom(nueva);
    const caja = nueva.getBoundingClientRect();
    nueva.classList.remove('zoom-midiendo');
    const barra = document.getElementById('navbar')?.getBoundingClientRect().bottom ?? 0;
    if (caja.top < barra || caja.bottom > window.innerHeight) {
        window.scrollBy({ top: caja.top + caja.height / 2 - (barra + window.innerHeight) / 2, behavior: 'instant' });
    }
    nueva.datosZoom = calcularZoom(nueva);
    fijarZoom(nueva);

    actualizarFlechasZoom();
    zoomOcupado = false;
    cambioEnCurso = null;
    terminarCambio?.();
    document.dispatchEvent(new CustomEvent('zoom-cambio'));
    if (cierrePendiente) cerrarZoom();
}

async function abrirZoom(carta) {
    if (cartaEnZoom || zoomOcupado) return;
    cartaEnZoom = carta;
    zoomOcupado = true;
    cierrePendiente = false; // un pedido de cierre viejo no tiene que cerrar este zoom nuevo apenas llegue
    document.activeElement?.blur?.();
    soltarReflejoQuieto();
    document.dispatchEvent(new CustomEvent('zoom-cambio')); // la inclinación suelta la carta

    const fondo = crearFondoZoom(carta);
    carta.classList.add('zoom-activa');
    carta.datosZoom = calcularZoom(carta);
    const { escala, dx, dy } = carta.datosZoom;
    bloquearDesplazamiento(true);
    sonidoZoom(true);

    void fondo.offsetWidth; // para que el fondo se desvanezca en vez de aparecer de golpe
    fondo.classList.add('abierto');

    if (reducirMovimiento) {
        fijarZoom(carta);
    } else {
        const destino = `${dx}px ${dy}px`;
        const vuelo = carta.animate([
            { offset: 0, translate: '0px 0px', scale: 1, rotate: '0deg', easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' },
            { offset: 0.35, rotate: '-4deg', easing: 'ease-in-out' },
            { offset: 0.72, translate: destino, scale: escala * 1.05, rotate: '1.5deg', easing: 'ease-in-out' },
            { offset: 1, translate: destino, scale: escala, rotate: '0deg' },
        ], { duration: 680, fill: 'forwards' });
        try {
            await vuelo.finished;
        } catch (error) {
            // Si alguien cancela el vuelo (por ejemplo al cerrar de golpe), seguimos igual
        }
        if (cartaEnZoom === carta) fijarZoom(carta);
        vuelo.cancel();
    }

    crearFlechasZoom();
    zoomOcupado = false;
    fondo.querySelector('.zoom-cerrar').focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('zoom-cambio')); // ahora la inclinación mide la carta ya grande
    if (cierrePendiente) cerrarZoom();
}

async function cerrarZoom({ rapido = false } = {}) {
    const carta = cartaEnZoom;
    if (!carta) return;
    // Si ya se está cerrando (un segundo clic afuera, o Esc de nuevo, mientras la carta vuelve) no hay nada más que hacer. Antes ese
    // segundo pedido quedaba anotado como "cierre pendiente" y, como nadie lo atendía, se cumplía en el PRÓXIMO zoom: la carta
    // llegaba al centro y se volvía a ir sola.
    if (zoomCerrando) return;
    if (zoomOcupado) {
        cierrePendiente = true;
        return;
    }
    cierrePendiente = false;
    zoomOcupado = true;
    zoomCerrando = true;
    document.dispatchEvent(new CustomEvent('zoom-cambio'));

    const { escala, dx, dy } = zoomVigente(carta.datosZoom); // vuelve desde donde está, con el zoom extra que tenga
    limpiarZoomExtra();
    const fondo = document.getElementById('zoom-fondo');
    fondo?.classList.remove('abierto');
    document.getElementById('zoom-flechas')?.classList.remove('abierto');
    soltarZoom(carta);

    let vuelta;
    if (!rapido && !reducirMovimiento) {
        sonidoZoom(false);
        vuelta = carta.animate([
            { translate: `${dx}px ${dy}px`, scale: escala, rotate: '0deg' },
            { translate: '0px 0px', scale: 1, rotate: '0deg' },
        ], { duration: 480, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'both' });
        try {
            await vuelta.finished;
        } catch (error) {
            // Si alguien cancela la vuelta, seguimos igual
        }
    }

    vuelta?.cancel();
    carta.classList.remove('zoom-activa');
    soltarReflejoQuieto(); // la carta vuelve a la grilla como cualquier otra
    carta.datosZoom = null;
    cartaEnZoom = null;
    fondo?.remove();
    document.getElementById('zoom-flechas')?.remove();
    bloquearDesplazamiento(false);
    zoomOcupado = false;
    zoomCerrando = false;
    cierrePendiente = false;
    document.dispatchEvent(new CustomEvent('zoom-cambio'));
}

window.cerrarZoom = cerrarZoom;
window.obtenerCartaEnZoom = () => cartaEnZoom;

// Vuelve la selección para el combate a como estaba antes del primer clic del doble clic
function restaurarSeleccion(estado) {
    seleccionados.forEach(carta => carta.classList.remove('seleccionado'));
    seleccionados.splice(0, seleccionados.length, ...estado);
    estado.forEach(carta => carta.classList.add('seleccionado'));
    verificarSeleccion();
}

function activarZoom() {
    listaDigimons.addEventListener('dblclick', (evento) => {
        if (evento.target.closest('button')) return;
        const carta = evento.target.closest('#listado-digimons > li');
        if (!carta || cartaEnZoom) return;
        // Los dos clics del doble clic eligieron y desearon la carta (y, con 2 elegidas, pudieron sacar a otra): se deshace
        if (seleccionAntesDelClic.carta === carta) restaurarSeleccion(seleccionAntesDelClic.estado);
        abrirZoom(carta);
    });

    // Un doble clic no selecciona el texto de la carta
    listaDigimons.addEventListener('mousedown', (evento) => {
        if (evento.detail > 1 && !cartaEnZoom && !evento.target.closest('button') && evento.target.closest('#listado-digimons > li')) {
            evento.preventDefault();
        }
    });

    // Las ventanas de evolución y de ataques se abren directamente sobre la carta en grande, sin salir del modo zoom.
    // Solo si el zoom todavía está en plena transición (llegando o yéndose) se ignora el toque.
    document.addEventListener('click', (evento) => {
        const boton = cartaEnZoom && evento.target.closest('.c-evo, .c-ataques');
        if (!boton) return;
        if (zoomOcupado) {
            evento.stopPropagation();
            evento.preventDefault();
        }
    }, true);

    activarZoomConPellizco();
    activarZoomConDobleToque();
}

// AVISOS DE AYUDA: cartelitos discretos (arriba a la derecha, debajo de la barra) que aparecen unos segundos después de abrir la
// página. Si entraran junto con el resto de la carga parecerían parte de la página y pasarían desapercibidos. No tapan nada (dejan
// pasar el mouse y los toques) y se van solos a los pocos segundos. Los tiempos se cuentan desde que aparece la primera carta:
//   - 2 s: (solo celular) qué hay que hacer, "Elige 2 digimons...". En computadora la consigna ya está a la vista en la barra;
//          en celular está dentro del menú ☰.
//   - 5 s: cómo ampliar una carta y, en pantallas táctiles, cómo inclinarla y darla vuelta. Con mouse habla del doble clic; en
//          pantallas táctiles son dos cartelitos separados: el doble toque o pellizco, y que si se mantiene apretada la carta y se mueve
//          el dedo, brilla y se inclina, y con un barrido rápido se da vuelta (dicho sin palabras técnicas).
//   - 2 s después de ampliar la primera carta: (solo pantallas táctiles) cómo cerrarla y cómo pasar a otra deslizando el dedo, en dos
//          cartelitos separados. Salen una sola vez por visita, y no si se cierra la carta antes de que entren.
// Si hay más de uno a la vez, se apilan (el primero arriba). Cada consejo es independiente: se va apenas la persona hace lo que
// cuenta (y ni aparece si ya lo hizo antes de que entre). Si ya hizo todo, el aviso no aparece. Mientras hay una carta ampliada
// los avisos pasan por encima del zoom, para que se lean.
// MEMORIA DE LOS AVISOS: se guarda en el navegador de cada persona (localStorage), como un JSON, así los avisos no se repiten
// cada vez que vuelve a entrar:
//   { "visitas": 3, "hecho": { "combate": true, "zoom": true, "inclinar": false, "gestos": true } }
//   - "hecho": lo que la persona ya hizo (eligió las 2 cartas, amplió una, inclinó una con el dedo) o ya vio ("gestos", que se
//     muestra una sola vez). Un aviso que ya no hace falta no vuelve a salir.
//   - "visitas": cuántas veces entró. Entrar una séptima vez todavía los muestra; desde la octava no sale ninguno (ya los conoce).
//     Cuenta una por sesión del navegador: recargar la página con la pestaña abierta no suma.
// Si el navegador no deja guardar (modo privado, datos bloqueados), todo sigue andando como si fuera la primera vez.
// Para empezar de cero (por ejemplo, para probarlos): localStorage.removeItem('digimon-avisos')
const AVISOS_ALMACEN = 'digimon-avisos';
const AVISOS_VISITAS_MAXIMAS = 7;
let memoriaAvisos = { visitas: 0, hecho: {} };

function guardarMemoriaAvisos() {
    try {
        localStorage.setItem(AVISOS_ALMACEN, JSON.stringify(memoriaAvisos));
    } catch (error) {
        // Sin almacenamiento no se recuerda nada, pero no pasa nada más
    }
}

// Lee lo guardado y suma la visita. Devuelve true si todavía hay que mostrar avisos
function registrarVisitaDeAvisos() {
    try {
        const guardado = JSON.parse(localStorage.getItem(AVISOS_ALMACEN));
        if (guardado && typeof guardado === 'object') {
            memoriaAvisos.visitas = Number.isFinite(guardado.visitas) ? guardado.visitas : 0;
            if (guardado.hecho && typeof guardado.hecho === 'object') memoriaAvisos.hecho = guardado.hecho;
        }
    } catch (error) {
        // Si no se puede leer (o está dañado), se empieza de cero
    }
    let visitaNueva = true;
    try {
        visitaNueva = !sessionStorage.getItem(AVISOS_ALMACEN); // una por sesión: recargar no cuenta
        sessionStorage.setItem(AVISOS_ALMACEN, '1');
    } catch (error) {
        // Sin sessionStorage cuenta cada carga
    }
    if (visitaNueva) {
        memoriaAvisos.visitas += 1;
        guardarMemoriaAvisos();
    }
    return memoriaAvisos.visitas <= AVISOS_VISITAS_MAXIMAS;
}

const avisoHecho = clave => memoriaAvisos.hecho[clave] === true;

function marcarAvisoHecho(clave) {
    if (avisoHecho(clave)) return;
    memoriaAvisos.hecho[clave] = true;
    guardarMemoriaAvisos();
}

const AVISO_COMBATE_ESPERA = 2000;       // ms desde que aparece la primera carta
const AVISO_COMBATE_DURACION = 7000;     // ms que queda a la vista
const AVISO_ZOOM_ESPERA = 5000;          // ms desde que aparece la primera carta (3 s después del de combate, para que se lean de a uno)
const AVISO_ZOOM_DURACION = 7000;        // ms que queda a la vista el consejo (computadora: uno solo)
const AVISO_ZOOM_DURACION_DEDO = 14000;  // en celular, los dos cartelitos (el segundo tiene más texto): más tiempo para leerlos
const AVISO_GESTOS_ESPERA = 2000;        // ms desde que se amplía la carta (solo celular)
const AVISO_GESTOS_DURACION = 10500;     // ms que quedan a la vista (son dos cartelitos, uno por consejo)

let cajaDeAvisos = null; // el contenedor donde se apilan los avisos (se crea con el primero)

function ubicarAvisos() {
    if (!cajaDeAvisos) return;
    // Debajo de la barra, que cambia de alto según el ancho de la pantalla. Se cuenta con el alto de la barra y no con dónde está
    // en este momento: en celular la barra se esconde al bajar y, si el aviso entra en ese momento, quedaría fuera de la pantalla
    cajaDeAvisos.style.top = `${Math.round(document.getElementById('navbar').getBoundingClientRect().height) + 12}px`;
}

// Con una carta ampliada el fondo del zoom tapa todo: los avisos pasan por encima mientras dura
function avisosSobreElZoom() {
    cajaDeAvisos?.classList.toggle('sobre-zoom', !!cartaEnZoom);
}

function ponerAviso(aviso) {
    if (!cajaDeAvisos) {
        cajaDeAvisos = document.createElement('div');
        cajaDeAvisos.id = 'avisos-ayuda';
        document.body.appendChild(cajaDeAvisos);
    }
    cajaDeAvisos.appendChild(aviso);
    ubicarAvisos();
    avisosSobreElZoom();
    void aviso.offsetWidth; // para que la entrada se anime
    aviso.classList.add('visible');
}

// Se desvanece y se achica (así los que quedan abajo suben sin saltar) y después se saca
function quitarAviso(aviso) {
    aviso.classList.remove('visible');
    aviso.classList.add('saliendo');
    setTimeout(() => aviso.remove(), 600); // cuando termina de achicarse
}

function crearAviso(id, lineas) {
    const aviso = document.createElement('div');
    aviso.id = id;
    aviso.className = 'aviso-ayuda';
    aviso.setAttribute('role', 'status');
    aviso.innerHTML = lineas
        .map(({ clave, icono, texto }) => `<p class="aviso-linea" data-clave="${clave}" data-texto="${texto}"><span class="aviso-icono" aria-hidden="true">${icono}</span><span class="aviso-texto"></span></p>`)
        .join('');
    return aviso;
}

function escribirAviso(aviso) {
    aviso?.querySelectorAll('.aviso-linea').forEach((linea) => {
        linea.querySelector('.aviso-texto').textContent = t(linea.dataset.texto);
    });
}

function activarAvisosDeAyuda() {
    const hayAvisos = registrarVisitaDeAvisos(); // (también cuenta la visita, así que se llama siempre)
    // Cómo se acomodan los carteles vale para todos, también para los que salen en visitas más allá de la sexta (el de la inclinación)
    document.addEventListener('zoom-cambio', avisosSobreElZoom);
    window.addEventListener('resize', ubicarAvisos);
    // La barra también cambia de alto sin que cambie la ventana (por ejemplo, cuando el bloque de carga desaparece)
    if ('ResizeObserver' in window) new ResizeObserver(ubicarAvisos).observe(document.getElementById('navbar'));
    if (!hayAvisos) return; // ya entró más de 6 veces: no hace falta ninguno de los avisos de cómo se usa la página
    activarAvisoCombate();
    activarAvisoZoom();
    activarAvisoGestosDelZoom();
}

// Con la carta ya ampliada: cómo cerrarla y cómo pasar a otra (los gestos de los que no hay ninguna pista a la vista, porque en pantallas
// táctiles el textito de "Esc para cerrar" no se muestra). Solo pantallas táctiles, y una sola vez por visita: si la persona cierra la
// carta antes de que entre, todavía no lo vio y sale con la próxima que amplíe.
function activarAvisoGestosDelZoom() {
    if (!window.matchMedia('(hover: none)').matches) return;
    let yaSeMostro = avisoHecho('gestos'); // también si salió en una visita anterior
    let enZoom = false;    // hay una carta ampliada (y no se está cerrando)
    let espera = 0;
    let temporizador = 0;
    let avisos = []; // un cartelito por consejo (los que están a la vista)

    const cerrar = () => {
        clearTimeout(espera);
        clearTimeout(temporizador);
        avisos.forEach(quitarAviso);
        avisos = [];
    };

    document.addEventListener('zoom-cambio', () => {
        const abierto = !!cartaEnZoom && !zoomCerrando;
        if (abierto === enZoom) return; // también sale al pasar de una carta a otra o al girar el celular: no es un zoom nuevo
        enZoom = abierto;
        if (!abierto) { // se cerró la carta: lo que cuenta ya no sirve
            cerrar();
            return;
        }
        if (yaSeMostro) return;
        espera = setTimeout(() => {
            if (!enZoom || yaSeMostro) return;
            yaSeMostro = true;
            marcarAvisoHecho('gestos');
            // Dos cartelitos separados (cerrar, y pasar a otra carta), uno debajo del otro: no una sola burbuja con dos líneas
            avisos = [
                { clave: 'cerrar', icono: '👆', texto: 'aviso.zoom.cerrar' },
                { clave: 'deslizar', icono: '↔️', texto: 'aviso.zoom.deslizar' },
            ].map((consejo) => {
                const aviso = crearAviso(`aviso-gestos-zoom-${consejo.clave}`, [consejo]);
                escribirAviso(aviso);
                ponerAviso(aviso);
                return aviso;
            });
            temporizador = setTimeout(cerrar, AVISO_GESTOS_DURACION);
        }, AVISO_GESTOS_ESPERA);
    });
    document.addEventListener('idioma-cambiado', () => avisos.forEach(escribirAviso));
}

// Cartel de ayuda de la inclinación con el mouse (solo computadora: existe únicamente si hay inclinación con el mouse, o sea, el botón de la
// barra está a la vista). Es un globito que sale del propio botón y cuenta que se puede anular la inclinación manteniendo apretada Shift y que
// ese botón la invierte; mientras sale, el botón salta y lanza ondas (la misma llamada que el botón de sonido en su primer sonido: "llamando").
// Una sola vez por sesión del navegador. Cuándo sale depende de cuántas sesiones lleva la persona en la página (el mismo contador de visitas
// de los avisos de ayuda), y es cada vez más tarde:
//     sesiones 1 a 5:   a los 15 s de inclinación acumulada   (con la inclinación invertida: a los 20 s de cargar la página)
//     sesiones 6 a 9:   a los 45 s                            (55 s)
//     sesiones 10 a 14: a 1:20 min                            (1:35 min)
//     de la 15 en adelante: no sale más
// Con la inclinación invertida las cartas casi no se inclinan (solo con Shift), así que ahí no se espera a que se inclinen: sale a los tantos
// segundos de haber cargado la página. Si la persona ya mostró que conoce Shift (la mantuvo apretada más de 3 s o la apretó más de 2 veces
// con el mouse sobre las cartas, en esta visita o en otra), el cartel no la explica: solo habla del botón. Si hace clic en el botón, ya lo
// encontró: el cartel deja de hacer falta en lo que queda de la sesión.
const INCLINACION_AVISO_SESION = 'digimon-aviso-inclinacion'; // sessionStorage: en esta sesión ya salió
const INCLINACION_ANIMACION_SOLA_SESION = 'digimon-animacion-inclinacion-sola'; // sessionStorage: animación sola ya salió
const INCLINACION_AVISO_TRAMOS = [ // de la sesión más alta a la más baja: vale el primero cuyo "desde" no supera el número de sesión
    { desde: 10, acumulado: 80000, carga: 95000 }, // ms de inclinación acumulada, y ms desde la carga si está invertida
    { desde: 6, acumulado: 45000, carga: 55000 },
    { desde: 1, acumulado: 15000, carga: 20000 },
];
const INCLINACION_AVISO_ULTIMA_SESION = 14;
const INCLINACION_AVISO_DURACION = 10000;        // ms a la vista (explica Shift y el botón)
const INCLINACION_AVISO_DURACION_BREVE = 7000;   // ms a la vista (solo el botón)
const SHIFT_CONOCIDA_TIEMPO = 3000;              // la conoce si la mantuvo apretada más de 3 s...
const SHIFT_CONOCIDA_VECES = 2;                  // ...o la apretó más de 2 veces

function inclinacionAvisoYaSalio() {
    try {
        return sessionStorage.getItem(INCLINACION_AVISO_SESION) === '1';
    } catch (error) {
        return false;
    }
}

function inclinacionAnimacionSolaYaSalio() {
    try {
        return sessionStorage.getItem(INCLINACION_ANIMACION_SOLA_SESION) === '1';
    } catch (error) {
        return false;
    }
}

function marcarInclinacionAnimacionSolaHecha() {
    try {
        sessionStorage.setItem(INCLINACION_ANIMACION_SOLA_SESION, '1');
    } catch (error) {
    }
}

function activarAvisoDeInclinacion() {
    const boton = document.getElementById('inclinacion-invertida');
    if (!boton || boton.hidden) return; // sin inclinación con el mouse (celular, o "reducir movimiento") no hay nada que contar
    const sesion = memoriaAvisos.visitas;
    const tramo = INCLINACION_AVISO_TRAMOS.find(({ desde }) => sesion >= desde) ?? INCLINACION_AVISO_TRAMOS.at(-1);
    const estaInvertida = () => boton.getAttribute('aria-pressed') === 'true';
    const invertidaAlCargar = estaInvertida();

    let terminado = sesion > INCLINACION_AVISO_ULTIMA_SESION || inclinacionAvisoYaSalio(); // ya salió, o ya no hace falta el cartel
    let esperaCarga = 0;   // modo invertido: desde la carga de la página
    let esperaTilt = 0;    // modo normal: cuando la inclinación acumulada llega al tiempo
    let reintento = 0;

    // --- ¿La persona ya sabe usar Shift con las cartas? Cuenta solo con el mouse sobre las cartas (no cuando escribe mayúsculas en un campo) ---
    let sobreLasCartas = false;
    let shiftDesde = 0;   // desde cuándo la mantiene apretada sobre las cartas (0: no la mantiene)
    let shiftTiempo = 0;  // ms que la mantuvo apretada sobre las cartas
    let shiftVeces = 0;   // veces que la apretó sobre las cartas

    const conoceShift = () => {
        const tiempo = shiftTiempo + (shiftDesde ? performance.now() - shiftDesde : 0);
        if (tiempo > SHIFT_CONOCIDA_TIEMPO || shiftVeces > SHIFT_CONOCIDA_VECES) marcarAvisoHecho('shift'); // queda guardado: ya la conoce
        return avisoHecho('shift');
    };

    const soltarShift = () => {
        if (!shiftDesde) return;
        shiftTiempo += performance.now() - shiftDesde;
        shiftDesde = 0;
        conoceShift();
    };

    listaDigimons.addEventListener('pointermove', (evento) => {
        if (evento.pointerType === 'touch') return;
        sobreLasCartas = true;
        if (!evento.shiftKey) soltarShift(); // (también corrige si se soltó fuera de la ventana y no nos enteramos)
        else if (!shiftDesde) shiftDesde = performance.now(); // llegó a las cartas con Shift ya apretada
    });
    listaDigimons.addEventListener('pointerleave', () => {
        sobreLasCartas = false;
        soltarShift();
    });
    window.addEventListener('blur', soltarShift);
    document.addEventListener('keydown', (evento) => {
        if (evento.key !== 'Shift' || evento.repeat || !sobreLasCartas) return;
        if (document.activeElement?.matches?.('input, textarea, select')) return;
        shiftVeces += 1;
        if (!shiftDesde) shiftDesde = performance.now();
        conoceShift();
    });
    document.addEventListener('keyup', (evento) => {
        if (evento.key === 'Shift') soltarShift();
    });

    // --- El cartel: un globito que sale del botón (ver "LLAMADA DE LOS BOTONES REDONDOS"). Al tocar el botón se va ---
    const mostrar = () => {
        clearTimeout(reintento);
        if (terminado) return;
        // Con la pestaña en segundo plano nadie vería el botón, así que se espera. El zoom, el combate y los carteles de información ya no hacen
        // esperar (el botón sube por encima), ni tampoco el globito del botón de sonido (si coinciden, se reparten a los costados)
        if (document.hidden) {
            reintento = setTimeout(mostrar, 500);
            return;
        }
        terminado = true;
        clearTimeout(esperaCarga);
        clearTimeout(esperaTilt);
        try {
            sessionStorage.setItem(INCLINACION_AVISO_SESION, '1');
        } catch (error) {
            // Sin sessionStorage, vale mientras no se recargue la página
        }
        marcarInclinacionAnimacionSolaHecha();
        const sabeShift = conoceShift();
        const clave = `aviso.inclinacion.${estaInvertida() ? 'invertida' : 'normal'}${sabeShift ? '.boton' : ''}`; // (la variante queda fija aunque se invierta mientras está)
        llamarLaAtencion(boton, {
            icono: '🖱️',
            texto: () => t(clave),
            duracion: sabeShift ? INCLINACION_AVISO_DURACION_BREVE : INCLINACION_AVISO_DURACION,
        });
    };

    // Solo la animación del botón (saltos y ondas), por única vez por sesión, sin el cartel
    const animarBotonSinCartel = () => {
        if (inclinacionAnimacionSolaYaSalio()) return;
        marcarInclinacionAnimacionSolaHecha();
        if (llamadasActivas.has(boton)) return;

        let devolver = null;
        if (boton.parentElement !== document.body && hayCortinaSobreLaBarra()) {
            devolver = subirBotonSobreLaCortina(boton);
        }
        let vigiliaAnim = 0;
        const vigilarCortinaAnim = () => {
            const tapada = hayCortinaSobreLaBarra();
            if (!devolver && boton.parentElement !== document.body && tapada) {
                devolver = subirBotonSobreLaCortina(boton);
            } else if (devolver && !tapada) {
                devolver();
                devolver = null;
            }
            vigiliaAnim = requestAnimationFrame(vigilarCortinaAnim);
        };
        vigiliaAnim = requestAnimationFrame(vigilarCortinaAnim);

        boton.classList.remove('llamando');
        void boton.offsetWidth;
        boton.classList.add('llamando');

        setTimeout(() => {
            cancelAnimationFrame(vigiliaAnim);
            boton.classList.remove('llamando');
            devolver?.();
            devolver = null;
        }, AUDIO_AVISO_DURACION);
    };

    // Tercera condición de aparición: clic en los botones inferiores del frente de la carta (tipo o elemento).
    // Si el cartel aún no salió en la sesión, sale con el cartel; si ya había pasado, sale solo la animación del botón.
    document.addEventListener('click-chip-carta', () => {
        if (!terminado && !inclinacionAvisoYaSalio()) {
            mostrar();
        } else {
            animarBotonSinCartel();
        }
    });

    // --- Cuándo: con la inclinación normal, al juntar el tiempo de inclinación con el mouse; con la invertida, a los tantos segundos de cargar ---
    let inclinando = false; // hay una carta inclinándose con el mouse (la que se inclina con el dedo no cuenta)
    let acumulado = 0;      // ms de inclinación con el mouse en esta carga de la página
    let desde = 0;          // desde cuándo corre el tramo de inclinación de ahora (0: no corre)

    const sumarTramo = () => {
        if (!desde) return;
        acumulado += performance.now() - desde;
        desde = 0;
        clearTimeout(esperaTilt);
    };

    const empezarTramo = () => {
        if (desde || terminado || invertidaAlCargar) return;
        desde = performance.now();
        esperaTilt = setTimeout(mostrar, Math.max(0, tramo.acumulado - acumulado));
    };

    document.addEventListener('inclinacion-cambio', (evento) => { // lo avisa activarInclinacion
        inclinando = evento.detail.activa && !inclinandoConDedo;
        if (inclinando) empezarTramo();
        else sumarTramo();
    });
    // Con la pestaña en segundo plano no se cuenta
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) sumarTramo();
        else if (inclinando) empezarTramo();
    });
    if (!terminado && invertidaAlCargar) esperaCarga = setTimeout(mostrar, tramo.carga);

    // Hizo clic en el botón: ya lo encontró
    boton.addEventListener('click', () => {
        terminado = true;
        clearTimeout(esperaCarga);
        clearTimeout(esperaTilt);
        clearTimeout(reintento);
        terminarLlamada(boton);
        marcarInclinacionAnimacionSolaHecha();
    });
}

// Cartel del zoom extra (solo computadora): al ampliar la primera carta de la sesión cuenta, en una línea, que con el mouse sobre la carta la
// rueda hacia arriba la agranda todavía más y hacia abajo vuelve (ver "ZOOM EXTRA"). Una sola vez por sesión del navegador (si se cierra la
// carta antes de que entre, todavía no lo vio y sale con la próxima), y solo en las primeras 5 sesiones de la persona (el mismo contador de
// visitas de los avisos de ayuda): a partir de la sexta no sale más. Se va si la persona hace lo que cuenta, o al cerrar la carta.
const ZOOM_EXTRA_AVISO_SESION = 'digimon-aviso-zoom-extra'; // sessionStorage: en esta sesión ya salió
const ZOOM_EXTRA_AVISO_ULTIMA_SESION = 5;
const ZOOM_EXTRA_AVISO_ESPERA = 1500;    // ms desde que se abre el zoom (la carta llega al centro a los 0,7 s)
const ZOOM_EXTRA_AVISO_DURACION = 8000;  // ms a la vista

function activarAvisoDeZoomExtra() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return; // en celular no
    if (memoriaAvisos.visitas > ZOOM_EXTRA_AVISO_ULTIMA_SESION) return;
    const yaSalio = () => {
        try {
            return sessionStorage.getItem(ZOOM_EXTRA_AVISO_SESION) === '1';
        } catch (error) {
            return false;
        }
    };
    let salio = yaSalio();
    let enZoom = false;  // hay una carta ampliada (y no se está cerrando)
    let espera = 0;
    let cierre = 0;
    let aviso = null;

    const cerrar = () => {
        clearTimeout(espera);
        clearTimeout(cierre);
        if (aviso) quitarAviso(aviso);
        aviso = null;
    };

    document.addEventListener('zoom-cambio', () => {
        const abierto = !!cartaEnZoom && !zoomCerrando;
        if (abierto === enZoom) return; // también sale al pasar de una carta a otra: no es un zoom nuevo
        enZoom = abierto;
        if (!abierto) { // se cerró la carta: lo que cuenta ya no sirve
            cerrar();
            return;
        }
        if (salio) return;
        espera = setTimeout(() => {
            if (!enZoom || salio) return;
            salio = true;
            try {
                sessionStorage.setItem(ZOOM_EXTRA_AVISO_SESION, '1');
            } catch (error) {
                // Sin sessionStorage, vale mientras no se recargue la página
            }
            aviso = crearAviso('aviso-zoom-extra', [{ clave: 'zoom-extra', icono: '🔍', texto: 'aviso.zoomExtra' }]);
            escribirAviso(aviso);
            ponerAviso(aviso);
            cierre = setTimeout(cerrar, ZOOM_EXTRA_AVISO_DURACION);
        }, ZOOM_EXTRA_AVISO_ESPERA);
    });
    document.addEventListener('zoom-extra', () => { // ya lo está haciendo: el cartel se va
        if (zoomExtra) cerrar();
    });
    document.addEventListener('idioma-cambiado', () => escribirAviso(aviso));
}

// Primero: qué hay que hacer. Solo en celular (hasta 700px, donde la consigna queda escondida dentro del menú ☰)
function activarAvisoCombate() {
    const celular = window.matchMedia('(max-width: 700px)');
    let aviso = null;
    let temporizador = 0;
    let cerrado = false;

    const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        clearTimeout(temporizador);
        if (aviso) quitarAviso(aviso);
        aviso = null;
    };

    const mostrar = () => {
        if (cerrado || aviso) return;
        if (!celular.matches || avisoHecho('combate') || seleccionados.length >= 2) { // en computadora ya se ve en la barra; si ya eligió las 2 (ahora o en otra visita), no hay nada que pedirle
            cerrado = true;
            return;
        }
        aviso = crearAviso('aviso-combate', [{ clave: 'combate', icono: '⚔️', texto: 'combate.consigna' }]);
        escribirAviso(aviso);
        ponerAviso(aviso);
        temporizador = setTimeout(cerrar, AVISO_COMBATE_DURACION);
    };

    document.addEventListener('carta-agregada', () => setTimeout(mostrar, AVISO_COMBATE_ESPERA), { once: true });
    document.addEventListener('seleccion-cambio', () => {
        if (seleccionados.length < 2) return;
        marcarAvisoHecho('combate'); // ya eligió las 2
        cerrar();
    });
    document.addEventListener('idioma-cambiado', () => escribirAviso(aviso));
}

// Después: cómo ampliar una carta (y en pantallas táctiles, cómo inclinarla y darla vuelta). Cada consejo es un cartelito aparte:
// se apilan (el primero arriba) y cada uno se va cuando la persona ya hizo lo que cuenta.
function activarAvisoZoom() {
    const conDedo = window.matchMedia('(hover: none)').matches;
    // "clave" es lo que la persona tiene que hacer; "texto" es la clave de la traducción
    const consejos = conDedo
        ? [{ clave: 'zoom', icono: '👆', texto: 'aviso.zoom.dedos' }, { clave: 'inclinar', icono: '✨', texto: 'aviso.inclinar.dedo' }]
        : [{ clave: 'zoom', icono: '💡', texto: 'aviso.zoom.mouse' }];
    const hecho = new Set(consejos.map(consejo => consejo.clave).filter(avisoHecho)); // lo que la persona ya hizo (también en visitas anteriores)
    const avisos = new Map(); // clave del consejo -> su cartelito (los que están a la vista)
    let temporizador = 0;
    let cerrado = false;

    const quitar = (clave) => {
        const aviso = avisos.get(clave);
        if (!aviso) return;
        avisos.delete(clave);
        quitarAviso(aviso);
    };

    const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        clearTimeout(temporizador);
        [...avisos.keys()].forEach(quitar);
    };

    // La persona hizo lo que cuenta ese consejo: su cartelito se va (el otro se queda)
    const yaLoHizo = (clave) => {
        hecho.add(clave);
        marcarAvisoHecho(clave);
        quitar(clave);
    };

    const mostrar = () => {
        if (cerrado || avisos.size) return;
        const pendientes = consejos.filter(consejo => !hecho.has(consejo.clave));
        if (!pendientes.length) {
            cerrado = true; // ya hizo todo: no hay nada que contarle
            return;
        }
        pendientes.forEach((consejo) => {
            const aviso = crearAviso(`aviso-zoom-${consejo.clave}`, [consejo]);
            escribirAviso(aviso);
            ponerAviso(aviso);
            avisos.set(consejo.clave, aviso);
        });
        temporizador = setTimeout(cerrar, conDedo ? AVISO_ZOOM_DURACION_DEDO : AVISO_ZOOM_DURACION);
    };

    // Aparece unos segundos después de la primera carta: antes no tiene sentido hablar de cartas que todavía no están
    document.addEventListener('carta-agregada', () => setTimeout(mostrar, AVISO_ZOOM_ESPERA), { once: true });
    document.addEventListener('zoom-cambio', () => {
        if (cartaEnZoom) yaLoHizo('zoom'); // hay una carta ampliada (o cerrándose): ya sabe cómo hacerlo
    });
    document.addEventListener('inclinacion-con-dedo', () => yaLoHizo('inclinar')); // lo avisa activarInclinacionConDedo
    document.addEventListener('idioma-cambiado', () => avisos.forEach(escribirAviso));
}

// En celulares la carta también se amplía con doble toque (dos toques cortos seguidos sobre la misma carta). Igual que con el
// doble clic, el primer toque ya eligió la carta y el segundo la desmarcó: al ampliar se deja la selección como estaba antes.
// (Se detecta acá y no con "dblclick" porque no todos los navegadores del celular lo mandan con un doble toque.)
const DOBLE_TOQUE_ESPERA = 320;    // ms máximos entre el final de un toque y el principio del siguiente
const DOBLE_TOQUE_DISTANCIA = 30;  // px máximos entre los dos toques
const TOQUE_DURACION = 250;        // ms máximos que el dedo puede estar apoyado para que cuente como toque (más es una presión larga)
const TOQUE_MOVIMIENTO = 12;       // px máximos que se puede mover el dedo durante un toque

function activarZoomConDobleToque() {
    if (!(navigator.maxTouchPoints > 0 || 'ontouchstart' in window)) return;
    let apoyado = null;  // { carta, t, x, y, estado }: el dedo que está apoyado ahora
    let anterior = null; // { carta, tFin, x, y, estado }: el último toque corto

    document.addEventListener('touchstart', (evento) => {
        apoyado = null;
        const toque = evento.touches[0];
        const carta = evento.touches.length === 1 ? toque.target.closest?.('#listado-digimons > li') : null;
        if (!carta || cartaEnZoom || zoomOcupado || toque.target.closest('button')) {
            anterior = null;
            return;
        }
        // "estado" es la selección de antes del primer toque (el clic de ese toque llega recién al soltar el dedo)
        const esSegundo = anterior && anterior.carta === carta && evento.timeStamp - anterior.tFin <= DOBLE_TOQUE_ESPERA;
        apoyado = { carta, t: evento.timeStamp, x: toque.clientX, y: toque.clientY, estado: esSegundo ? anterior.estado : seleccionados.slice() };
    }, { passive: true });

    document.addEventListener('touchmove', (evento) => {
        if (!apoyado) return;
        const toque = evento.touches[0];
        if (Math.hypot(toque.clientX - apoyado.x, toque.clientY - apoyado.y) > TOQUE_MOVIMIENTO) {
            apoyado = null;
            anterior = null;
        }
    }, { passive: true });

    document.addEventListener('touchend', (evento) => {
        const toque = apoyado;
        apoyado = null;
        if (!toque) return;
        if (evento.timeStamp - toque.t > TOQUE_DURACION) { // presión larga (la inclinación): no cuenta como toque
            anterior = null;
            return;
        }
        const previo = anterior;
        const esDoble = previo && previo.carta === toque.carta
            && toque.t - previo.tFin <= DOBLE_TOQUE_ESPERA
            && Math.hypot(toque.x - previo.x, toque.y - previo.y) <= DOBLE_TOQUE_DISTANCIA;
        if (!esDoble) {
            anterior = { carta: toque.carta, tFin: evento.timeStamp, x: toque.x, y: toque.y, estado: toque.estado };
            return;
        }
        anterior = null;
        // Se espera un instante a que el segundo toque termine de procesarse como clic, y ahí se deshace lo que hicieron los dos
        setTimeout(() => {
            restaurarSeleccion(previo.estado);
            if (cartaEnZoom || zoomOcupado) return;
            vibrar(12);
            abrirZoom(toque.carta);
        }, 60);
    }, { passive: true });

    document.addEventListener('touchcancel', () => {
        apoyado = null;
        anterior = null;
    }, { passive: true });
}

// Con el dedo la carta también se amplía con el gesto de zoom (dos dedos que se separan sobre la carta) y vuelve
// a su lugar juntando los dedos. Tocar afuera o la ✕ también la cierra, como siempre.
// Con la carta ya ampliada y de frente, separar los dedos la agranda todavía más y juntarlos la devuelve (ver "ZOOM EXTRA"); si ya está en su
// tamaño normal, juntar los dedos la cierra, como siempre. En el dorso, juntar los dedos cierra y separarlos no hace nada.
// (El CSS deja las cartas con touch-action: pan-y: se pueden desplazar hacia arriba y abajo, pero el navegador no amplía la
// página con ese pellizco y los dedos le llegan al código.)
const PELLIZCO_ABRIR = 1.3;   // los dedos se separaron un 30%
const PELLIZCO_CERRAR = 0.75; // los dedos se juntaron un 25%

function activarZoomConPellizco() {
    let pellizco = null; // { carta, distancia, resuelto }: el gesto de dos dedos que está en curso

    const distanciaEntreDedos = (toques) => Math.hypot(
        toques[0].clientX - toques[1].clientX,
        toques[0].clientY - toques[1].clientY
    );
    const medioEntreDedos = toques => ({
        x: (toques[0].clientX + toques[1].clientX) / 2,
        y: (toques[0].clientY + toques[1].clientY) / 2,
    });

    document.addEventListener('touchstart', (evento) => {
        pellizco = null;
        if (evento.touches.length !== 2) return;
        const [a, b] = evento.touches;
        if (cartaEnZoom) {
            // "previo" es donde estaban los dedos en el último movimiento (el zoom extra sigue a los dedos paso a paso); "cerrable" es si
            // este gesto puede cerrar el zoom: no si ya se empezó con la carta agrandada de más (juntar los dedos es para devolverla)
            pellizco = {
                carta: null, distancia: distanciaEntreDedos(evento.touches), resuelto: false,
                previo: { distancia: distanciaEntreDedos(evento.touches), medio: medioEntreDedos(evento.touches) },
                cerrable: !zoomExtra,
            };
            return;
        }
        // Los dos dedos tienen que estar en la misma carta (o el segundo en el espacio entre cartas)
        const cartaA = a.target.closest?.('#listado-digimons > li');
        const cartaB = b.target.closest?.('#listado-digimons > li');
        if (cartaA && (cartaB === cartaA || !cartaB)) {
            pellizco = { carta: cartaA, distancia: distanciaEntreDedos(evento.touches), resuelto: false };
        }
    }, { passive: true });

    document.addEventListener('touchmove', (evento) => {
        if (!pellizco || pellizco.resuelto || evento.touches.length !== 2 || pellizco.distancia < 10) return;
        const proporcion = distanciaEntreDedos(evento.touches) / pellizco.distancia;
        if (evento.cancelable) evento.preventDefault();
        if (!pellizco.carta && zoomExtraDisponible()) { // zoom extra: la carta sigue a los dedos (se agranda con la separación y se corre con el movimiento)
            const distancia = distanciaEntreDedos(evento.touches);
            const medio = medioEntreDedos(evento.touches);
            const carta = cartaEnZoom;
            const extra = carta.datosZoom.extra;
            const factor = Math.max(1, Math.min(ZOOM_EXTRA_MAXIMO, extra.factor * distancia / pellizco.previo.distancia));
            extra.objetivo = factor;
            ponerZoomExtra(carta, factor, pellizco.previo.medio, medio, true);
            pellizco.previo = { distancia, medio };
            if (zoomExtra) pellizco.cerrable = false; // ya se usó para agrandar: juntar los dedos ahora es devolverla, no cerrar
        }
        if (!pellizco.carta && pellizco.cerrable && proporcion <= PELLIZCO_CERRAR) {
            pellizco.resuelto = true;
            cerrarZoom();
        } else if (pellizco.carta && proporcion >= PELLIZCO_ABRIR && !cartaEnZoom && !zoomOcupado) {
            pellizco.resuelto = true;
            vibrar(12);
            abrirZoom(pellizco.carta);
        }
    }, { passive: false });

    const terminar = (evento) => {
        if (evento.touches.length < 2) pellizco = null;
    };
    document.addEventListener('touchend', terminar);
    document.addEventListener('touchcancel', terminar);

    // iPhone: el pellizco sobre una carta (o con la carta ampliada) no tiene que ampliar la página
    for (const tipo of ['gesturestart', 'gesturechange']) {
        document.addEventListener(tipo, (evento) => {
            if (cartaEnZoom || evento.target.closest?.('#listado-digimons > li')) evento.preventDefault();
        }, { passive: false });
    }
}

// En celulares la carta también se da vuelta con un barrido rápido de un dedo hacia un costado (además del botón de la
// esquina). Si antes se mantuvo apretada para inclinarla, el barrido tiene que ser mucho más rápido (ver más abajo).
// La carta gira hacia donde va el dedo.
const BARRIDO_DISTANCIA = 40;  // px que tiene que recorrer el dedo hacia el costado en los últimos instantes
const BARRIDO_VELOCIDAD = 0.7; // px por milisegundo: tiene que ser un movimiento rápido
const BARRIDO_VENTANA = 90;    // ms que se miran para calcular la distancia y la velocidad
// Mientras la carta se está inclinando con el dedo (mantenida apretada), se mueve el dedo de un lado a otro para ver el
// brillo, y sin querer se daba vuelta. Entonces, en ese caso, el barrido tiene que ser muchísimo más rápido y más largo
// (si se da vuelta sin querer: subir estos números; si cuesta darla vuelta a propósito: bajarlos)
const BARRIDO_DISTANCIA_INCLINANDO = 70;  // px
const BARRIDO_VELOCIDAD_INCLINANDO = 1.8; // px por milisegundo (más de 2 veces la normal)
let inclinandoConDedo = false;            // true mientras hay una carta inclinándose con el dedo (lo maneja activarInclinacionConDedo)

// Ocultamiento inteligente de las flechas de flip en móvil:
// Cuando el usuario en móvil demuestra que ya sabe rotar cartas con el dedo (acumula 4 flips por sesión),
// o cuando es la séptima vez (o más) que entra al sitio, se ocultan todas las flechas de flip para que las cartas se vean limpias.
const ALMACEN_FLIPS_SESION = 'digimon-flips-sesion';
const MIN_FLIPS_SESION_PARA_OCULTAR = 4;
const MIN_VISITAS_PARA_OCULTAR_SIEMPRE = 7;

function aplicarOcultarFlechasFlip() {
    document.body.classList.add('sin-flechas-flip-movil');
}

function gestionarVisitasYFlechasMovil() {
    // Si ya es la 7ma visita o más, las flechas desaparecen para siempre en móvil
    if (memoriaAvisos.visitas >= MIN_VISITAS_PARA_OCULTAR_SIEMPRE) {
        aplicarOcultarFlechasFlip();
        return;
    }

    // Si en la sesión actual ya acumuló 4 flips con el dedo, se ocultan por lo que resta de la sesión
    try {
        const flipsSesion = parseInt(sessionStorage.getItem(ALMACEN_FLIPS_SESION) || '0', 10);
        if (flipsSesion >= MIN_FLIPS_SESION_PARA_OCULTAR) {
            aplicarOcultarFlechasFlip();
        }
    } catch (error) {}
}

function registrarFlipConDedo() {
    try {
        let flips = parseInt(sessionStorage.getItem(ALMACEN_FLIPS_SESION) || '0', 10);
        if (isNaN(flips)) flips = 0;
        flips += 1;
        sessionStorage.setItem(ALMACEN_FLIPS_SESION, String(flips));
        if (flips >= MIN_FLIPS_SESION_PARA_OCULTAR) {
            aplicarOcultarFlechasFlip();
        }
    } catch (error) {}
}

function activarVoltearConDedo() {
    if (!(navigator.maxTouchPoints > 0 || 'ontouchstart' in window)) return;
    let gesto = null;        // { carta, x0, y0, muestras, resuelto }: el dedo que está apoyado en una carta
    let evitarClic = false;  // al soltar después del barrido no se elige la carta

    document.addEventListener('touchstart', (evento) => {
        gesto = null;
        if (evento.touches.length !== 1) return;
        const toque = evento.touches[0];
        const carta = toque.target.closest?.('#listado-digimons > li');
        if (!carta || toque.target.closest('button')) return;
        gesto = {
            carta,
            x0: toque.clientX,
            y0: toque.clientY,
            muestras: [{ t: evento.timeStamp, x: toque.clientX, y: toque.clientY }],
            resuelto: false,
        };
    }, { passive: true });

    document.addEventListener('touchmove', (evento) => {
        if (!gesto || gesto.resuelto) return;
        if (evento.touches.length !== 1) {
            gesto = null;
            return;
        }
        const toque = evento.touches[0];
        const muestras = gesto.muestras;
        muestras.push({ t: evento.timeStamp, x: toque.clientX, y: toque.clientY });
        while (muestras.length > 2 && evento.timeStamp - muestras[0].t > BARRIDO_VENTANA) muestras.shift();

        // Si el dedo va decididamente hacia un costado, la página no se desplaza
        const dxTotal = toque.clientX - gesto.x0;
        const dyTotal = toque.clientY - gesto.y0;
        if (evento.cancelable && Math.abs(dxTotal) > 10 && Math.abs(dxTotal) > Math.abs(dyTotal)) evento.preventDefault();

        const primera = muestras[0];
        const ultima = muestras[muestras.length - 1];
        const dx = ultima.x - primera.x;
        const dy = ultima.y - primera.y;
        const ms = Math.max(1, ultima.t - primera.t);
        const distanciaMinima = inclinandoConDedo ? BARRIDO_DISTANCIA_INCLINANDO : BARRIDO_DISTANCIA;
        const velocidadMinima = inclinandoConDedo ? BARRIDO_VELOCIDAD_INCLINANDO : BARRIDO_VELOCIDAD;
        if (Math.abs(dx) >= distanciaMinima && Math.abs(dx) > Math.abs(dy) * 2 && Math.abs(dx) / ms >= velocidadMinima) {
            gesto.resuelto = true;
            evitarClic = true;
            setTimeout(() => { evitarClic = false; }, 450);
            vibrar(8);
            voltearCarta(gesto.carta, dx > 0 ? 1 : -1);
            registrarFlipConDedo();
        }
    }, { passive: false });

    const terminar = () => { gesto = null; };
    document.addEventListener('touchend', terminar);
    document.addEventListener('touchcancel', terminar);

    listaDigimons.addEventListener('click', (evento) => {
        if (!evitarClic) return;
        evitarClic = false;
        evento.stopPropagation();
        evento.preventDefault();
    }, true);
}

// Preferencia de la inclinación con el mouse (solo computadora): por defecto las cartas se inclinan al pasar el mouse y Shift apretada lo
// anula; con "invertida" es al revés (no se inclinan al pasar el mouse y solo lo hacen mientras se mantiene apretada Shift). Se cambia con
// el botón de la barra (#inclinacion-invertida, junto al de sonido) y, como el sonido, se guarda en el navegador de cada persona
// (localStorage) como un JSON {"invertida": true}, así la próxima vez que entre sigue como la dejó.
// Para volver a empezar (por ejemplo, para probarlo): localStorage.removeItem('digimon-inclinacion')
const INCLINACION_ALMACEN = 'digimon-inclinacion';

function leerInclinacionInvertida() {
    try {
        return JSON.parse(localStorage.getItem(INCLINACION_ALMACEN))?.invertida === true;
    } catch (error) {
        return false; // sin memoria (o con un dato roto) queda como siempre
    }
}

function guardarInclinacionInvertida(invertida) {
    try {
        localStorage.setItem(INCLINACION_ALMACEN, JSON.stringify({ invertida }));
    } catch (error) {
        // Si el navegador no deja guardar, la elección vale solo mientras la página siga abierta
    }
}

// Inclinación 3D: la carta se inclina hacia donde apunta el mouse (más en el frente que en el dorso, para poder leer)
// y el reflejo sigue al puntero (--mx y --my). Sin "reducir movimiento". Con el mouse, mientras se mantiene apretada Shift
// las cartas no se inclinan ni brillan (el levante del hover, en cambio, sigue siempre: se pueden recorrer todas con el mouse sin que se
// incline ninguna). Al soltarla vuelve todo solo. Con la preferencia "invertida" (ver arriba), Shift hace lo contrario: sin Shift las
// cartas no se inclinan ni brillan y con Shift apretada sí.
// Con el dedo: se mantiene apretada la carta un instante y, sin soltar, al mover el dedo se inclina (mientras tanto la
// página no se desplaza). Un toque corto sigue siendo un toque normal (elegir la carta para el combate).
function activarInclinacion() {
    const conMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const conDedo = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    if (reducirMovimiento || (!conMouse && !conDedo)) return;

    listaDigimons.classList.add('tilt-on');

    const INCLINACION_FRENTE = 10; // grados máximos
    const INCLINACION_DORSO = 3;
    let cartaActual = null;
    let caja = null;      // posición y tamaño de la carta cuando empezó a seguir al puntero
    let x = 0;
    let y = 0;            // posición del puntero dentro de la carta, de -1 a 1 (hacia dónde se tiene que inclinar)

    // La inclinación se suaviza acá, cuadro a cuadro, y NO con una transición de CSS sobre "transform". Con la perspectiva,
    // el navegador dibuja una carta que tiene una animación de "transform" a menor resolución mientras dura: se veía
    // pixelada todo el rato que se movía el mouse sobre la carta (y mucho más con el zoom) y un instante al soltarla.
    // Sin animación de CSS, la carta se dibuja siempre a su resolución real.
    const TIEMPO_SEGUIR = 45;  // ms que tarda la carta en alcanzar al puntero
    const TIEMPO_VOLVER = 140; // ms que tarda en enderezarse al soltarla (más lento, para que no sea un tirón)
    const suaves = new Map();  // carta → { x, y }: lo que se está dibujando (incluye las que se están enderezando)
    let cuadro = 0;            // pedido de animationFrame pendiente
    let ultimoCuadro = 0;

    // Le avisa al cartel de ayuda de la inclinación (ver activarAvisoDeInclinacion) cuándo empieza y cuándo termina de inclinarse una carta
    let inclinacionAvisada = false;
    function avisarInclinacion() {
        const activa = !!cartaActual;
        if (activa === inclinacionAvisada) return;
        inclinacionAvisada = activa;
        document.dispatchEvent(new CustomEvent('inclinacion-cambio', { detail: { activa } }));
    }

    function pintar(carta, suave) {
        const maximo = carta.classList.contains('de-dorso') ? INCLINACION_DORSO : INCLINACION_FRENTE;
        carta.style.transform = `${PERSPECTIVA}rotateX(${(-suave.y * maximo).toFixed(2)}deg) rotateY(${(suave.x * maximo).toFixed(2)}deg)`;
        carta.style.setProperty('--mx', `${((suave.x + 1) * 50).toFixed(1)}%`);
        carta.style.setProperty('--my', `${((suave.y + 1) * 50).toFixed(1)}%`);
    }

    function enderezar(carta) {
        carta.style.transform = '';
        carta.style.removeProperty('--mx');
        carta.style.removeProperty('--my');
        suaves.delete(carta);
    }

    function animar(ahora) {
        cuadro = 0;
        const paso = Math.min(ahora - ultimoCuadro, 64);
        ultimoCuadro = ahora;
        for (const [carta, suave] of suaves) {
            if (carta.girando) { // mientras se da vuelta manda la animación del giro
                enderezar(carta);
                soltar(carta); // y deja de ser la carta que sigue al puntero: si no, al terminar el giro no volvía a inclinarse
                continue;
            }
            const siguiendo = carta === cartaActual;
            const k = 1 - Math.exp(-paso / (siguiendo ? TIEMPO_SEGUIR : TIEMPO_VOLVER));
            suave.x += ((siguiendo ? x : 0) - suave.x) * k;
            suave.y += ((siguiendo ? y : 0) - suave.y) * k;
            if (!siguiendo && Math.abs(suave.x) < 0.004 && Math.abs(suave.y) < 0.004) {
                enderezar(carta); // ya está derecha: se saca el transform y la carta deja de ser una capa 3D
                continue;
            }
            pintar(carta, suave);
        }
        if (suaves.size) cuadro = requestAnimationFrame(animar);
    }

    function arrancar() {
        if (cuadro) return;
        ultimoCuadro = performance.now();
        cuadro = requestAnimationFrame(animar);
    }

    // La carta deja de seguir al puntero; la animación la va enderezando
    function soltar(carta) {
        if (!carta) return;
        carta.classList.remove('tilt-activo');
        if (carta === cartaActual) {
            cartaActual = null;
            caja = null;
        }
        if (suaves.has(carta)) arrancar();
        avisarInclinacion();
    }

    // La carta empieza a seguir al puntero. Se usa la caja visible (getBoundingClientRect), que ya tiene en cuenta
    // el achicado de las cartas en celular
    function tomar(carta) {
        soltar(cartaActual);
        cartaActual = carta;
        const rect = carta.getBoundingClientRect();
        caja = { x: rect.left + scrollX, y: rect.top + scrollY, ancho: rect.width, alto: rect.height };
        carta.classList.add('tilt-activo');
        if (!suaves.has(carta)) suaves.set(carta, { x: 0, y: 0 });
        avisarInclinacion();
    }

    function seguir(clienteX, clienteY) {
        if (!caja) return; // la carta está dándose vuelta y ya no sigue al dedo
        const limitar = valor => Math.max(-1, Math.min(1, valor));
        x = limitar(((clienteX + scrollX) - caja.x) / caja.ancho * 2 - 1);
        y = limitar(((clienteY + scrollY) - caja.y) / caja.alto * 2 - 1);
        arrancar();
    }

    if (conMouse) {
        let puntero = null; // última posición del mouse sobre las cartas (para retomar la inclinación al terminar un giro)
        // Mientras la inclinación está "anulada", la carta se endereza y no sigue al mouse, y con la clase "inclinacion-anulada" el CSS
        // también apaga el reflejo y la textura holográfica (que siguen al puntero). El levante del hover NO se apaga: sigue como siempre.
        // Se puede pasar el mouse por todas las cartas sin que ninguna se incline ni brille. Por defecto se anula mientras se mantiene
        // apretada Shift; con la preferencia
        // "invertida" es al revés: está anulada siempre, salvo mientras se mantiene apretada Shift. Al cambiar, todo se acomoda solo, sin
        // mover el mouse. Cada movimiento del mouse trae el estado de Shift (evento.shiftKey), así que si se soltó fuera de la ventana y
        // nos perdimos el aviso, se corrige solo.
        let shiftApretada = false;
        let invertida = leerInclinacionInvertida();
        const anulada = () => invertida !== shiftApretada; // (invertida y Shift apretada se compensan)

        // Si el mouse está sobre una carta, empieza a seguirlo desde donde está el puntero
        const retomar = () => {
            if (!puntero || zoomOcupado || zoomExtra || zoomEsperaMovimiento || anulada()) return;
            const carta = document.elementFromPoint(puntero.x, puntero.y)?.closest('#listado-digimons > li');
            if (!carta || carta.girando || carta.classList.contains('bailando')) return;
            tomar(carta);
            seguir(puntero.x, puntero.y);
        };

        // Deja todo como corresponde al estado de ahora: anulada, la carta que seguía al mouse se endereza (suave, como al salir de ella);
        // si no, retoma la inclinación
        const acomodar = () => {
            listaDigimons.classList.toggle('inclinacion-anulada', anulada());
            if (anulada()) soltar(cartaActual);
            else retomar();
        };

        const ponerShift = (apretada) => {
            if (apretada === shiftApretada) return;
            shiftApretada = apretada;
            acomodar();
        };

        listaDigimons.addEventListener('pointermove', (evento) => {
            if (evento.pointerType === 'touch' || zoomOcupado) return;
            puntero = { x: evento.clientX, y: evento.clientY };
            ponerShift(evento.shiftKey);
            if (anulada() || zoomExtra || zoomEsperaMovimiento) { // (con el zoom extra de la carta ampliada tampoco se inclina: ver "ZOOM EXTRA"; ni cuando se pasó de carta y el mouse no se movió: ver zoomEsperaMovimiento)
                soltar(cartaActual);
                return;
            }
            let carta = evento.target.closest('#listado-digimons > li');

            // Si la carta actual se inclinó o levantó y el puntero quedó un instante en el borde que se apartó,
            // no la soltamos de inmediato: verificamos si el puntero sigue dentro de su zona de interacción (caja base con tolerancia).
            // Esto evita que la carta vibre (se active y desactive a 60 fps) al entrar lentamente desde cualquier borde.
            if (!carta && cartaActual && caja) {
                const px = evento.clientX + scrollX;
                const py = evento.clientY + scrollY;
                const margenX = 12;
                const margenY = 22;
                const dentro = px >= (caja.x - margenX) &&
                               px <= (caja.x + caja.ancho + margenX) &&
                               py >= (caja.y - margenY) &&
                               py <= (caja.y + caja.alto + margenY);
                if (dentro) {
                    carta = cartaActual;
                }
            }

            if (!carta) {
                soltar(cartaActual);
                return;
            }
            if (carta.girando || carta.classList.contains('bailando')) { // mientras se da vuelta o baila (baile.js) no se inclina: tienen su propia animación
                soltar(cartaActual);
                return;
            }
            if (carta !== cartaActual) tomar(carta);
            seguir(evento.clientX, evento.clientY);
        });

        // Si se dio vuelta una carta con el mouse encima y no se lo movió de ahí, la inclinación sigue sin pedir que se salga y se vuelva a entrar.
        // Se mira qué hay bajo el puntero (y no ":hover"): al terminar el giro el navegador puede tardar en actualizar el "hover"
        document.addEventListener('giro-terminado', (evento) => {
            const carta = evento.detail;
            if (!puntero || zoomOcupado || zoomExtra || zoomEsperaMovimiento || anulada()) return;
            const debajo = document.elementFromPoint(puntero.x, puntero.y);
            if (!debajo || !carta.contains(debajo)) return;
            tomar(carta);
            seguir(puntero.x, puntero.y);
        });

        // Al devolver la carta ampliada a su tamaño normal (ver "ZOOM EXTRA"), la inclinación se retoma si el mouse sigue encima
        document.addEventListener('zoom-extra', acomodar);

        // El baile de las cartas (baile.js): al empezar, la carta que seguía al puntero se suelta; al terminar, se retoma si el mouse sigue encima
        document.addEventListener('baile-empezo', () => soltar(cartaActual));
        document.addEventListener('baile-terminado', acomodar);

        // Al apretar o soltar Shift, la inclinación se anula o se retoma según corresponda (ver "acomodar")
        document.addEventListener('keydown', (evento) => {
            if (evento.key === 'Shift') ponerShift(true);
        });

        document.addEventListener('keyup', (evento) => {
            if (evento.key === 'Shift') ponerShift(evento.shiftKey); // (por si queda la otra Shift apretada)
        });

        listaDigimons.addEventListener('pointerleave', (evento) => {
            if (evento.pointerType === 'touch') return;
            puntero = null;
            soltar(cartaActual);
        });

        // El botón de la barra (junto al de sonido) invierte la inclinación. Solo existe en computadora: está escondido (hidden) y recién
        // acá, con mouse y sin "reducir movimiento", se muestra. Queda "hundido" (aria-pressed) cuando está invertida.
        const botonInversion = document.getElementById('inclinacion-invertida');
        if (botonInversion) {
            const mostrarModo = () => {
                const ayuda = t(invertida ? 'inclinacion.invertida' : 'inclinacion.normal');
                botonInversion.setAttribute('aria-pressed', String(invertida));
                botonInversion.title = ayuda;
                botonInversion.setAttribute('aria-label', ayuda);
            };
            botonInversion.hidden = false;
            botonInversion.addEventListener('click', () => {
                invertida = !invertida;
                guardarInclinacionInvertida(invertida);
                mostrarModo();
                acomodar();
            });
            // Si se cambia el idioma, la ayuda del botón se vuelve a escribir en el idioma nuevo
            document.addEventListener('idioma-cambiado', mostrarModo);
            mostrarModo();
        }
        acomodar(); // si la preferencia guardada es "invertida", las cartas arrancan sin reaccionar
    }

    if (conDedo) activarInclinacionConDedo({ tomar, seguir, soltar: () => soltar(cartaActual) });

    // Cuando la carta pasa al centro (o vuelve), la caja que se midió ya no vale: se suelta y se mide de nuevo
    document.addEventListener('zoom-cambio', () => soltar(cartaActual));
    // Con el zoom extra de la carta ampliada (ver "ZOOM EXTRA") la inclinación se cancela
    document.addEventListener('zoom-extra', () => {
        if (zoomExtra) soltar(cartaActual);
    });

    // Al tocar el botón de dar vuelta, la carta se endereza para poder girar
    listaDigimons.addEventListener('click', (evento) => {
        if (evento.target.closest('.c-flip')) soltar(cartaActual);
    }, true);
}

const ESPERA_DEDO = 220;     // ms que hay que mantener apretada la carta para que empiece a inclinarse
const TOLERANCIA_DEDO = 10;  // px que se puede mover el dedo antes de eso (si se mueve más, es que quiere desplazar la página)

function activarInclinacionConDedo({ tomar, seguir, soltar }) {
    let espera = 0;          // temporizador de "mantener apretado"
    let inicio = null;       // dónde y en qué carta apoyó el dedo
    let inclinando = false;
    let evitarClic = false;  // al soltar después de inclinar no se elige la carta

    function cancelar() {
        clearTimeout(espera);
        inicio = null;
        inclinandoConDedo = false;
        if (inclinando) {
            inclinando = false;
            soltar();
        }
    }

    listaDigimons.addEventListener('touchstart', (evento) => {
        if (evento.touches.length !== 1) {
            cancelar();
            return;
        }
        const carta = evento.target.closest('#listado-digimons > li');
        if (!carta || carta.girando || zoomOcupado || zoomExtra || evento.target.closest('button')) return;
        const toque = evento.touches[0];
        inicio = { x: toque.clientX, y: toque.clientY };
        clearTimeout(espera);
        espera = setTimeout(() => {
            if (!inicio || carta.girando) return;
            inclinando = true;
            inclinandoConDedo = true;
            tomar(carta);
            seguir(inicio.x, inicio.y);
            vibrar(10);
            document.dispatchEvent(new CustomEvent('inclinacion-con-dedo')); // el cartel de ayuda ya no tiene que contar cómo se hace
        }, ESPERA_DEDO);
    }, { passive: true });

    // No es pasivo porque, mientras se inclina la carta, hay que frenar el desplazamiento de la página
    listaDigimons.addEventListener('touchmove', (evento) => {
        const toque = evento.touches[0];
        if (inclinando) {
            if (evento.cancelable) evento.preventDefault();
            seguir(toque.clientX, toque.clientY);
        } else if (inicio && Math.hypot(toque.clientX - inicio.x, toque.clientY - inicio.y) > TOLERANCIA_DEDO) {
            cancelar(); // está desplazando la página
        }
    }, { passive: false });

    const terminar = () => {
        const estabaInclinando = inclinando;
        cancelar();
        if (estabaInclinando) {
            evitarClic = true;
            setTimeout(() => { evitarClic = false; }, 450);
        }
    };
    listaDigimons.addEventListener('touchend', terminar);
    listaDigimons.addEventListener('touchcancel', terminar);

    listaDigimons.addEventListener('click', (evento) => {
        if (!evitarClic) return;
        evitarClic = false;
        evento.stopPropagation();
        evento.preventDefault();
    }, true);

    // Mantener apretada una carta no abre el menú del sistema (guardar imagen, copiar...)
    listaDigimons.addEventListener('contextmenu', (evento) => {
        if (evento.target.closest('#listado-digimons > li')) evento.preventDefault();
    });
}

// Vibración corta al tocar botones con el dedo, como una tecla física. Solo en los celulares que la permiten
// (Android; en iPhone el navegador no deja vibrar). El navegador solo la permite después del primer toque en la página.
function vibrar(duracion = 8, forzar = false) {
    if (!navigator.vibrate || (vibracionApagada && !forzar)) return; // vibracionApagada: la persona la quitó con el botón de sonido (#silenciar)
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try {
        navigator.vibrate(duracion);
    } catch (error) {
        // Si no se puede vibrar, no pasa nada
    }
}

function activarVibracion() {
    if (!navigator.vibrate) return;
    document.addEventListener('pointerdown', (evento) => {
        if (evento.pointerType !== 'touch') return;
        const boton = evento.target.closest('button');
        if (!boton || boton.disabled) return;
        if (boton.id === 'silenciar') {
            // El botón de sonido vibra según a dónde lleva el toque y no según cómo está ahora: al pasar a "solo vibración" y al volver a
            // activar todo vibra; al pasar a "nada" (donde ya no hay vibración) ese toque no vibra. Cuando vuelve a "todo" la vibración
            // todavía figura apagada, por eso se fuerza.
            if (modoSiguienteDelAudio() !== 'nada') vibrar(8, true);
            return;
        }
        vibrar(8);
    });
}

// -----------------------------------------------------------------------------------------------------------------
// SONIDOS SINTETIZADOS (Web Audio): no hace falta ningún archivo de audio
// -----------------------------------------------------------------------------------------------------------------
let contextoAudio;

// ---- Silencio general ---------------------------------------------------------------------------------------------
// Un botón chiquito (#silenciar) maneja el sonido y la vibración de la página. En el celular da tres vueltas:
//   1) sonido + vibración (por defecto)  →  2) solo vibración (sin sonido)  →  3) nada de nada  →  vuelve a 1)
// Donde no hay vibración (computadora, iPhone) son solo dos: suena / silenciado.
// Apagar el sonido apaga los sonidos sintetizados (teclas, giro, zoom, sorbo) y los archivos de audio del combate.
// La elección se guarda en el navegador de cada persona (localStorage), como un JSON {"sonido": true, "vibracion": true},
// así la próxima vez que entre sigue como la dejó. (Antes se guardaba {"silenciado": true}: se sigue entendiendo.)
// Para volver a empezar (por ejemplo, para probarlo): localStorage.removeItem('digimon-audio')
const AUDIO_ALMACEN = 'digimon-audio';

// Mismo criterio que usa la página para lo que es solo del celular: pantalla táctil sin "hover" y con navigator.vibrate
// (Android; en iPhone el navegador no deja vibrar y en computadora no hay con qué)
const VIBRACION_DISPONIBLE = Boolean(navigator.vibrate) && window.matchMedia('(hover: none)').matches;

function leerAudioGuardado() {
    try {
        const guardado = JSON.parse(localStorage.getItem(AUDIO_ALMACEN));
        const sinSonido = guardado?.sonido === false || guardado?.silenciado === true;
        // "Sin vibración" solo tiene sentido con el sonido apagado (es el paso 3); con sonido, todo está activado
        return { sinSonido, sinVibracion: sinSonido && guardado?.vibracion === false };
    } catch (error) {
        return { sinSonido: false, sinVibracion: false }; // sin memoria (o con un dato roto) queda todo activado
    }
}

function guardarAudio() {
    try {
        localStorage.setItem(AUDIO_ALMACEN, JSON.stringify({ sonido: !silenciado, vibracion: !vibracionApagada }));
    } catch (error) {
        // Si el navegador no deja guardar, la elección vale solo mientras la página siga abierta
    }
}

const PANTALLA_DE_CELULAR = window.matchMedia('(max-width: 700px)');

// =================================================================================================================
// PERFILES DE AUDIO DIFERENCIADOS: CELULAR VS ESCRITORIO
// =================================================================================================================
// En celular, los parlantes suelen saturar con facilidad y están muy próximos al usuario; un volumen de 0.4
// resulta equilibrado y confortable.
// En computadora (parlantes integrados o externos, auriculares), 0.4 se percibe demasiado bajo; con 0.85 recupera
// presencia, volumen y pegada en los clics, los efectos de las cartas y la música de batalla.
const PERFIL_AUDIO = {
    movil: {
        volumenGeneral: 0.4,
        volumenTeclas: 0.15,
    },
    escritorio: {
        volumenGeneral: 0.85,
        volumenTeclas: 0.20,
    },
};

function esDispositivoMovil() {
    if (typeof window === 'undefined') return false;
    return PANTALLA_DE_CELULAR.matches || 
           (typeof navigator !== 'undefined' && (
               (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024) ||
               /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
           ));
}

function perfilAudioActual() {
    return esDispositivoMovil() ? PERFIL_AUDIO.movil : PERFIL_AUDIO.escritorio;
}

function obtenerVolumenGeneral() {
    return perfilAudioActual().volumenGeneral;
}

const audioGuardado = leerAudioGuardado();
let silenciado = audioGuardado.sinSonido;
let vibracionApagada = audioGuardado.sinVibracion;
let salidaGeneral = null; // el "volumen maestro" de Web Audio: todos los sonidos sintetizados pasan por acá antes de salir

// A dónde se conecta cada sonido sintetizado (en vez de directo a los parlantes): así un solo control los silencia a todos
function destinoDeAudio(contexto) {
    if (!salidaGeneral || salidaGeneral.context !== contexto) {
        salidaGeneral = contexto.createGain();
        salidaGeneral.gain.value = silenciado ? 0 : obtenerVolumenGeneral();
        salidaGeneral.connect(contexto.destination);
    }
    return salidaGeneral;
}

// Deja todo como corresponde: Web Audio por el volumen maestro y los archivos de audio con "muted", que sigue
// reproduciéndolos (en silencio) y así los tiempos del combate no cambian. Si se quitó la vibración, corta la que esté en marcha
function aplicarSilencio() {
    const vol = obtenerVolumenGeneral();
    if (salidaGeneral) {
        // Bajada rapidísima en vez de un corte seco, para que no suene un "clic" al silenciar
        salidaGeneral.gain.setTargetAtTime(silenciado ? 0 : vol, salidaGeneral.context.currentTime, 0.01);
    }
    actualizarVolumenAudios();
    [audioMouse, winMusic, battleMusic, winSound, audioPajita].forEach(audio => { if (audio) audio.muted = silenciado; });
    if (vibracionApagada) {
        try { navigator.vibrate?.(0); } catch (error) { /* nada que cortar */ }
    }
}

function actualizarVolumenesSegunDispositivo() {
    const perfil = perfilAudioActual();
    if (salidaGeneral && !silenciado) {
        salidaGeneral.gain.setTargetAtTime(perfil.volumenGeneral, salidaGeneral.context.currentTime, 0.02);
    }
    if (nodoVolumenTeclas) {
        nodoVolumenTeclas.gain.value = perfil.volumenTeclas;
    }
    actualizarVolumenAudios();
}

// En qué paso está el botón: "todo" (sonido y vibración), "vibracion" (solo vibración) o "nada"
function modoDelAudio() {
    if (!silenciado) return 'todo';
    return VIBRACION_DISPONIBLE && !vibracionApagada ? 'vibracion' : 'nada';
}

// El paso al que lleva el próximo toque (sin cambiar nada todavía): el toque da el aviso de ese paso, no del actual
function modoSiguienteDelAudio() {
    const modo = modoDelAudio();
    if (modo === 'todo') return VIBRACION_DISPONIBLE ? 'vibracion' : 'nada';
    return modo === 'vibracion' ? 'nada' : 'todo';
}

// Cada toque pasa al paso siguiente
function pasarAlSiguienteModoDelAudio() {
    const modo = modoDelAudio();
    if (modo === 'todo') {
        silenciado = true;               // 1 → 2: se va el sonido, la vibración sigue
    } else if (modo === 'vibracion') {
        vibracionApagada = true;         // 2 → 3: se va también la vibración
    } else {
        silenciado = false;              // 3 → 1 (o, sin vibración, de silenciado a sonando): vuelve todo
        vibracionApagada = false;
    }
}

// La ayuda de cada paso (título y aria-label): dice cómo está y qué pasa al tocar
const AYUDA_DEL_AUDIO = VIBRACION_DISPONIBLE
    ? { todo: 'audio.todo', vibracion: 'audio.vibracion', nada: 'audio.nada' }
    : { todo: 'audio.silenciar', nada: 'audio.activar' };

function mostrarEstadoDelAudio() {
    const boton = document.getElementById('silenciar');
    if (!boton) return;
    const modo = modoDelAudio();
    const ayuda = t(AYUDA_DEL_AUDIO[modo]);
    boton.dataset.modo = modo;                       // el ícono: parlante con ondas, celular que vibra o parlante con cruz
    boton.classList.toggle('silenciado', silenciado); // el botón "hundido" mientras no suena
    boton.title = ayuda;
    boton.setAttribute('aria-label', ayuda);
}

// En celular el botón no vive en la barra ni en el menú ☰: flota en la esquina de abajo a la derecha (lo dibuja el CSS cuando el botón
// es hijo directo del <body>). Acá se lo cambia de lugar según el ancho de la pantalla: en celular al <body>, en computadora
// de vuelta junto al selector de idioma. Es el mismo botón siempre, así que conserva su estado y sus eventos.
function ubicarBotonDeAudio() {
    const boton = document.getElementById('silenciar');
    const ajustes = document.querySelector('#navbar .ajustes');
    if (!boton || !ajustes) return;
    const enCelular = PANTALLA_DE_CELULAR.matches;
    const destino = enCelular ? document.body : ajustes;
    const refInclinacion = ajustes.querySelector('#inclinacion-invertida, [data-hueco="inclinacion-invertida"]');

    if (!enCelular) {
        // En computadora debe estar en ajustes y SIEMPRE a la izquierda del botón de inclinación
        if (boton.parentElement === ajustes && (!refInclinacion || boton.nextElementSibling === refInclinacion)) return;
        const teniaElFoco = document.activeElement === boton;
        if (refInclinacion) {
            ajustes.insertBefore(boton, refInclinacion);
        } else {
            ajustes.append(boton);
        }
        if (teniaElFoco) boton.focus({ preventScroll: true });
        return;
    }

    if (boton.parentElement === destino) return;
    const teniaElFoco = document.activeElement === boton;
    destino.append(boton);
    if (teniaElFoco) boton.focus({ preventScroll: true });
}

// Aviso del botón (en celular y en computadora, una única vez por sesión): cuando suena el primer sonido de la visita —una tecla, el giro de una
// carta, el zoom, lo que sea— el botón salta y lanza ondas, para que la persona vea que ahí puede apagar el sonido.
// No se repite al recargar (la marca queda en sessionStorage). Solo cuenta un sonido que de verdad se oye: si el sonido está apagado (porque la
// persona lo apagó con el botón antes del primer sonido, o ya lo traía apagado), no se hace en ningún momento mientras siga apagado; si lo
// vuelve a activar, el primer sonido que suene sí lo hace (y desde ahí, ya no se repite), sin contar la tecla del propio toque que lo activó.
const AUDIO_AVISO_SESION = 'digimon-audio-aviso';
const AUDIO_AVISO_DURACION = 2600; // ms: un poco más que la animación del CSS (2,4 s)

function leerMarcaDelAviso() {
    try {
        return sessionStorage.getItem(AUDIO_AVISO_SESION) === '1';
    } catch (error) {
        return false;
    }
}

let botonDeAudioYaMostrado = leerMarcaDelAviso();

function marcarBotonDeAudioMostrado() {
    botonDeAudioYaMostrado = true;
    try {
        sessionStorage.setItem(AUDIO_AVISO_SESION, '1');
    } catch (error) {
        // Sin sessionStorage la marca vale solo mientras no se recargue la página
    }
}

// -----------------------------------------------------------------------------------------------------------------
// LLAMADA DE LOS BOTONES REDONDOS (sonido e inclinación): cuando el botón salta y lanza ondas ("llamando"), de él sale un globito con una
// flechita (como el del contador de cartas elegidas) que cuenta para qué sirve. Mientras dura, en computadora el botón tiene que verse y
// poder tocarse aunque haya algo encima de la barra: el zoom de una carta, un cartel del combate o uno de información (todos son una cortina
// oscura y desenfocada por encima de ella). Si lo hay, el botón sale un momento de la barra y queda por encima de la cortina, en el mismo
// lugar de la pantalla (en la barra se deja un hueco del mismo tamaño para que nada se corra); al terminar, vuelve a su lugar. No importa
// cuándo aparezca la cortina: se mira cuadro a cuadro mientras dura la llamada. En celular el botón de sonido ya flota por encima de todo
// y el de inclinación no existe, así que ahí solo está el globito.
// -----------------------------------------------------------------------------------------------------------------
let combateEnCurso = false; // desde que se aprieta "Iniciar Combate" hasta que se cierra el último cartel (lo maneja iniciarCombate)

const GLOBO_DEL_BOTON_DURACION = 7000; // ms a la vista (el de inclinación elige el suyo: explica más)
const GLOBO_DEL_BOTON_DURACION_DOBLE = 16000; // ms: si coinciden dos carteles (ej. sonido e inclinación al voltear), más tiempo para leer ambos

// ¿Hay algo por encima de la barra? El zoom de una carta (#zoom-fondo) o un cartel de SweetAlert (los del combate y los de información)
const hayCortinaSobreLaBarra = () => !!(cartaEnZoom || combateEnCurso || document.querySelector('#zoom-fondo, .swal2-container'));

// Saca el botón de la barra y lo deja por encima de la cortina. Devuelve la función que lo vuelve a su lugar.
function subirBotonSobreLaCortina(boton) {
    const caja = boton.getBoundingClientRect();
    const teniaElFoco = document.activeElement === boton;
    const computed = getComputedStyle(boton);
    const hueco = document.createElement('span');
    hueco.setAttribute('aria-hidden', 'true');
    hueco.dataset.hueco = boton.id; // (el CSS de la barra lo cuenta como si el botón siguiera ahí)
    hueco.style.cssText = `flex: none; width: ${caja.width}px; height: ${caja.height}px; margin: ${computed.margin}; order: ${computed.order};`;
    boton.parentElement.insertBefore(hueco, boton);
    document.body.append(boton);
    if (teniaElFoco) boton.focus({ preventScroll: true });
    // Mientras está afuera acompaña al hueco cuadro a cuadro: si la barra se acomoda (por ejemplo, termina de cargar), no se despega
    let cuadro;
    const acompañar = () => {
        if (!hueco.isConnected) return;
        const lugar = hueco.getBoundingClientRect();
        boton.style.top = `${lugar.top}px`;
        boton.style.left = `${lugar.left}px`;
        cuadro = requestAnimationFrame(acompañar);
    };
    acompañar();
    return () => {
        cancelAnimationFrame(cuadro);
        const tieneElFoco = document.activeElement === boton;
        if (hueco.isConnected) {
            hueco.replaceWith(boton);
        } else {
            if (boton.id === 'silenciar') ubicarBotonDeAudio();
        }
        boton.style.removeProperty('top');
        boton.style.removeProperty('left');
        if (tieneElFoco) boton.focus({ preventScroll: true });
    };
}

const llamadasActivas = new Map(); // botón → { globo, devolver, temporizador }: los botones que están llamando la atención ahora
let vigiliaDeLlamadas = 0;         // pedido de animationFrame pendiente

// Dónde va el globito: debajo del botón si está en la mitad de arriba de la pantalla (la barra) y arriba de él si está en la de abajo (el botón de
// sonido flotante del celular), con la flechita justo sobre el botón (el globito se corre para no salirse de la pantalla).
// "lado" dice cómo se acomoda respecto del botón: 'centro' (lo normal: centrado en él), o, cuando los dos botones redondos llaman a la vez
// y sus globitos se taparían, 'izquierda' (el globito se extiende hacia la izquierda, con la flechita en su punta derecha) y 'derecha'
// (al revés): así caben los dos uno al lado del otro, cada uno con la flechita sobre su botón.
// (La caja del botón se mide por su centro y su tamaño de reposo: mientras llama se agranda y se mueve, y el globito no tiene que bailar con él.)
const GLOBO_PUNTA_AL_BORDE = 15; // px entre la flechita y el borde del globito cuando se acomoda a un costado

function ubicarGloboDelBoton(boton, globo, lado = 'centro') {
    const margen = 8;
    const caja = boton.getBoundingClientRect();
    const ancho = globo.offsetWidth;
    const alto = globo.offsetHeight;
    const centro = caja.left + caja.width / 2;
    const centroVertical = caja.top + caja.height / 2;
    const mitadDelAlto = boton.offsetHeight / 2;
    let izquierda = centro - ancho / 2;
    if (lado === 'izquierda') izquierda = centro + GLOBO_PUNTA_AL_BORDE - ancho;
    else if (lado === 'derecha') izquierda = centro - GLOBO_PUNTA_AL_BORDE;
    izquierda = Math.round(Math.max(margen, Math.min(izquierda, window.innerWidth - ancho - margen)));
    const debajo = centroVertical < window.innerHeight / 2;
    const arriba = Math.round(debajo ? centroVertical + mitadDelAlto + 12 : centroVertical - mitadDelAlto - 12 - alto);
    const punta = `${Math.round(centro - izquierda)}px`;
    if (globo.style.left !== `${izquierda}px`) globo.style.left = `${izquierda}px`;
    if (globo.style.top !== `${arriba}px`) globo.style.top = `${arriba}px`;
    if (globo.style.getPropertyValue('--punta') !== punta) globo.style.setProperty('--punta', punta);
    globo.classList.toggle('sobre-el-boton', !debajo);
}

function revisarLlamadas() {
    const tapada = hayCortinaSobreLaBarra();
    for (const [boton, llamada] of llamadasActivas) {
        if (!boton.isConnected) {
            terminarLlamada(boton);
            continue;
        }
        // Algo tapa la barra (o apareció justo ahora): el botón sube por encima. Solo si está en la barra: en celular, el de sonido ya flota
        if (!llamada.devolver && boton.parentElement !== document.body && tapada) {
            llamada.devolver = subirBotonSobreLaCortina(boton);
        } else if (llamada.devolver && !tapada) {
            // Se cerró la cortina (el zoom o el cartel): el botón vuelve inmediatamente a su lugar en la barra
            llamada.devolver();
            llamada.devolver = null;
        }
    }
    // Si los dos botones llaman a la vez, los globitos se reparten a los costados (el del botón de la izquierda hacia la izquierda y el otro
    // hacia la derecha) para no taparse; si no, cada uno va centrado en su botón
    const llamadas = [...llamadasActivas];
    if (llamadas.length > 1) llamadas.sort(([a], [b]) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    llamadas.forEach(([boton, llamada], i) => {
        ubicarGloboDelBoton(boton, llamada.globo, llamadas.length < 2 ? 'centro' : i === 0 ? 'izquierda' : 'derecha');
    });
}

function vigilarLlamadas() {
    vigiliaDeLlamadas = 0;
    revisarLlamadas();
    if (llamadasActivas.size) vigiliaDeLlamadas = requestAnimationFrame(vigilarLlamadas);
}

function escribirGloboDelBoton(llamada) {
    llamada.globo.querySelector('.aviso-texto').textContent = llamada.texto();
}

// El botón salta y lanza ondas (animación "llamando", 2,6 s) y sale el globito: "icono" va antes del texto y "texto" es una función que
// devuelve la explicación en el idioma de ahora. El globito (y el botón arriba de la cortina, si hace falta) dura "duracion" ms.
function llamarLaAtencion(boton, { icono, texto, duracion = GLOBO_DEL_BOTON_DURACION }) {
    terminarLlamada(boton);

    const globo = document.createElement('div');
    globo.className = 'aviso-globo';
    globo.setAttribute('role', 'status');
    globo.innerHTML = '<span class="aviso-icono" aria-hidden="true"></span><span class="aviso-texto"></span>';
    globo.querySelector('.aviso-icono').textContent = icono;
    document.body.appendChild(globo);

    const llamada = { globo, texto, devolver: null, temporizador: 0, finDeLaAnimacion: 0 };
    llamadasActivas.set(boton, llamada);
    escribirGloboDelBoton(llamada);
    revisarLlamadas(); // (si ya hay una cortina, el botón sube ahora mismo, antes de que se dibuje el siguiente cuadro)

    boton.classList.remove('llamando');
    void boton.offsetWidth; // para que la animación arranque de cero
    boton.classList.add('llamando');
    llamada.finDeLaAnimacion = setTimeout(() => boton.classList.remove('llamando'), AUDIO_AVISO_DURACION);
    llamada.temporizador = setTimeout(() => terminarLlamada(boton), Math.max(duracion, AUDIO_AVISO_DURACION));

    // Si coinciden dos o más carteles a la vez (por ejemplo, el primer sonido de la sesión es voltear una carta,
    // disparando a la vez el aviso de silenciar y el de tilt/shift), dejamos ambos carteles más tiempo para darle al usuario tiempo de leer ambos
    if (llamadasActivas.size > 1) {
        for (const [b, l] of llamadasActivas) {
            clearTimeout(l.temporizador);
            l.temporizador = setTimeout(() => terminarLlamada(b), GLOBO_DEL_BOTON_DURACION_DOBLE);
        }
    }

    void globo.offsetWidth; // para que la entrada se anime
    globo.classList.add('visible');
    if (!vigiliaDeLlamadas) vigiliaDeLlamadas = requestAnimationFrame(vigilarLlamadas);
}

// Termina la llamada del botón (se cumplió el tiempo, o la persona ya lo encontró): se apaga la animación, el globito se achica hacia el
// botón y, si estaba por encima de una cortina, vuelve a la barra
function terminarLlamada(boton) {
    const llamada = llamadasActivas.get(boton);
    if (!llamada) return;
    llamadasActivas.delete(boton);
    clearTimeout(llamada.temporizador);
    clearTimeout(llamada.finDeLaAnimacion);
    boton.classList.remove('llamando');
    llamada.devolver?.();
    llamada.globo.classList.remove('visible');
    setTimeout(() => llamada.globo.remove(), 500);
}

document.addEventListener('idioma-cambiado', () => llamadasActivas.forEach(escribirGloboDelBoton));

const botonDeAudio = () => document.getElementById('silenciar');
const terminarElAvisoDelBotonDeAudio = () => {
    const boton = botonDeAudio();
    if (boton) terminarLlamada(boton);
};

let teclaDelBotonDeAudio = false; // true mientras suena una tecla que no cuenta como primer sonido: la del propio botón de sonido al volver a activarlo y la del botón de inclinación (ver sonarTeclaDeBoton)

function llamarLaAtencionDelBotonDeAudio() {
    if (botonDeAudioYaMostrado || silenciado || teclaDelBotonDeAudio) return;
    const boton = botonDeAudio();
    if (!boton) return;
    marcarBotonDeAudioMostrado();
    llamarLaAtencion(boton, { icono: '🔊', texto: () => t(VIBRACION_DISPONIBLE ? 'aviso.audio.vibracion' : 'aviso.audio') });
}

function activarBotonDeAudio() {
    const boton = document.getElementById('silenciar');
    if (!boton) return;
    ubicarBotonDeAudio();
    PANTALLA_DE_CELULAR.addEventListener('change', () => {
        ubicarBotonDeAudio();
        actualizarVolumenesSegunDispositivo();
    });
    mostrarEstadoDelAudio();
    boton.addEventListener('click', () => {
        terminarElAvisoDelBotonDeAudio();
        pasarAlSiguienteModoDelAudio();
        guardarAudio();
        aplicarSilencio();
        mostrarEstadoDelAudio();
        // Este botón no suena al apretarlo (activarSonidoBotones lo deja afuera): quien lo toca para apagar el sonido no quiere oír nada.
        // Solo cuando el toque vuelve a activar el sonido suena la tecla, un instante después, cuando el volumen ya subió
        // Esa tecla no cuenta como el primer sonido del aviso del botón (no tiene sentido avisarle a quien lo está tocando): el aviso queda
        // para el primer sonido que suene después
        if (modoDelAudio() === 'todo') {
            const tecla = (bajada) => {
                teclaDelBotonDeAudio = true;
                sonidoTecla(bajada);
                teclaDelBotonDeAudio = false;
            };
            setTimeout(() => tecla(true), 30);
            setTimeout(() => tecla(false), 110);
        }
    });
    // Si se cambia el idioma, la ayuda del botón se vuelve a escribir en el idioma nuevo
    document.addEventListener('idioma-cambiado', mostrarEstadoDelAudio);
}

function obtenerContextoAudio() {
    contextoAudio = contextoAudio || new (window.AudioContext || window.webkitAudioContext)();
    destinoDeAudio(contextoAudio);
    if (contextoAudio.state === 'suspended') {
        contextoAudio.resume();
    }
    llamarLaAtencionDelBotonDeAudio(); // el primer sonido de la visita (si no hay silencio) le llama la atención al botón de sonido
    return contextoAudio;
}

// ---- Tecla de teclado mecánico ------------------------------------------------------------------------------------
// Una tecla real suena a tres cosas juntas: un "clic" agudo (el mecanismo), un golpe seco (la tecla llegando al fondo)
// y un "thock" grave que resuena en la carcasa. Al soltar hay otro clic, más suave y más agudo.
const ruidosPorContexto = new WeakMap();

// Un poco de ruido blanco (se reutiliza en cada pulsación)
function obtenerRuido(contexto) {
    if (!ruidosPorContexto.has(contexto)) {
        const largo = Math.floor(contexto.sampleRate * 0.15);
        const buffer = contexto.createBuffer(1, largo, contexto.sampleRate);
        const datos = buffer.getChannelData(0);
        for (let i = 0; i < largo; i++) {
            datos[i] = Math.random() * 2 - 1;
        }
        ruidosPorContexto.set(contexto, buffer);
    }
    return ruidosPorContexto.get(contexto);
}

// Volumen de las teclas: se adapta según el perfil de audio (celular vs escritorio).
// GANANCIA_TECLAS empuja el sonido contra ese tope (más ganancia = suena más "lleno" y más fuerte, pero también más comprimido).
const GANANCIA_TECLAS = 0.85;
let salidaTeclas;
let nodoVolumenTeclas;

// Salida común de las teclas. Cadena: compresor (suaviza los golpes fuertes) -> ganancia -> saturador suave (tanh) -> volumen.
// El saturador redondea los picos en vez de cortarlos, así se puede subir el volumen sin que suene rota.
function crearSalidaTeclas(contexto) {
    const compresor = contexto.createDynamicsCompressor();
    compresor.threshold.value = -18;
    compresor.knee.value = 10;
    compresor.ratio.value = 8;
    compresor.attack.value = 0.001;
    compresor.release.value = 0.08;

    const ganancia = contexto.createGain();
    ganancia.gain.value = GANANCIA_TECLAS;

    const saturador = contexto.createWaveShaper();
    const curva = new Float32Array(1024);
    for (let i = 0; i < curva.length; i++) {
        const x = (i / (curva.length - 1)) * 2 - 1;
        curva[i] = Math.tanh(2 * x) / Math.tanh(2);
    }
    saturador.curve = curva;
    saturador.oversample = '2x';

    nodoVolumenTeclas = contexto.createGain();
    nodoVolumenTeclas.gain.value = perfilAudioActual().volumenTeclas;

    compresor.connect(ganancia);
    ganancia.connect(saturador);
    saturador.connect(nodoVolumenTeclas);
    nodoVolumenTeclas.connect(destinoDeAudio(contexto));
    return compresor;
}

// Las dos "teclas": la de siempre (barra, filtros y menús) y la de todos los botones de la carta (info, ataques y evolución),
// que es la misma pero un toque más bajita de volumen y más aguda de tono (fuerza: multiplica el volumen; tono: multiplica la afinación)
const TECLA_NORMAL = { fuerza: 1, tono: 1 };
const TECLA_DE_CARTA = { fuerza: 0.65, tono: 1.25 };

// Arma una pulsación (bajada = true) o el soltar la tecla (bajada = false) en el instante t
function armarTecla(contexto, destino, t, bajada, tecla = TECLA_NORMAL) {
    const fuerza = (bajada ? 1 : 0.45) * tecla.fuerza;
    // Cada pulsación suena apenas distinta, como pasa con una tecla de verdad
    const afinacion = (0.94 + Math.random() * 0.12) * tecla.tono;

    // Ráfaga corta de ruido filtrado: es el "clic"
    const chasquido = (retraso, frecuencia, q, pico, duracion) => {
        const inicio = t + retraso;
        const fuente = contexto.createBufferSource();
        fuente.buffer = obtenerRuido(contexto);
        const filtro = contexto.createBiquadFilter();
        filtro.type = 'bandpass';
        filtro.frequency.value = frecuencia * afinacion;
        filtro.Q.value = q;
        const volumen = contexto.createGain();
        volumen.gain.setValueAtTime(0.0001, inicio);
        volumen.gain.exponentialRampToValueAtTime(pico * fuerza, inicio + 0.001);
        volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
        fuente.connect(filtro);
        filtro.connect(volumen);
        volumen.connect(destino);
        fuente.start(inicio, Math.random() * 0.05);
        fuente.stop(inicio + duracion + 0.01);
    };

    // Tono que cae rápido: es el golpe y el "thock" grave
    const golpe = (retraso, tipo, desde, hasta, pico, duracion) => {
        const inicio = t + retraso;
        const oscilador = contexto.createOscillator();
        oscilador.type = tipo;
        oscilador.frequency.setValueAtTime(desde * afinacion, inicio);
        oscilador.frequency.exponentialRampToValueAtTime(hasta * afinacion, inicio + duracion * 0.6);
        const volumen = contexto.createGain();
        volumen.gain.setValueAtTime(0.0001, inicio);
        volumen.gain.exponentialRampToValueAtTime(pico * fuerza, inicio + 0.002);
        volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
        oscilador.connect(volumen);
        volumen.connect(destino);
        oscilador.start(inicio);
        oscilador.stop(inicio + duracion + 0.01);
    };

    if (bajada) {
        chasquido(0, 3000, 1.1, 5.4, 0.03);              // clic agudo del mecanismo
        chasquido(0.004, 1300, 0.8, 3.6, 0.055);         // la tecla llega al fondo
        golpe(0.002, 'triangle', 380, 170, 0.17, 0.12);  // "thock" de la carcasa
        golpe(0, 'sine', 2400, 2100, 0.085, 0.02);       // toque de plástico
    } else {
        chasquido(0, 4400, 1.5, 5.4, 0.025);             // clic suave y agudo del resorte al volver
        golpe(0, 'triangle', 420, 240, 0.3, 0.05);
    }
}

// Suena la tecla apretada (bajada = true) o soltada (bajada = false)
function sonidoTecla(bajada = true, tecla = TECLA_NORMAL) {
    try {
        const contexto = obtenerContextoAudio();
        salidaTeclas = salidaTeclas || crearSalidaTeclas(contexto);
        armarTecla(contexto, salidaTeclas, contexto.currentTime, bajada, tecla);
    } catch (error) {
        // Si el navegador no permite audio, simplemente no suena
    }
}

// El toquecito de una carta que se apoya (al terminar de girar y al volver a su lugar desde el zoom): un roce seco de papel,
// muy bajito y casi sin cuerpo grave. Una carta casi no pesa: no es un golpe sobre la mesa.
function toqueDeCarta(contexto, llegada) {
    const toque = contexto.createBufferSource();
    toque.buffer = obtenerRuido(contexto);
    const filtroToque = contexto.createBiquadFilter();
    filtroToque.type = 'bandpass';
    filtroToque.frequency.value = 2200;
    filtroToque.Q.value = 1;
    const volumenToque = contexto.createGain();
    volumenToque.gain.setValueAtTime(0.0001, llegada);
    volumenToque.gain.exponentialRampToValueAtTime(0.09, llegada + 0.002);
    volumenToque.gain.exponentialRampToValueAtTime(0.0001, llegada + 0.04);
    toque.connect(filtroToque);
    filtroToque.connect(volumenToque);
    volumenToque.connect(destinoDeAudio(contexto));
    toque.start(llegada, Math.random() * 0.05);
    toque.stop(llegada + 0.06);

    const cuerpo = contexto.createOscillator();
    const volumenCuerpo = contexto.createGain();
    cuerpo.type = 'sine';
    cuerpo.frequency.setValueAtTime(200, llegada);
    cuerpo.frequency.exponentialRampToValueAtTime(120, llegada + 0.05);
    volumenCuerpo.gain.setValueAtTime(0.0001, llegada);
    volumenCuerpo.gain.exponentialRampToValueAtTime(0.035, llegada + 0.003);
    volumenCuerpo.gain.exponentialRampToValueAtTime(0.0001, llegada + 0.06);
    cuerpo.connect(volumenCuerpo);
    volumenCuerpo.connect(destinoDeAudio(contexto));
    cuerpo.start(llegada);
    cuerpo.stop(llegada + 0.07);
}

// Al elegir una carta para el combate y al sacarla de la selección: dos toquecitos secos, breves y suaves, de la familia del "tuc" con el que
// termina de darse vuelta una carta (un roce de papel con un poquito de cuerpo), pero más cortos y más bajitos. Al elegirla suena un "tuc" algo más
// grave (la carta se apoya); al sacarla, un "tic" más agudo y más flojo (se levanta). En el celular cada uno viene con una vibración chiquita,
// más corta al sacarla (ver el clic de las cartas en agregarCarta).
function sonidoSeleccion(elegida) {
    try {
        const contexto = obtenerContextoAudio();
        const inicio = contexto.currentTime;
        const destino = destinoDeAudio(contexto);
        // [frecuencia del roce, volumen del roce, tono del cuerpo al empezar y al terminar, volumen del cuerpo, duración del roce]
        const [frecuencia, volumenRoce, desde, hasta, volumenCuerpo, duracion] = elegida
            ? [2000, 0.07, 210, 130, 0.028, 0.035]
            : [3200, 0.04, 330, 240, 0.015, 0.025];

        const roce = contexto.createBufferSource();
        roce.buffer = obtenerRuido(contexto);
        const filtro = contexto.createBiquadFilter();
        filtro.type = 'bandpass';
        filtro.frequency.value = frecuencia;
        filtro.Q.value = 1;
        const volumenDelRoce = contexto.createGain();
        volumenDelRoce.gain.setValueAtTime(0.0001, inicio);
        volumenDelRoce.gain.exponentialRampToValueAtTime(volumenRoce, inicio + 0.002);
        volumenDelRoce.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
        roce.connect(filtro);
        filtro.connect(volumenDelRoce);
        volumenDelRoce.connect(destino);
        roce.start(inicio, Math.random() * 0.05);
        roce.stop(inicio + duracion + 0.02);

        const cuerpo = contexto.createOscillator();
        cuerpo.type = 'sine';
        cuerpo.frequency.setValueAtTime(desde, inicio);
        cuerpo.frequency.exponentialRampToValueAtTime(hasta, inicio + duracion * 1.3);
        const volumenDelCuerpo = contexto.createGain();
        volumenDelCuerpo.gain.setValueAtTime(0.0001, inicio);
        volumenDelCuerpo.gain.exponentialRampToValueAtTime(volumenCuerpo, inicio + 0.003);
        volumenDelCuerpo.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion * 1.4);
        cuerpo.connect(volumenDelCuerpo);
        volumenDelCuerpo.connect(destino);
        cuerpo.start(inicio);
        cuerpo.stop(inicio + duracion * 1.4 + 0.02);
    } catch (error) {
        // Si el navegador no permite audio, simplemente no suena
    }
}

// Carta que se da vuelta: un "fshh" de papel cortando el aire mientras gira y, al terminar, el toquecito de apoyarse
function sonidoVuelta() {
    try {
        const contexto = obtenerContextoAudio();
        const t = contexto.currentTime;

        // Ruido blanco filtrado: el filtro sube de tono durante la primera mitad del giro y baja en la segunda
        const largo = Math.floor(contexto.sampleRate * 0.6);
        const buffer = contexto.createBuffer(1, largo, contexto.sampleRate);
        const datos = buffer.getChannelData(0);
        for (let i = 0; i < largo; i++) {
            datos[i] = Math.random() * 2 - 1;
        }
        const ruido = contexto.createBufferSource();
        ruido.buffer = buffer;

        const banda = contexto.createBiquadFilter();
        banda.type = 'bandpass';
        banda.Q.value = 0.9;
        banda.frequency.setValueAtTime(700, t);
        banda.frequency.exponentialRampToValueAtTime(3200, t + 0.23);
        banda.frequency.exponentialRampToValueAtTime(900, t + 0.46);

        const agudos = contexto.createBiquadFilter();
        agudos.type = 'highpass';
        agudos.frequency.value = 400;

        const volumenRuido = contexto.createGain();
        volumenRuido.gain.setValueAtTime(0.0001, t);
        volumenRuido.gain.exponentialRampToValueAtTime(0.22, t + 0.11);
        volumenRuido.gain.exponentialRampToValueAtTime(0.05, t + 0.24);
        volumenRuido.gain.exponentialRampToValueAtTime(0.13, t + 0.34);
        volumenRuido.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

        ruido.connect(banda);
        banda.connect(agudos);
        agudos.connect(volumenRuido);
        volumenRuido.connect(destinoDeAudio(contexto));
        ruido.start(t);
        ruido.stop(t + 0.55);

        toqueDeCarta(contexto, t + 0.46); // el roce final cuando termina de girar
    } catch (error) {
        // Si el navegador no permite audio, simplemente no suena
    }
}

// Zoom de la carta: el "fwip" de una carta de cartulina movida en el aire (aire filtrado con un aleteo rápido, como el de
// una carta que se agita). Al abrir sube de tono y suena solo eso; al cerrar baja de tono y, cuando la carta vuelve a su
// lugar, se apoya con el toquecito de siempre. Es sutil.
function sonidoZoom(abrir) {
    try {
        const contexto = obtenerContextoAudio();
        const ahora = contexto.currentTime;
        const afinacion = 0.94 + Math.random() * 0.12; // cada vez suena apenas distinto, como una carta de verdad
        const duracion = abrir ? 0.34 : 0.28;

        // El aire: ruido filtrado que barre hacia arriba (al abrir) o hacia abajo (al cerrar)
        const ruido = contexto.createBufferSource();
        ruido.buffer = obtenerRuido(contexto);
        ruido.loop = true;

        const agudos = contexto.createBiquadFilter();
        agudos.type = 'highpass';
        agudos.frequency.value = 700;

        const banda = contexto.createBiquadFilter();
        banda.type = 'bandpass';
        banda.Q.value = 0.8;
        banda.frequency.setValueAtTime((abrir ? 1400 : 3600) * afinacion, ahora);
        banda.frequency.exponentialRampToValueAtTime((abrir ? 3800 : 1500) * afinacion, ahora + duracion);

        // El aleteo: el volumen sube y baja unas 28 veces por segundo, como la cartulina vibrando
        const aleteo = contexto.createGain();
        aleteo.gain.value = 0.55;
        const oscilador = contexto.createOscillator();
        oscilador.type = 'sine';
        oscilador.frequency.value = 28 * afinacion;
        const profundidad = contexto.createGain();
        profundidad.gain.value = 0.45;
        oscilador.connect(profundidad);
        profundidad.connect(aleteo.gain);

        const volumen = contexto.createGain();
        volumen.gain.setValueAtTime(0.0001, ahora);
        volumen.gain.exponentialRampToValueAtTime(abrir ? 0.28 : 0.2, ahora + duracion * 0.35);
        volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + duracion);

        ruido.connect(agudos);
        agudos.connect(banda);
        banda.connect(aleteo);
        aleteo.connect(volumen);
        volumen.connect(destinoDeAudio(contexto));
        ruido.start(ahora);
        oscilador.start(ahora);
        ruido.stop(ahora + duracion + 0.02);
        oscilador.stop(ahora + duracion + 0.02);

        // Al abrir la carta queda "en la mano": no hay ningún golpe. Solo al cerrar, cuando vuelve a su lugar, se apoya
        // con el mismo toquecito que al terminar de dar vuelta la carta
        if (!abrir) toqueDeCarta(contexto, ahora + 0.44);
    } catch (error) {
        // Si el navegador no permite audio, simplemente no suena
    }
}

// Sonido de tecla al tocar los botones de la barra de arriba, los menús de información y los filtros. Los botones "⚔️ Ataques" y
// "🧬 Evolución" del reverso de las cartas suenan igual, pero con la tecla de las cartas (un poco más bajita y más aguda).
// Suena al apretar (se siente inmediato y no lo corta el reload del botón de niveles) y, si se llegó a apretar, también al soltar.
// El teclado dispara solo 'click': ahí suenan las dos cosas seguidas.
// (La vibración en el celular la maneja activarVibracion: vale para todos los botones, también los del reverso de las cartas.)
// El botón de sonido (#silenciar) es la excepción en las dos cosas: no suena ni vibra al apretarlo sino según a dónde lleva el toque
// (ver activarBotonDeAudio y activarVibracion): apagar el sonido no hace ruido y apagar la vibración no vibra.
// El botón de inclinación (#inclinacion-invertida) suena como los demás de la barra, con una excepción: su tecla no cuenta como el primer
// sonido de la visita, así que no dispara el aviso del botón de sonido (ese aviso queda para el primer sonido que suene después).
const ZONAS_CON_SONIDO = '#navbar, #filtros, #f-vacio'; // (#silenciar queda afuera aunque esté dentro de la barra)
const BOTONES_DE_CARTA = '#listado-digimons .c-botones';
const TECLA_SIN_AVISO = { ...TECLA_NORMAL, sinAviso: true }; // la misma tecla de la barra, pero que no le llama la atención al botón de sonido

// Suena la tecla; si es de las que no cuentan como primer sonido, se avisa mientras suena (llamarLaAtencionDelBotonDeAudio mira esa marca)
function sonarTeclaDeBoton(bajada, tecla) {
    if (!tecla.sinAviso) {
        sonidoTecla(bajada, tecla);
        return;
    }
    teclaDelBotonDeAudio = true;
    try {
        sonidoTecla(bajada, tecla);
    } finally {
        teclaDelBotonDeAudio = false;
    }
}

function activarSonidoBotones() {
    let apretado = null; // la tecla que está apretada (para soltarla igual), o null
    // Qué tecla suena al tocar este botón (null: ninguna)
    const teclaDe = (evento) => {
        const boton = evento.target.closest('button, [role="button"]');
        if (!boton || boton.disabled) return null;
        if (boton.id === 'silenciar') return null; // el botón de sonido tiene su propio criterio (ver activarBotonDeAudio)
        if (boton.id === 'inclinacion-invertida') return TECLA_SIN_AVISO;
        // El botón de hacer flip de la carta no debe hacer sonido
        if (boton.closest('.c-flip')) return null;
        // Todos los botones de la carta (los de info: gema, nivel, tipo, elemento; y los de ataque y evolución):
        // suenan todos con la tecla de cartas (un toque más agudo y bajo)
        if (boton.closest('.c-gema, .c-nivel, .c-tipo, .c-elem, .c-ataques, .c-evo, .c-botones') || boton.closest('#listado-digimons li')) {
            return TECLA_DE_CARTA;
        }
        if (boton.closest(ZONAS_CON_SONIDO) || boton.closest('.swal2-popup')) return TECLA_NORMAL;
        return null;
    };
    document.addEventListener('pointerdown', (evento) => {
        if (evento.pointerType === 'mouse' && evento.button !== 0) return; // solo el botón izquierdo
        const tecla = teclaDe(evento);
        if (tecla) {
            apretado = tecla;
            sonarTeclaDeBoton(true, tecla);
        }
    });
    // Se escucha en toda la página: se puede soltar el mouse fuera del botón
    document.addEventListener('pointerup', () => {
        if (apretado) {
            const tecla = apretado;
            apretado = null;
            sonarTeclaDeBoton(false, tecla);
        }
    });
    document.addEventListener('pointercancel', () => {
        apretado = null;
    });
    // (En la fase de captura: los botones del reverso de las cartas cortan la propagación del clic y, si no, no se llegaría a oír)
    document.addEventListener('click', (evento) => {
        const tecla = evento.detail === 0 ? teclaDe(evento) : null; // clic hecho con el teclado (Enter o Espacio)
        if (tecla) {
            sonarTeclaDeBoton(true, tecla);
            setTimeout(() => sonarTeclaDeBoton(false, tecla), 80);
        }
    }, true);
}

// Con Shift apretada, el navegador convierte la rueda del mouse en desplazamiento HORIZONTAL; como la página no se desplaza hacia los costados,
// no pasaba nada: con Shift (que anula la inclinación de las cartas) no se podía subir ni bajar. Acá la rueda con Shift se vuelve vertical.
// Se hace después de que el resto de los manejadores de la rueda tuvo su turno (setTimeout), para respetar a los que frenan el fondo (el zoom
// de una carta, los carteles del combate): si alguno la frenó, no se toca. Si debajo del puntero hay una zona que sí se desplaza hacia los
// costados (por ejemplo, un árbol de evolución ancho), se deja al navegador; si hay una zona con scroll vertical propio, se desplaza ella.
function activarRuedaConShift() {
    const desplazaEn = (elemento, eje) => {
        const estilo = getComputedStyle(elemento);
        const valor = eje === 'x' ? estilo.overflowX : estilo.overflowY;
        if (valor !== 'auto' && valor !== 'scroll') return false;
        return eje === 'x' ? elemento.scrollWidth > elemento.clientWidth + 1 : elemento.scrollHeight > elemento.clientHeight + 1;
    };

    window.addEventListener('wheel', (evento) => {
        if (!evento.shiftKey || evento.ctrlKey || evento.altKey || evento.metaKey) return;
        const unidad = evento.deltaMode === 1 ? 33 : evento.deltaMode === 2 ? 800 : 1; // (algunos navegadores cuentan en líneas o en páginas)
        const delta = (evento.deltaY || evento.deltaX) * unidad; // (según el navegador, el valor llega en deltaY o en deltaX)
        if (!delta) return;
        const destino = evento.target;
        setTimeout(() => {
            if (evento.defaultPrevented || !destino.isConnected) return;
            let vertical = null;
            for (let el = destino instanceof Element ? destino : destino.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
                if (desplazaEn(el, 'x')) return; // ahí Shift + rueda ya se desplaza hacia los costados
                if (!vertical && desplazaEn(el, 'y')) vertical = el;
            }
            const raiz = document.documentElement;
            if (!vertical && raiz.scrollWidth > raiz.clientWidth + 1) return; // la página sí se desplaza hacia los costados
            (vertical ?? window).scrollBy({ top: delta, behavior: 'auto' });
        }, 0);
    }, { passive: true });
}

// Al hacer clic en un botón con el mouse (en especial con la tecla Shift mantenida, por ejemplo al usar la rueda con Shift),
// los botones no deben retener el aro de foco (:focus-visible) ni iniciar una selección de texto accidental.
// Con la navegación por teclado (Tab, Enter, Espacio) la accesibilidad y el foco visible siguen funcionando con total normalidad.
function evitarFocoYSeleccionConShift() {
    document.addEventListener('mousedown', (evento) => {
        const boton = evento.target.closest('button, [role="button"]');
        if (!boton) return;
        if (evento.shiftKey) {
            evento.preventDefault();
            window.getSelection?.()?.removeAllRanges?.();
        }
    });

    document.addEventListener('click', (evento) => {
        const boton = evento.target.closest('button, [role="button"]');
        if (!boton) return;
        if (evento.detail > 0 || evento.shiftKey) {
            if (document.activeElement === boton || boton.contains(document.activeElement)) {
                boton.blur();
            }
            if (evento.shiftKey) {
                window.getSelection?.()?.removeAllRanges?.();
            }
        }
    }, true);
}

// Al hacer clic en el nivel (la gema o el nombre), tipo o elemento de una carta, se abre su ventana de información (info.js)
// sin seleccionar la carta para el combate ni cerrarla si está en modo zoom.
function activarCartelesDeInfoEnCartas() {
    document.addEventListener('click', (evento) => {
        // 1. Tipo
        const chipTipo = evento.target.closest?.('#listado-digimons li .c-tipo');
        if (chipTipo) {
            const carta = chipTipo.closest('#listado-digimons li');
            if (carta?.dataset.tipo) {
                evento.stopPropagation();
                document.dispatchEvent(new CustomEvent('click-chip-carta', { detail: { tipo: carta.dataset.tipo } }));
                if (typeof window.infoTipo === 'function') window.infoTipo(carta.dataset.tipo);
                return;
            }
        }

        // 2. Elemento
        const chipElem = evento.target.closest?.('#listado-digimons li .c-elem');
        if (chipElem) {
            const carta = chipElem.closest('#listado-digimons li');
            if (carta?.dataset.elemento) {
                evento.stopPropagation();
                document.dispatchEvent(new CustomEvent('click-chip-carta', { detail: { elemento: carta.dataset.elemento } }));
                if (typeof window.infoElemento === 'function') window.infoElemento(carta.dataset.elemento);
                return;
            }
        }

        // 3. Nivel (gema o texto del nivel)
        const nivelTarget = evento.target.closest?.('#listado-digimons li .c-gema, #listado-digimons li .c-nivel');
        if (nivelTarget) {
            const carta = nivelTarget.closest('#listado-digimons li');
            if (carta?.dataset.nivelApi) {
                evento.stopPropagation();
                document.dispatchEvent(new CustomEvent('click-chip-carta', { detail: { nivel: carta.dataset.nivelApi } }));
                if (typeof window.infoNivel === 'function') window.infoNivel(carta.dataset.nivelApi);
                return;
            }
        }

        // 4. Ataques del dorso
        const btnAtaques = evento.target.closest?.('#listado-digimons li .c-ataques');
        if (btnAtaques) {
            const carta = btnAtaques.closest('#listado-digimons li');
            if (carta && typeof window.abrirAtaques === 'function') {
                evento.stopPropagation();
                window.abrirAtaques(carta);
                return;
            }
        }

        // 5. Evolución del dorso
        const btnEvo = evento.target.closest?.('#listado-digimons li .c-evo');
        if (btnEvo) {
            const carta = btnEvo.closest('#listado-digimons li');
            if (carta && typeof window.abrirEvolucion === 'function') {
                evento.stopPropagation();
                window.abrirEvolucion(carta);
                return;
            }
        }
    }, true);

    // Accesibilidad por teclado: Enter o Espacio sobre la gema, el nivel, los chips o los botones del dorso activa el clic
    document.addEventListener('keydown', (evento) => {
        if (evento.key !== 'Enter' && evento.key !== ' ') return;
        const boton = evento.target.closest?.('#listado-digimons li .c-gema, #listado-digimons li .c-nivel, #listado-digimons li .c-tipo, #listado-digimons li .c-elem, #listado-digimons li .c-ataques, #listado-digimons li .c-evo');
        if (!boton) return;
        evento.preventDefault();
        boton.click();
    });
}

activarInclinacion();
activarRuedaConShift();
evitarFocoYSeleccionConShift();
activarCartelesDeInfoEnCartas();
activarZoom();
activarArrastreDeZoomExtra();
activarReflejoQuieto();
activarAvisosDeAyuda();
activarAvisoDeInclinacion(); // después de los avisos de ayuda: usa el contador de visitas que ellos cuentan
activarAvisoDeZoomExtra();   // (este también)
gestionarVisitasYFlechasMovil();
activarVoltearConDedo();
activarSonidoBotones();
activarBotonDeAudio();
activarVibracion();

// Las cartas de nivel 7 y 8 tienen un marco que gira. Si giran todas a la vez (hasta las que están lejos), la página se
// pone lenta: por eso solo giran las que están en pantalla. Esto les pone o les saca la clase "en-pantalla" (la usa el CSS).
const observadorDeMarcos = 'IntersectionObserver' in window
    ? new IntersectionObserver(entradas => {
        entradas.forEach(entrada => entrada.target.classList.toggle('en-pantalla', entrada.isIntersecting));
    }, { rootMargin: '150px' })
    : null;

// Crea una carta, la agrega a la lista y avisa a los filtros. La usan los digimons de la API y las cartas propias.
function agregarCarta({ id, etiquetaId, nombre, imagen, tipo, nivelOriginal, marca, elemento, datosDorso }) {
    // Datos que usa el combate y el diseño de la carta
    const nivelNumerico = numeracionNiveles[nivelOriginal]; // undefined si el nivel es desconocido
    const { nombre: nombreEnCarta, xAntibody } = separarXAntibody(nombre); // el X-Antibody va en su propia gema

    // ---Creación de la lista con el DOM---
    const elementoLista = document.createElement('li');

    // Guardamos los datos en la propia carta (data-tipo, data-nivel y data-elemento).
    // El tipo y el elemento van en español porque el combate y los filtros los usan como identificadores;
    // data-nivel-api es el nivel tal cual lo trae la API (no depende del idioma ni del sistema de clasificación).
    elementoLista.dataset.id = id;
    elementoLista.dataset.tipo = tipo;
    elementoLista.dataset.elemento = elemento;
    elementoLista.dataset.nivelApi = nivelOriginal;
    elementoLista.dataset.nombreApi = nombreEnCarta; // el nombre original; el que se ve sale de acá según el idioma (escribirNombre)
    if (xAntibody) {
        elementoLista.dataset.xAntibody = 'true';
    }
    const datosMarca = MARCAS_DE_NIVEL[marca]; // undefined si no es Armor ni Hybrid
    if (datosMarca) {
        elementoLista.dataset.marca = datosMarca.nombre;
    }
    if (nivelNumerico !== undefined) {
        elementoLista.dataset.nivel = nivelNumerico;
        elementoLista.style.setProperty('--nivel', nivelNumerico); // el CSS lo usa para la intensidad del color
    }

    // Creamos la "carta" del digimon. Los textos que cambian con el idioma (nivel, tipo, elemento, "NV"...) los pone
    // traducirCarta(); el nombre lo pone ponerNombre para separar lo que va entre paréntesis.
    elementoLista.innerHTML = `
        ${nivelNumerico >= 7 ? '<span class="c-marco" aria-hidden="true"></span>' : ''}
        <span class="c-puente" aria-hidden="true"></span>
        <div class="c-frente">
            <div class="c-cab"><h4></h4></div>
            <div class="c-arte">
                <img src="${imagen}" alt="" loading="lazy" decoding="async">
                ${xAntibody ? '<span class="c-x" title="X-Antibody">X</span>' : ''}
                ${datosMarca ? `<span class="c-marca" title="${datosMarca.nombre}" role="img" aria-label="${datosMarca.nombre}">${datosMarca.letra}</span>` : ''}
                <span class="c-gema" role="button" tabindex="0"><small></small>${nivelNumerico ?? '?'}</span>
            </div>
            <div class="c-sub"><span class="c-nivel" role="button" tabindex="0"></span><span>#${etiquetaId ?? String(id).padStart(3, '0')}</span></div>
            <div class="c-chips">
                <span class="chip c-tipo" role="button" tabindex="0"></span>
                <span class="chip c-elem" role="button" tabindex="0"></span>
            </div>
        </div>
        <button class="c-flip" type="button">↻</button>`;
    escribirNombre(elementoLista);
    traducirCarta(elementoLista);

    // Datos para el dorso de la carta (ya los tenemos, no hace falta volver a pedirlos a la API)
    elementoLista.datosDorso = datosDorso;

    // El botón de dar vuelta la carta no la selecciona para el combate
    // Con el mouse el botón no toma el foco: si no, al hacer clic (sobre todo con Shift apretada: el navegador lo toma como un clic "de teclado")
    // quedaba resaltado con el aro de foco y a la vista hasta hacer clic en otro lado. Con el teclado (Tab y Enter o Espacio) sigue andando igual.
    const botonVoltear = elementoLista.querySelector('.c-flip');
    botonVoltear.addEventListener('mousedown', (evento) => evento.preventDefault());
    botonVoltear.addEventListener('click', (evento) => {
        evento.stopPropagation();
        if (evento.detail > 0) botonVoltear.blur(); // (clic de mouse o de dedo; el de teclado trae detail 0)
        voltearCarta(elementoLista);
    });

    // Agregamos el manejador de eventos al <li>
    elementoLista.addEventListener('click', (evento) => {
        if (cartaEnZoom) return; // con la carta en grande, un clic no la elige para el combate
        if (evento.target.closest('button, [role="button"]')) return; // botones y chips de la carta no la seleccionan para el combate
        // Si este clic es el primero de un doble clic, el zoom deshace lo que haga (ver activarZoom)
        if (evento.detail <= 1) seleccionAntesDelClic = { carta: elementoLista, estado: seleccionados.slice() };
        elementoLista.classList.toggle('seleccionado');

        // Al elegirla suena un "tuc" y al sacarla de la selección un "tic" más suave; en el celular también vibra un instante, menos al sacarla
        // (con el mouse no vibra). El segundo clic de un doble clic no suena: ese doble clic abre el zoom y la selección se deshace (ver activarZoom).
        const sonar = evento.detail <= 1;
        if (elementoLista.classList.contains('seleccionado')) {
            if (sonar) {
                sonidoSeleccion(true);
                if (evento.pointerType !== 'mouse') vibrar(10);
            }
            if (seleccionados.length < 2) {
                seleccionados.push(elementoLista);
            } else {
                const elementoAntiguo = seleccionados.shift();
                elementoAntiguo.classList.toggle('seleccionado');
                seleccionados.push(elementoLista);
            }
        } else {
            if (sonar) {
                sonidoSeleccion(false);
                if (evento.pointerType !== 'mouse') vibrar(5); // al sacarla vibra todavía menos que al elegirla
            }
            const index = seleccionados.indexOf(elementoLista);
            if (index > -1) {
                seleccionados.splice(index, 1);
            }
        }
        // Llamar a la función para verificar y actualizar el botón
        verificarSeleccion();
    });

    // La carta espera un ratito y entra a la lista junto con las que lleguen mientras tanto (ver colocarCartas)
    cartasEnEspera.push({ carta: elementoLista, conMarco: nivelNumerico >= 7 });
    if (!colocacionPendiente) colocacionPendiente = setTimeout(colocarCartas, COLOCAR_CADA);
}

// Mientras carga la página, las cartas no entran a la lista de a una: cada carta nueva obligaba a redibujar la lista,
// los filtros y la barra de progreso, y en el celular eso tenía el procesador siempre ocupado (los botones tardaban en
// responder o se perdían toques). Ahora se juntan y entran todas juntas unas pocas veces por segundo.
const COLOCAR_CADA = 300; // ms entre tandas
const cartasEnEspera = [];
let colocacionPendiente = 0;

function colocarCartas() {
    clearTimeout(colocacionPendiente);
    colocacionPendiente = 0;
    if (!cartasEnEspera.length) return;
    const tanda = cartasEnEspera.splice(0);

    // Agregamos los <li> a la lista de Digimons (<ul>), todos de una vez
    listaDigimons.append(...tanda.map(({ carta }) => carta));
    for (const { carta, conMarco } of tanda) {
        ajustarNombre(carta); // ya está en la página: ahora se puede medir su nombre
        if (conMarco) observadorDeMarcos?.observe(carta); // su marco gira solo mientras se ve

        // Avisamos que hay una carta nueva (los filtros la cuentan y, si corresponde, la esconden)
        document.dispatchEvent(new CustomEvent('carta-agregada', { detail: { carta } }));
    }
    actualizarBarraProgreso(contadorDigimons);
}

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

// Función para crear la lista de Digimons
async function crearListaDeDigimons() {
    try {
        // Obtenemos el array de Digimons
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

        // Recorremos toda la lista de Digimons
        for (const [indice, digimon] of digimons.entries()) {
            // Obtenemos los detalles de cada Digimon
            pedirMas();
            const detalles = await pedidos[indice];
            pedidos[indice] = null;
            if (!detalles) { // si la API falló con este, seguimos con los demás (antes se cortaba toda la carga)
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
        console.error('Error al crear la lista de Digimons:', error);
    }
}

// Cambiar de sistema de niveles NO recarga la página: se escribe de nuevo el nombre de cada nivel donde aparece.
// Las cartas lo hacen acá; los filtros (filtros.js), los menús (info.js) y la línea evolutiva (evolucion.js) escuchan el mismo aviso.
botonCambiarNiveles.addEventListener('click', () => {
    clasificacionAlternativa = !clasificacionAlternativa;
    try {
        sessionStorage.setItem('clasificacionAlternativa', String(clasificacionAlternativa));
    } catch (error) {
        // si no se puede guardar, igual cambia mientras la página esté abierta
    }
    mostrarSistemaDeNiveles();
    document.dispatchEvent(new CustomEvent('niveles-cambiados'));
});

document.addEventListener('niveles-cambiados', () => {
    listaDigimons.querySelectorAll(':scope > li').forEach(carta => {
        carta.querySelector('.c-nivel').textContent = nombreNivel(carta.dataset.nivelApi);
    });
});

// -----------------------------------------------------------------------------------------------------------------

// Función para iniciar el combate
// -----------------------------------------------------------------------------------------------------------------
// CARTELES DEL COMBATE: tres ventanas seguidas (preparando → peleando → ganador) con el mismo aspecto: una barra de título
// brillante, una "pantallita" (estilo Digivice) con el GIF y, abajo, el VS con las dos cartas que pelean (sus propias
// imágenes y nombres). Al ganador se lo festeja con corona y confeti. Los estilos están en el SCSS (".combate-popup").
// -----------------------------------------------------------------------------------------------------------------
const CARTEL_COMBATE = {
    width: 'min(94vw, 680px)',
    padding: 0,
    buttonsStyling: false,
    customClass: {
        container: 'combate-contenedor',
        popup: 'combate-popup',
        title: 'combate-titulo',
        htmlContainer: 'combate-cuerpo',
        confirmButton: 'combate-boton',
        closeButton: 'combate-cerrar',
    },
    showClass: { popup: 'animate__animated animate__zoomIn animate__faster' },
    hideClass: { popup: 'animate__animated animate__fadeOut animate__faster' },
    backdrop: 'rgba(6, 28, 90, 0.6)',
};

// Cada fase: el ícono del título, el GIF de la pantallita (con su proporción real, ancho / alto, para que se vea entero:
// en el de "preparando" la mano que usa la compu está abajo) y lo que va entre las dos cartas
const FASES_COMBATE = {
    preparando: { icono: '🛠️', gif: './img/Trabajando.gif', proporcion: '540 / 405', centro: 'VS' },
    peleando: { icono: '⚔️', gif: './img/Peleando.gif', proporcion: '1366 / 768', centro: '💥' },
    ganador: { icono: '🏆', gif: './img/Festejando.gif', proporcion: '474 / 290', centro: '🎉' },
};

// Un ataque al azar de la carta (o null si no tiene). Si algunos traen descripción, se elige entre esos, para que se pueda contar qué hace
function elegirAtaque(carta) {
    const todos = carta.datosDorso?.habilidades || [];
    const conTexto = todos.filter(habilidad => habilidad.descripcion);
    const opciones = conTexto.length ? conTexto : todos;
    return opciones.length ? opciones[Math.floor(Math.random() * opciones.length)] : null;
}

// El recuadro de un luchador en la pelea: "⚔️ Agumon usa Baby Flame" y, debajo, qué hace ese ataque
function crearAtaqueEnPelea(carta, ataque, i) {
    const caja = document.createElement('div');
    caja.className = `vs-ataque vs-${i + 1}`;
    caja.style.setProperty('--c', getComputedStyle(carta.querySelector('.c-arte')).borderTopColor); // el color de su carta

    const linea = document.createElement('p');
    linea.className = 'vs-ataque-linea';
    const luchador = document.createElement('b');
    luchador.textContent = nombreCompleto(carta);
    const nombre = document.createElement('em');
    nombre.textContent = ataque.nombre;
    linea.append('⚔️ ', luchador, ` ${t('combate.usa')} `, nombre);
    caja.append(linea);

    if (ataque.descripcion) {
        const descripcion = document.createElement('p');
        descripcion.className = 'vs-ataque-desc';
        descripcion.textContent = ataque.descripcion;
        descripcion.title = ataque.descripcion; // por si es tan larga que se corta
        caja.append(descripcion);
    }
    return caja;
}

// El cuerpo de la ventana: la pantallita con el GIF y el VS. "indiceGanador" (0 o 1) solo se usa en la última fase.
// "ataques" (uno por carta, o null) solo se usa en la pelea: debajo del VS se cuenta qué ataque usa cada una.
// Se arma con nodos (y no con texto HTML) porque los nombres vienen de la API.
// "conGif" en false deja la pantallita sin imagen: el GIF lo pone después arrancarGifConSorbo, justo con el sonido
function crearCuerpoCartel(fase, cartas, indiceGanador = -1, conGif = true, ataques = null) {
    const datos = FASES_COMBATE[fase];
    const escena = document.createElement('div');
    escena.className = `combate-escena fase-${fase}`;

    const pantalla = document.createElement('div');
    pantalla.className = 'combate-pantalla';
    pantalla.style.setProperty('--proporcion', datos.proporcion);
    const gif = document.createElement('img');
    if (conGif) gif.src = datos.gif;
    gif.alt = '';
    pantalla.append(gif);

    const vs = document.createElement('div');
    vs.className = 'combate-vs';
    const centro = document.createElement('span');
    centro.className = 'vs-centro';
    centro.setAttribute('aria-hidden', 'true');
    centro.textContent = datos.centro;

    const luchadores = cartas.map((carta, i) => {
        const nombre = nombreCompleto(carta);
        const figura = document.createElement('figure');
        figura.className = `vs-luchador vs-${i + 1}`;
        if (indiceGanador >= 0) figura.classList.add(i === indiceGanador ? 'ganador' : 'perdedor');
        figura.style.setProperty('--c', getComputedStyle(carta.querySelector('.c-arte')).borderTopColor); // el color de su carta

        const imagen = document.createElement('img');
        const origen = carta.querySelector('.c-arte img');
        imagen.src = origen?.currentSrc || origen?.src || '';
        imagen.alt = nombre;

        const leyenda = document.createElement('figcaption');
        leyenda.textContent = nombre;
        figura.append(imagen, leyenda);
        return figura;
    });

    vs.append(luchadores[0], centro, luchadores[1]);
    escena.append(pantalla, vs);

    if (fase === 'peleando' && ataques?.some(Boolean)) {
        const recuadros = document.createElement('div');
        recuadros.className = 'combate-ataques';
        ataques.forEach((ataque, i) => {
            if (ataque) recuadros.append(crearAtaqueEnPelea(cartas[i], ataque, i));
        });
        escena.append(recuadros);
    }
    return escena;
}

// Confeti de colores que cae por la ventana del ganador (sin librerías: cada papelito es un <i> animado)
function lanzarConfeti(ventana) {
    if (reducirMovimiento || !ventana) return;
    const colores = ['#ff5fa2', '#ffd85f', '#5fffb0', '#5fc8ff', '#b55fff', '#ff8a3d'];
    const capa = document.createElement('div');
    capa.className = 'combate-confeti';
    ventana.append(capa);
    const alto = ventana.getBoundingClientRect().height;
    for (let i = 0; i < 48; i++) {
        const papel = document.createElement('i');
        papel.style.left = `${Math.random() * 100}%`;
        papel.style.background = colores[i % colores.length];
        capa.append(papel);
        const lado = (Math.random() - 0.5) * 140;
        papel.animate(
            [
                { transform: 'translate(0, -24px) rotate(0deg)', opacity: 1 },
                { transform: `translate(${lado}px, ${alto + 30}px) rotate(${Math.round(Math.random() * 900 - 450)}deg)`, opacity: 1 },
            ],
            { duration: 1600 + Math.random() * 1800, delay: Math.random() * 600, easing: 'cubic-bezier(0.25, 0.6, 0.4, 1)', fill: 'both' }
        );
    }
    setTimeout(() => capa.remove(), 4600);
}

// Hace que algo (un sonido, el confeti) pase recién cuando el cartel terminó de aparecer, y no antes: entre el clic en
// "Aceptar" y el cartel siguiente pasa un rato (se va el anterior y entra el nuevo), y el sonido salía en medio de ese hueco.
// Devuelve una función para cancelarlo (si el cartel se cierra antes de terminar de aparecer, no tiene que sonar).
function cuandoAparece(ventana, accion) {
    let pendiente = true;
    const cancelar = () => {
        pendiente = false;
        clearTimeout(plazo);
        ventana.removeEventListener('animationend', alTerminar);
    };
    const alTerminar = (evento) => {
        if (evento.target !== ventana) return; // las animaciones de adentro del cartel también avisan; solo vale la de la ventana
        if (pendiente) accion();
        cancelar();
    };
    const plazo = setTimeout(() => alTerminar({ target: ventana }), 900); // por si la animación de entrada no llega a correr
    ventana.addEventListener('animationend', alTerminar);
    return cancelar;
}

// Mientras dura el combate la página de atrás queda quieta (igual que con el zoom de una carta): ni rueda, ni dedo, ni teclas.
// Lo único que se puede mover es el propio cartel cuando no entra entero en la pantalla (por ejemplo, un celular acostado).
const frenarRuedaDelCombate = (evento) => {
    if (!zonaConScroll(evento.target, evento.deltaY, '.combate-contenedor')) evento.preventDefault();
};

const frenarToqueDelCombate = (evento) => {
    if (!zonaConScroll(evento.target, 0, '.combate-contenedor') && evento.cancelable) evento.preventDefault();
};

const frenarTeclasDelCombate = (evento) => {
    if (!TECLAS_DE_DESPLAZAMIENTO.includes(evento.key)) return;
    if (evento.key === ' ' && evento.target.closest?.('button, a, input, textarea, select')) return; // el espacio sobre un botón lo aprieta, no desplaza
    const contenedor = document.querySelector('.combate-contenedor');
    if (contenedor && contenedor.scrollHeight > contenedor.clientHeight) return; // el cartel no entra entero: las teclas lo desplazan a él
    evento.preventDefault();
};

function bloquearFondoDelCombate(bloquear) {
    const accion = bloquear ? 'addEventListener' : 'removeEventListener';
    window[accion]('wheel', frenarRuedaDelCombate, { passive: false });
    window[accion]('touchmove', frenarToqueDelCombate, { passive: false });
    window[accion]('keydown', frenarTeclasDelCombate, true);
}

// Abre uno de los carteles del combate. Devuelve true si tocaron "Aceptar" (se sigue con el próximo cartel) y false si lo anularon:
// con la cruz de arriba a la derecha, tocando afuera o con Esc (ahí el combate se corta y no se muestran los que faltan)
const CRUZ_ANULAR = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg>';

async function abrirCartelDeCombate({ didOpen, ...opciones }) {
    const respuesta = await Swal.fire({
        ...CARTEL_COMBATE,
        showCloseButton: true,
        closeButtonHtml: CRUZ_ANULAR,
        closeButtonAriaLabel: t('combate.anular'),
        confirmButtonText: t('aceptar'),
        ...opciones,
        didOpen: (ventana) => {
            bloquearFondoDelCombate(true); // queda activo hasta que termina todo el combate (así no hay hueco entre un cartel y el siguiente)
            ventana.querySelector('.swal2-close')?.setAttribute('title', t('combate.anular'));
            didOpen?.(ventana);
        }
    });
    return respuesta.isConfirmed;
}

async function iniciarCombate() {
    combateEnCurso = true; // (las llamadas de los botones lo miran: si el primer sonido es el de "Iniciar Combate", el botón tiene que verse por encima del cartel)
    revisarLlamadas(); // si la llamada del botón ya arrancó con el clic de la tecla, el botón sube ahora mismo
    try {
        await correrCombate();
    } finally {
        combateEnCurso = false;
        bloquearFondoDelCombate(false); // el combate terminó (o se anuló): la página vuelve a poder desplazarse
        setTimeout(() => mostrarAvisoDelContador(), AVISO_CONTADOR_ESPERA); // la primera vez de la sesión, cuenta para qué sirve el contador
    }
}

async function correrCombate() {

    console.log("--- Variables de los digimons seleccionados para el combate 👇 ---")

    // Leemos los datos de cada carta seleccionada (nombre, tipo, nivel y elemento)
    const luchador1 = leerLuchador(seleccionados[0]);
    const luchador2 = leerLuchador(seleccionados[1]);
    console.log(luchador1)
    console.log(luchador2)
    console.log("----------------------------------------------------------------------")

    const ganador = determinarGanador(luchador1, luchador2);
    const cartas = [seleccionados[0], seleccionados[1]]; // las dos cartas que pelean (para mostrarlas en los carteles)
    const ataques = cartas.map(elegirAtaque); // el ataque que usa cada una en la pelea (es solo ambientación: el resultado ya está decidido)
    const indiceGanador = ganador === luchador1.nombre ? 0 : 1;

    // Cuadros de animación
    let anulado = false; // true si en un cartel tocaron la cruz, afuera o Esc: el combate se corta ahí
    try {
        reproducirSonido(audioMouse)
        // El sorbo de la pajita arranca junto con el GIF (ver sincronizarPajita). Si no se puede (por ejemplo, abriendo el
        // archivo sin servidor), queda el plan B: el sonido se repite al mismo ritmo, pero sin alinearlo con el GIF
        const pajita = await prepararPajita();
        if (!pajita) reproducirPajita();
        const aceptado = await abrirCartelDeCombate({
            title: `${FASES_COMBATE.preparando.icono} ${t('combate.preparando')}`,
            html: crearCuerpoCartel('preparando', cartas, -1, !pajita),
            didOpen: (ventana) => { if (pajita) arrancarGifConSorbo(ventana, pajita); }
        });
        anulado = !aceptado;
        detenerSonido(audioMouse); // Detiene el sonido después de que se cierra la primera ventana
        detenerSonidoPajita();
    } catch (error) {
        detenerSonido(audioMouse); // Asegura que el sonido se detenga en caso de error
        detenerSonidoPajita();
    }
    if (anulado) return;

    // La música de la pelea y la del ganador salen recién cuando su cartel terminó de aparecer (ver cuandoAparece)
    let cancelarSonido = () => {};
    try {
        const aceptado = await abrirCartelDeCombate({
            title: `${FASES_COMBATE.peleando.icono} ${t('combate.peleando')}`,
            html: crearCuerpoCartel('peleando', cartas, -1, true, ataques),
            didOpen: (ventana) => { cancelarSonido = cuandoAparece(ventana, () => reproducirSonido(battleMusic)); }
        });
        anulado = !aceptado;
        cancelarSonido();
        detenerSonido(battleMusic);
    } catch (error) {
        cancelarSonido();
        detenerSonido(battleMusic);
    }
    if (anulado) return;

    try {
        dialogoAbierto = true; // Marca que el diálogo está abierto
        await abrirCartelDeCombate({
            title: `${FASES_COMBATE.ganador.icono} ${t('combate.ganador', { nombre: ganador })}`,
            html: crearCuerpoCartel('ganador', cartas, indiceGanador),
            didOpen: (ventana) => {
                cancelarSonido = cuandoAparece(ventana, () => {
                    reproducirSonido(winSound);
                    reproducirConDelay(); // Llama a la función con delay para reproducir winMusic
                    lanzarConfeti(ventana);
                });
            }
        });
        dialogoAbierto = false; // Marca que el diálogo está cerrado
        cancelarSonido();
        detenerSonido(winMusic);
    } catch (error) {
        dialogoAbierto = false; // Asegura que el diálogo esté cerrado en caso de error
        cancelarSonido();
        detenerSonido(winMusic);
    }
}

// Función para leer los datos de una carta (los guardamos en el data-tipo, data-nivel y data-elemento)
function leerLuchador(carta) {
    return {
        nombre: nombreCompleto(carta),
        tipo: carta.dataset.tipo,
        nivel: carta.dataset.nivel !== undefined ? Number(carta.dataset.nivel) : null, // null si el nivel es desconocido
        elemento: carta.dataset.elemento,
    };
}

// Probabilidad (de 0 a 1) de que gane el primer luchador, considerando nivel, tipo y elemento
function calcularProbabilidad(luchador1, luchador2) {

    console.log("--- Cálculos del combate 👇 ---")

    // Punto de partida: pelea pareja
    const probabilidadBase = 0.5;
    console.log("Probabilidad base del primer digimon 👇")
    console.log(probabilidadBase)

    // Ajuste por niveles (si a alguno le falta el nivel, no se ajusta nada). Cuenta el poder en combate, no el número de la carta
    const hayNiveles = luchador1.nivel !== null && luchador2.nivel !== null;
    const diferenciaDeNivel = hayNiveles ? poderEnCombate(luchador1.nivel) - poderEnCombate(luchador2.nivel) : 0;
    const ajusteNivel = diferenciaDeNivel * PESO_NIVEL;
    console.log("Diferencia de nivel 👇")
    console.log(diferenciaDeNivel)
    console.log("Ajuste por nivel 👇")
    console.log(ajusteNivel)

    // Contra un nivel 7 u 8 con el rival muy por debajo, el tipo y el elemento valen menos (1 = valen todo)
    const brecha = Math.abs(diferenciaDeNivel);
    const hayNivelAlto = hayNiveles && Math.max(luchador1.nivel, luchador2.nivel) >= 7;
    const valorVentajas = hayNivelAlto && brecha > ALCANCE_VENTAJAS ? ALCANCE_VENTAJAS / brecha : 1;
    console.log("Cuánto valen el tipo y el elemento (1 = todo) 👇")
    console.log(valorVentajas)

    // Ajuste por tipo: +1 si el tipo 1 es fuerte contra el tipo 2, -1 si es débil, 0 si están parejos
    const ventajaTipo = calcularVentaja(TIPO_FUERTE_CONTRA, luchador1.tipo, luchador2.tipo);
    const ajusteTipo = ventajaTipo * PESO_TIPO * valorVentajas;
    console.log("Ventaja de tipo (+1 a favor, -1 en contra) 👇")
    console.log(ventajaTipo)
    console.log("Ajuste por tipo 👇")
    console.log(ajusteTipo)

    // Ajuste por elemento: +1 a favor, -1 en contra, 0 si están parejos (o alguno es Neutro)
    const ventajaElemento = calcularVentaja(ELEMENTO_FUERTE_CONTRA, luchador1.elemento, luchador2.elemento);
    const ajusteElemento = ventajaElemento * PESO_ELEMENTO * valorVentajas;
    console.log("Ventaja de elemento (+1 a favor, -1 en contra) 👇")
    console.log(ventajaElemento)
    console.log("Ajuste por elemento 👇")
    console.log(ajusteElemento)

    // Sumamos todo y nos aseguramos de que la probabilidad esté entre 0 y 1 (redondeada a 2 decimales)
    const suma = probabilidadBase + ajusteTipo + ajusteNivel + ajusteElemento;
    return Math.min(1, Math.max(0, Number(suma.toFixed(2))));
}

// Función para determinar el ganador considerando tipo, nivel y elemento
function determinarGanador(luchador1, luchador2) {
    const probabilidadAjustada = calcularProbabilidad(luchador1, luchador2);
    console.log("El N° aleatorio debe ser inferior a este 👇 para ganar")
    console.log(probabilidadAjustada)

    // Generación de resultado aleatorio
    const random = Math.random();
    console.log("Número aleatorio 👇")
    console.log(random)
    console.log("----------------------------------------------------------------------")

    if (random < probabilidadAjustada) {
        return luchador1.nombre;
    } else {
        return luchador2.nombre;
    }
}

// Agregar evento al botón de iniciar combate
botonIniciarCombate.addEventListener('click', iniciarCombate);

// ------------------------------------------------------------------------------------------------------

// Audios

// Cada archivo suena a volumen maestro por su nivel relativo. La música de combate es el archivo más fuerte de todos
// (pico al máximo), así que lleva el recorte más grande; la de victoria y el sonido de victoria, un poco menos.
const LISTA_AUDIOS = [];

const audioConVolumen = (archivo, relativo = 1) => {
    const audio = new Audio(archivo);
    LISTA_AUDIOS.push({ audio, relativo });
    audio.volume = Math.min(1, obtenerVolumenGeneral() * relativo);
    return audio;
};

function actualizarVolumenAudios() {
    const base = obtenerVolumenGeneral();
    for (const { audio, relativo } of LISTA_AUDIOS) {
        if (audio) {
            audio.volume = Math.min(1, base * relativo);
        }
    }
}

const audioMouse = audioConVolumen('audio/Mouse.mp3');
audioMouse.loop = true;

const winMusic = audioConVolumen('audio/Digimon World 3 - Victory.mp3', 0.7);

const battleMusic = audioConVolumen('audio/Digimon World - Earlygame Battle.mp3', 0.5);
battleMusic.loop = true;

const winSound = audioConVolumen('audio/Digimon World - PSX Battle Win.mp3', 0.7);

const audioPajita = audioConVolumen('audio/Pajita.mp3');
let intervaloSonido;

aplicarSilencio(); // si la persona había dejado el sonido apagado, los archivos de audio arrancan en silencio

function reproducirSonido(audio) {
    audio.play();
}

function detenerSonido(audio) {
    audio.pause();
    audio.currentTime = 0; 
}

// -----------------------------------------------------------------------------------------------------------------
// SORBO DE LA PAJITA, sincronizado con el GIF "Trabajando" (el chico que toma de la pajita mientras usa la compu).
// Un <audio> con setInterval se desfasa: tarda un tiempo variable en arrancar y el GIF dura 1560 ms por vuelta (no 1500).
// Por eso: (1) se baja el GIF y el sonido de antemano, (2) cada vez que se abre el cartel se le da al GIF una dirección
// nueva (así empieza desde el cuadro 0, en un momento que conocemos) y (3) los sorbos se programan con Web Audio, que
// es preciso, a partir de ese momento: uno al comienzo de cada vuelta.
// -----------------------------------------------------------------------------------------------------------------
const PAJITA = {
    gif: './img/Trabajando.gif',
    audio: 'audio/Pajita.mp3',
    vuelta: 1560,  // ms que dura una vuelta del GIF (22 cuadros)
    sorbo: 700,    // ms que dura el sorbo: en los cuadros 0 a 9 el chico tiene la pajita en la boca
    ajuste: 0,     // ms para correr el sonido si en tu compu lo sentís desfasado: negativo = antes, positivo = después
};

let descargasPajita = null; // promesa con el GIF y el sonido ya bajados ({ gif, audio }), o null si no se pudo
let bufferPajita = null;
let temporizadorPajita = null;
let direccionGifPajita = null;
const sorbosSonando = new Set();

// Baja el GIF y el sonido una sola vez (se pide al elegir la primera carta, así ya están cuando empieza el combate)
function precargarPajita() {
    descargasPajita ||= Promise.all([
        fetch(PAJITA.gif).then(r => r.ok ? r.blob() : Promise.reject(new Error(r.status))),
        fetch(PAJITA.audio).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))),
    ]).then(([gif, audio]) => ({ gif, audio })).catch(() => null);
    return descargasPajita;
}

// Deja listo el sorbo. Se llama desde el clic de "Iniciar Combate" (sin un clic el navegador no deja sonar el audio)
async function prepararPajita() {
    try {
        const ctx = obtenerContextoAudio(); // el mismo contexto de Web Audio que usan los sonidos de las cartas
        await ctx.resume();
        if (ctx.state !== 'running') return null;
        // Si todavía no se bajó, se espera un poco; si tarda demasiado, se sigue sin sincronizar
        const descargas = await Promise.race([precargarPajita(), new Promise(resolver => setTimeout(resolver, 2500, null))]);
        if (!descargas) return null;
        bufferPajita ||= await ctx.decodeAudioData(descargas.audio.slice(0));
        return descargas;
    } catch (error) {
        return null;
    }
}

// Pone el GIF en la pantallita con una dirección nueva (arranca desde el cuadro 0) y, apenas se dibuja el primer cuadro,
// empieza a programar los sorbos
async function arrancarGifConSorbo(ventana, descargas) {
    const gif = ventana.querySelector('.combate-pantalla img');
    if (!gif) return;
    try {
        direccionGifPajita = URL.createObjectURL(descargas.gif);
        gif.src = direccionGifPajita;
        await gif.decode();
        await new Promise(resolver => requestAnimationFrame(resolver)); // se dibuja el primer cuadro (y ahí arranca el GIF)
        await new Promise(resolver => requestAnimationFrame(resolver));
        if (gif.isConnected) sincronizarPajita(performance.now());
    } catch (error) {
        // Si el cartel se cerró justo en este momento no hay nada que sincronizar
    }
}

// "inicio" = el instante (performance.now) en que el GIF empieza una vuelta. Un sorbo al comienzo de cada una
function sincronizarPajita(inicio) {
    let vuelta = 0;
    const programar = () => {
        let cuando = inicio + vuelta * PAJITA.vuelta + PAJITA.ajuste;
        while (cuando < performance.now() - 150) cuando = inicio + ++vuelta * PAJITA.vuelta + PAJITA.ajuste; // si la página se trabó, se saltean los sorbos perdidos
        // Se programa con 120 ms de anticipación: Web Audio hace el resto con exactitud
        temporizadorPajita = setTimeout(() => {
            sonarSorbo(cuando);
            vuelta++;
            programar();
        }, Math.max(0, cuando - performance.now() - 120));
    };
    programar();
}

// Un sorbo que empieza en "cuando" (instante de performance.now) y dura PAJITA.sorbo, con entrada y salida suaves
function sonarSorbo(cuando) {
    const ctx = obtenerContextoAudio();
    const duracion = PAJITA.sorbo / 1000;
    // El audio tarda un poquito en salir por los parlantes: se lo adelanta lo que informa el navegador
    const inicio = Math.max(ctx.currentTime, ctx.currentTime + (cuando - performance.now()) / 1000 - (ctx.outputLatency || 0));
    const fuente = ctx.createBufferSource();
    const volumen = ctx.createGain();
    fuente.buffer = bufferPajita;
    volumen.gain.setValueAtTime(0, inicio);
    volumen.gain.linearRampToValueAtTime(1, inicio + 0.01);
    volumen.gain.setValueAtTime(1, inicio + duracion - 0.06);
    volumen.gain.linearRampToValueAtTime(0, inicio + duracion);
    fuente.connect(volumen).connect(destinoDeAudio(ctx));
    fuente.start(inicio, 0, duracion);
    sorbosSonando.add(fuente);
    fuente.onended = () => sorbosSonando.delete(fuente);
}

// Plan B (sin sincronizar): el mismo ritmo del GIF, pero el sonido arranca cuando se abre el cartel
function reproducirPajita() {
    const sorbo = () => {
        audioPajita.currentTime = 0;
        audioPajita.play();
        setTimeout(() => audioPajita.pause(), PAJITA.sorbo);
    };
    sorbo();
    intervaloSonido = setInterval(sorbo, PAJITA.vuelta);
}

function detenerSonidoPajita() {
    clearInterval(intervaloSonido);
    clearTimeout(temporizadorPajita);
    sorbosSonando.forEach(fuente => { try { fuente.stop(); } catch (error) { /* ya había terminado */ } });
    sorbosSonando.clear();
    audioPajita.pause();
    audioPajita.currentTime = 0;
    if (direccionGifPajita) {
        URL.revokeObjectURL(direccionGifPajita);
        direccionGifPajita = null;
    }
}


function reproducirConDelay() {
    setTimeout(() => {
        if (dialogoAbierto) {
            winMusic.play();
        }
    }, 2450); 
}

// --------------------------------------------------------------------------------------------------------