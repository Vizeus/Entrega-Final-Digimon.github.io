// -----------------------------------------------------------------------------------------------------------------
// DATOS DEL SIMULADOR
//
// Las tablas con la información que usa la página: tipos, niveles, elementos, cartas propias y colores. Son solo datos (no hay
// funciones): para cambiar algo de lo que sabe el simulador, se cambia acá. No depende de ningún otro archivo.
// Las reglas de cómo se usan están en cada parte (por ejemplo, el combate en combate.js y la deducción del elemento en api.js).
// -----------------------------------------------------------------------------------------------------------------

// ---- Tipos ----------------------------------------------------------------------------------------------------

// Tipo (atributo) de cada digimon: la API lo trae en inglés y por dentro lo guardamos con estos nombres en español.
// Lo que se ve en pantalla ("Datos" o "Data") lo decide i18n.js según el idioma, ver nombreTipo().
export const tipoDeLaApi = {
    'Data': 'Datos',
    'Vaccine': 'Vacuna',
    'Virus': 'Virus',
    'Free': 'Libre',
    'Variable': 'Variable',
    'Unknown': 'Desconocido',
};

// Emoji de cada tipo para mostrar en la carta, en los filtros y en los menús
export const EMOJIS_TIPO = {
    'Datos': '🔢',
    'Vacuna': '💉',
    'Virus': '👾',
    'Libre': '🕊️',
    'Variable': '🔀',
    'Desconocido': '❓',
};

// Triángulo de tipos: cada tipo es fuerte contra el que tiene en su lista
export const TIPO_FUERTE_CONTRA = {
    'Vacuna': ['Virus'],
    'Virus': ['Datos'],
    'Datos': ['Vacuna'],
};

// ---- Niveles --------------------------------------------------------------------------------------------------

// Fuerza de cada nivel, usando el nombre original de la API (así no importa qué sistema de clasificación se muestre).
// Son 8 niveles, del 1 al 8, sin saltos. (Los "Armor" y los "Hybrid" que trae la API no son niveles de acá: cada uno de esos
// digimons queda en uno de estos 8 y la carta lleva una marca; ver MARCAS_DE_NIVEL más abajo.)
export const numeracionNiveles = {
    'Baby I': 1,
    'Baby II': 2,
    'Child': 3,
    'Adult': 4,
    'Perfect': 5,
    'Ultimate': 6,
    'Super Ultimate': 7,
    'Absolute': 8,
};

// Orden en que se muestran los niveles en los menús y en los filtros (el último, 'Desconocido', es el que no tiene nivel)
export const ORDEN_NIVELES = ['Baby I', 'Baby II', 'Child', 'Adult', 'Perfect', 'Ultimate', 'Super Ultimate', 'Absolute', 'Desconocido'];

// Mapeo de niveles para el cambio de sistema de clasificación de niveles
export const nivelesAlternativos = {
    'Baby I': 'Fresh/Slime',
    'Baby II': 'In-Training',
    'Child': 'Rookie',
    'Adult': 'Champion',
    'Perfect': 'Ultimate',
    'Ultimate': 'Mega',
    'Super Ultimate': 'Ultra', // nivel 7 (inventado para este simulador): por encima del Mega
    'Absolute': 'Absolute', // nivel 8 (inventado para este simulador): lo más alto, y el único que se llama igual en los dos sistemas
};

// Digimons que la API lista con dos niveles (el Perfect y el Ultimate): el simulador toma siempre el primero, que acá es el más
// bajo, y por su lore les corresponde el más alto. Se corrigen a mano. La clave es el ID de la API.
export const NIVELES_CORREGIDOS = {
    1064: 'Ultimate', // Omega Shoutmon: recibió el poder de Omegamon y está al nivel de las formas Mega de Shoutmon (X7, DX, EX6)
    1278: 'Ultimate', // Omega Shoutmon (X-Antibody)
};

// Niveles inventados para este simulador. La API pone a todos estos digimons como "Ultimate" (el Mega), pero por su lore
// están por encima: acá se los sube de nivel. La clave es el ID de la API; el nombre va en el comentario.
// El 7 son Reyes Reales, Soberanos, Lores Demonio y otros seres excepcionales; el 8 es lo más alto de todo.
// (Los X-Antibody y algunos más solo aparecen cuando se carga la API completa.)
export const ASCENSOS = {
    // Nivel 7 (Super Ultimate) · Reyes Reales
    183: 'Super Ultimate', // Omegamon
    636: 'Super Ultimate', // Alphamon
    637: 'Super Ultimate', // Alphamon (Ouryuken)
    434: 'Super Ultimate', // Dukemon
    435: 'Super Ultimate', // Dukemon (Crimson Mode)
    658: 'Super Ultimate', // Dukemon (X-Antibody)
    430: 'Super Ultimate', // Chaos Dukemon (forma oscura de Dukemon)
    543: 'Super Ultimate', // Gallantmon Chaos Mode (el mismo Chaos Dukemon, con su nombre en inglés)
    545: 'Super Ultimate', // Dynasmon
    659: 'Super Ultimate', // Dynasmon (X-Antibody)
    760: 'Super Ultimate', // Craniummon
    1228: 'Super Ultimate', // Craniummon (X-Antibody)
    776: 'Super Ultimate', // Sleipmon
    1237: 'Super Ultimate', // Sleipmon (X-Antibody)
    916: 'Super Ultimate', // Sleipmon (Burst Mode)
    315: 'Super Ultimate', // Magnamon
    588: 'Super Ultimate', // Ulforce V-dramon
    700: 'Super Ultimate', // Ulforce V-dramon (X-Antibody)
    699: 'Super Ultimate', // Ulforce V-dramon Future Mode
    554: 'Super Ultimate', // Lord Knightmon
    1233: 'Super Ultimate', // Lord Knightmon (X-Antibody)
    895: 'Super Ultimate', // Examon
    1262: 'Super Ultimate', // Examon (X-Antibody)
    1135: 'Super Ultimate', // Gankoomon
    1263: 'Super Ultimate', // Gankoomon (X-Antibody)
    892: 'Super Ultimate', // Duftmon
    893: 'Super Ultimate', // Duftmon (X-Antibody)
    894: 'Super Ultimate', // Duftmon (Leopard Mode)
    1187: 'Super Ultimate', // JESmon
    1250: 'Super Ultimate', // JESmon (X-Antibody)
    1295: 'Super Ultimate', // JESmon GX
    961: 'Super Ultimate', // Omegamon Zwart
    686: 'Super Ultimate', // Omegamon (X-Antibody)
    1196: 'Super Ultimate', // Omegamon Alter-B
    1197: 'Super Ultimate', // Omegamon Zwart Defeat
    1209: 'Super Ultimate', // Omegamon Alter-S
    1235: 'Super Ultimate', // Omegamon (Merciful Mode)
    // Nivel 7 · Los 5 Soberanos
    272: 'Super Ultimate', // Baihumon
    361: 'Super Ultimate', // Zhuqiaomon
    357: 'Super Ultimate', // Xuanwumon
    374: 'Super Ultimate', // Qinglongmon
    620: 'Super Ultimate', // Huanglongmon
    1428: 'Super Ultimate', // Huanglongmon (Ruin Mode)
    // Nivel 7 · Los 7 Lores Demonio
    667: 'Super Ultimate', // Leviamon
    1264: 'Super Ultimate', // Leviamon (X-Antibody)
    640: 'Super Ultimate', // Barbamon
    1254: 'Super Ultimate', // Barbamon (X-Antibody)
    739: 'Super Ultimate', // Belphemon (Rage Mode)
    1255: 'Super Ultimate', // Belphemon (X-Antibody)
    422: 'Super Ultimate', // Beelzebumon (Blast Mode)
    753: 'Super Ultimate', // Beelzebumon (X-Antibody)
    154: 'Super Ultimate', // Demon
    1261: 'Super Ultimate', // Demon (X-Antibody)
    648: 'Super Ultimate', // Demon Super Ultimate
    639: 'Super Ultimate', // Arkadimon Super Ultimate (su forma final se llama así: es el nivel que está por encima del Mega)
    552: 'Super Ultimate', // Lilithmon
    1265: 'Super Ultimate', // Lilithmon (X-Antibody)
    556: 'Super Ultimate', // Lucemon (Falldown Mode): el más fuerte de los 7 Lores Demonio
    1267: 'Super Ultimate', // Lucemon (X-Antibody)
    // Nivel 7 · Excepcionales
    576: 'Super Ultimate', // Susanoomon
    132: 'Super Ultimate', // Apocalymon
    384: 'Super Ultimate', // Seraphimon
    445: 'Super Ultimate', // Ofanimon
    1275: 'Super Ultimate', // Ofanimon (X-Antibody)
    1061: 'Super Ultimate', // Ofanimon (Falldown Mode)
    1276: 'Super Ultimate', // Ofanimon (Falldown Mode, X-Antibody)
    287: 'Super Ultimate', // Cherubimon (Vice): el tercero de los Tres Arcángeles, igual que Seraphimon y Ofanimon
    288: 'Super Ultimate', // Cherubimon (Virtue)
    1256: 'Super Ultimate', // Cherubimon (Vice) (X-Antibody)
    1257: 'Super Ultimate', // Cherubimon (Virtue) (X-Antibody)
    904: 'Super Ultimate', // Ogudomon (la versión X-Antibody queda en el nivel 8)
    // Nivel 8 (Absolute)
    457: 'Absolute', // Zeed Millenniumon
    1277: 'Absolute', // Ogudomon (X-Antibody)
    557: 'Absolute', // Lucemon (Satan Mode)
};

// ARMOR e HYBRID: la API los trae como niveles propios, pero son solo 34 digimons (4 Armor y 30 Hybrid) y ensuciaban el filtro y
// la info de niveles. Acá no son un nivel: cada uno se queda en uno de los 8 normales y la carta lleva un circulito (A o H) en la
// esquina, como el de la X-Antibody, que al pasar el mouse dice "Armor" o "Hybrid".
//   · Armor (Digimon Adventure 02): los 4 tienen el poder de un Adult.
//   · Hybrid (Digimon Frontier): según la forma van de Adult a Ultimate. Las formas humanas son Adult, las bestia son Perfect y
//     las fusiones (y las formas supremas) son Ultimate. Se asignaron a mano, uno por uno, mirando Wikimon y la Digimon Wiki.
//     La clave es el nombre de la API sin tildes, mayúsculas ni símbolos (claveDeNombre, de nombres.js: 'Löwemon' → 'lowemon', 'Jet Silphymon' → 'jetsilphymon').
export const NIVEL_DE_LOS_HYBRID = {
    // Formas humanas (los Human Spirits) → Adult
    agunimon: 'Adult', // fuego
    kazemon: 'Adult', // viento
    lobomon: 'Adult', // luz
    lanamon: 'Adult', // agua (Ranamon)
    arbormon: 'Adult', // madera
    blitzmon: 'Adult', // trueno
    chackmon: 'Adult', // hielo
    mercuremon: 'Adult', // acero
    grumblemon: 'Adult', // tierra
    duskmon: 'Adult', // oscuridad (el poder de Duskmon es de fusión, pero todos lo ponen en la clase Adult)
    lowemon: 'Adult', // oscuridad (Löwemon): el techo de la clase Adult
    // Formas bestia (los Beast Spirits) → Perfect
    burninggreymon: 'Perfect', // fuego (Vritramon)
    shutumon: 'Perfect', // viento
    kendogarurumon: 'Perfect', // luz (Garummon)
    calamaramon: 'Perfect', // agua
    petaldramon: 'Perfect', // madera
    bolgmon: 'Perfect', // trueno
    blizzarmon: 'Perfect', // hielo
    sephirothmon: 'Perfect', // acero
    gigasmon: 'Perfect', // tierra
    velgrmon: 'Perfect', // oscuridad (la bestia corrupta de Duskmon)
    kaiserleomon: 'Perfect', // oscuridad (la bestia purificada de Löwemon)
    // Fusiones y formas supremas → Ultimate
    aldamon: 'Ultimate', // fusión de fuego
    beowolfmon: 'Ultimate', // fusión de luz
    daipenmon: 'Ultimate', // fusión de hielo
    raihimon: 'Ultimate', // fusión de oscuridad (Löwemon + Kaiser Leomon)
    rhinokabuterimon: 'Ultimate', // fusión de trueno
    jetsilphymon: 'Ultimate', // fusión de viento
    magnagarurumon: 'Ultimate', // forma suprema de luz
    emperorgreymon: 'Ultimate', // forma suprema de fuego
};

export const NIVEL_HYBRID_SIN_DATO = 'Perfect'; // para un Hybrid que no esté en la lista (si la API algún día suma uno): el punto medio

// Las marcas de la carta: qué letra lleva el círculo y cómo se llama (es lo que dice al pasar el mouse)
export const MARCAS_DE_NIVEL = {
    'Armor': { letra: 'A', nombre: 'Armor' },
    'Hybrid': { letra: 'H', nombre: 'Hybrid' },
};

// ---- Elementos ------------------------------------------------------------------------------------------------

// Emoji de cada elemento para mostrar en la carta
export const EMOJIS_ELEMENTO = {
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
export const ORDEN_ELEMENTOS = Object.keys(EMOJIS_ELEMENTO);

// Elementos: cada elemento es fuerte contra los que tiene en su lista.
// Si dos elementos se tienen ventaja mutuamente (Luz y Oscuridad), se cancelan.
// Tipo Libre, Variable, Desconocido y elemento Neutro no dan ni quitan nada.
export const ELEMENTO_FUERTE_CONTRA = {
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

// La API no trae el elemento, así que lo deducimos buscando palabras clave en las habilidades del digimon.
// El elemento con más coincidencias gana; si hay empate o ninguna coincidencia, es Neutro.
export const REGLAS_ELEMENTO = {
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

// Correcciones a mano (id del digimon → elemento) para los casos en que la deducción automática no acierta
export const ELEMENTOS_MANUALES = {
    4: 'Rayo', // Betamon: sus habilidades empatan entre Rayo y Agua, pero es eléctrico
    457: 'Oscuridad', // Zeed Millenniumon: la deducción le daba Hielo por la palabra "freeze" de una habilidad, pero por lore es oscuridad y destrucción
};

// ---- Cartas propias -------------------------------------------------------------------------------------------

// Cartas que no están en la API: las agrega el simulador (después de las de la API). Su ID es alto para no chocar con los de ella.
export const CARTAS_PROPIAS = [
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
            descripcion:
                'The host computer that rules over the Digital World, treated in many adaptations as the God of the Digital World. This card was added by the simulator: it is not part of the API.',
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
            descripcion:
                'The security system of the Digital World, which keeps the balance between good and evil. In some stories it takes the place of Yggdrasil as the God of the Digital World. This card was added by the simulator: it is not part of the API.',
            evo: { previas: [], siguientes: [] },
        },
    },
];

// ---- Colores --------------------------------------------------------------------------------------------------

// Color de cada opción (el mismo que usan las cartas)
export const COLOR_TIPO = {
    'Vacuna': '#3a8dde',
    'Virus': '#8a4fc7',
    'Datos': '#3fae5a',
    'Libre': '#1fa79f',
    'Variable': '#e2803a',
    'Desconocido': '#59616d',
};
export const COLOR_ELEMENTO = {
    'Fuego': '#e8552b',
    'Agua': '#2f8fe0',
    'Planta': '#4aa84f',
    'Hielo': '#58c7ea',
    'Rayo': '#f0b400',
    'Viento': '#7cc9b0',
    'Tierra': '#a17a4a',
    'Luz': '#f5c542',
    'Oscuridad': '#6a4c93',
    'Metal': '#8a96a3',
    'Veneno': '#a24fc4',
    'Neutro': '#aab2bb',
};
// Un color por nivel, todos bien distintos entre sí. Los niveles 1 y 2 son pastel (rosa y menta); del 5 al 8 coinciden con el marco de la carta:
// plateado azulado (cromo helado), dorado, el rosa fuerte del holográfico y el violeta del estrellado. Los usan los filtros, la línea evolutiva y las ventanas.
export const COLOR_NIVEL = { 1: '#f8bfd8', 2: '#a5e6c8', 3: '#1ea59d', 4: '#e5604f', 5: '#a4cde8', 6: '#d9a520', 7: '#d6409a', 8: '#3a2f9e' };
export const COLOR_NIVEL_DESCONOCIDO = '#59616d';
export const COLOR_BUSQUEDA = '#2f7fd0';
export const COLOR_X = '#e0245e'; // el rojo de la gema X de las cartas

// Colores del texto de los enlaces que hay dentro de las ventanas de información. Son más oscuros que los de arriba (los de las
// cartas y los filtros), que son colores de fondo, para que el texto se lea sobre el fondo claro de la ventana.
export const COLOR_TIPO_ENLACE = {
    'Vacuna': '#2563eb',
    'Virus': '#7c3aed',
    'Datos': '#16a34a',
    'Libre': '#0d9488',
    'Variable': '#ea580c',
    'Desconocido': '#4b5563',
};

export const COLOR_ELEMENTO_ENLACE = {
    'Fuego': '#dc2626',
    'Agua': '#2563eb',
    'Planta': '#16a34a',
    'Hielo': '#0284c7',
    'Rayo': '#d97706',
    'Viento': '#059669',
    'Tierra': '#92400e',
    'Luz': '#ca8a04',
    'Oscuridad': '#6b21a8',
    'Metal': '#475569',
    'Veneno': '#9333ea',
    'Neutro': '#64748b',
};
