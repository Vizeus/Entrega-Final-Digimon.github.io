// -----------------------------------------------------------------------------------------------------------------
// NOMBRES DE LOS DIGIMON SEGÚN EL IDIOMA
// -----------------------------------------------------------------------------------------------------------------

import { idioma } from './i18n.js';
import { NOMBRES_JA } from './nombresJa.js';
import { ATAQUES_JA, ATAQUES_JA_POR_DIGIMON } from './ataquesJa.js';
import { DESCRIPCIONES_ATAQUES_JA } from './ataquesDescJa.js';
import { ATAQUES_ES } from './ataquesEs.js';
import { ESPECIES_JA } from './especiesJa.js';
// La API trae los nombres ORIGINALES (los japoneses, escritos en letras latinas): Omegamon, Herakle Kabuterimon, Vamdemon...
// En español y en inglés la página muestra los nombres occidentales, que desde hace años son los mismos en todo el mundo
// (los del doblaje al inglés, los juegos y el juego de cartas): Omnimon, HerculesKabuterimon, Myotismon...
// El buscador encuentra a cada digimon por cualquiera de los dos nombres (ver filtros.js).
//
// En japonés ('ja' no está en IDIOMAS_CON_NOMBRES_OCCIDENTALES) las cartas muestran el nombre oficial en katakana (アグモン, テイルモン…), que es como
// se escriben allá; no se puede sacar convirtiendo las letras: salen de nombresJa.js, que arma herramientas/nombres-japoneses.mjs con los datos de
// Wikimon. Los pocos digimons que no están ahí se muestran con el nombre original de la API en letras latinas, y el occidental queda como nombre
// alternativo en el dorso.

const IDIOMAS_CON_NOMBRES_OCCIDENTALES = ['es', 'en'];

// Nombre de la API (original) → nombre occidental. Solo están los digimon cuyo nombre cambia (los más conocidos); los demás
// se muestran con el nombre de la API. Para sumar uno, basta con agregar una línea. Si el nombre de la API lleva algo entre
// paréntesis (o entre guiones, 'Gabumon -Yujo no Kizuna-'), se busca primero el nombre completo y después solo lo de antes, que se vuelve a agregar:
// 'Dukemon (Crimson Mode)' → 'Gallantmon (Crimson Mode)'. El "(X-Antibody)" no hace falta anotarlo: va siempre aparte.
const NOMBRES_OCCIDENTALES = {
    // Baby, Child y Adult
    'Tunomon': 'Tsunomon',
    'Pukamon': 'Bukamon',
    'Mochimon': 'Motimon',
    'Pyocomon': 'Yokomon',
    'Tukaimon': 'Tsukaimon',
    'Piyomon': 'Biyomon',
    'Tailmon': 'Gatomon',
    'Armadimon': 'Armadillomon',
    'Yukidarumon': 'Frigimon',
    'Goburimon': 'Goblimon',
    'Tortamon': 'Tortomon',
    'Mechanorimon': 'Mekanorimon',
    'Pteranomon': 'Pteramon',
    'Nanomon': 'Datamon',
    'Ganimon': 'Crabmon',
    'Dagomon': 'Dragomon',
    'Hangyomon': 'Divermon',
    'Rukamon': 'Dolphmon',
    'Jyureimon': 'Cherrymon',
    'Zassoumon': 'Weedmon',
    'Bakumon': 'Tapirmon',
    'Bitmon': 'Rabbitmon',
    'Yukimi Botamon': 'SnowBotamon',
    'Chibimon': 'DemiVeemon',
    'Centalmon': 'Centarumon',
    'Vegimon': 'Vegiemon',
    'Red Vegimon': 'RedVegiemon',
    'Orgemon': 'Ogremon',
    'Gottsumon': 'Gotsumon',
    'Octmon': 'Octomon',
    'Mushmon': 'Mushroomon',
    'Fantomon': 'Phantomon',
    'Pico Devimon': 'DemiDevimon',
    'Peti Meramon': 'DemiMeramon',
    'Pumpmon': 'Pumpkinmon',
    'Gorimon': 'Gorillamon',
    'Piccolomon': 'Piximon',
    'Wizarmon': 'Wizardmon',
    'Ice Devimon': 'IceDevimon',
    'Lady Devimon': 'LadyDevimon',
    'Death Meramon': 'DeathMeramon',
    'Blue Meramon': 'BlueMeramon',
    'Tyranomon': 'Tyrannomon',
    'Dark Tyranomon': 'DarkTyrannomon',
    'Metal Tyranomon': 'MetalTyrannomon',
    'Master Tyranomon': 'MasterTyrannomon',
    'Ex-Tyranomon': 'ExTyrannomon',
    'Sand Yanmamon': 'SandYanmamon',
    'Snow Goburimon': 'SnowGoblimon',
    'Toy Agumon': 'ToyAgumon',
    'Clear Agumon': 'ClearAgumon',
    'Yuki Agumon': 'SnowAgumon',
    'Modoki Betamon': 'ModokiBetamon',
    'Shima Unimon': 'ShimaUnimon',
    'Saber Leomon': 'SaberLeomon',
    'Dark Lizamon': 'DarkLizardmon',
    'Archnemon': 'Arukenimon',
    'Agumon Hakase': 'Agumon Expert',

    // Perfect y Ultimate de la primera época
    'Mega Seadramon': 'MegaSeadramon',
    'Metal Seadramon': 'MetalSeadramon',
    'Giga Seadramon': 'GigaSeadramon',
    'Waru Seadramon': 'WaruSeadramon',
    'Waru Monzaemon': 'WaruMonzaemon',
    'Mammon': 'Mammothmon',
    'Skull Mammon': 'SkullMammothmon',
    'Metal Etemon': 'MetalEtemon',
    'King Etemon': 'KingEtemon',
    'Mugendramon': 'Machinedramon',
    'Marin Angemon': 'MarineAngemon',
    'Marin Devimon': 'MarineDevimon',
    'Big Mamemon': 'BigMamemon',
    'Metal Mamemon': 'MetalMamemon',
    'Prince Mamemon': 'PrinceMamemon',
    'Hi Andromon': 'HiAndromon',
    'Holy Angemon': 'MagnaAngemon',
    'Holydramon': 'Magnadramon',
    'Diablomon': 'Diaboromon',
    'Belial Vamdemon': 'MaloMyotismon',
    'Tonosama Gekomon': 'ShogunGekomon',
    'Plotmon': 'Salamon',
    'Coatlmon': 'Quetzalmon',
    'Revolmon': 'Deputymon',
    'Gokumon': 'Reapermon',
    'Goddramon': 'Goldramon',
    'Panjyamon': 'IceLeomon',
    'Ofanimon': 'Ophanimon',
    'Gaioumon': 'Gaiomon',
    'Indaramon': 'Indramon',
    'Galgomon': 'Gargomon',
    'Gargomon': 'Gargoylemon',
    'Saint Galgomon': 'MegaGargomon',
    'Qinglongmon': 'Azulongmon',
    'Xuanwumon': 'Ebonwumon',
    'Huanglongmon': 'Fanglongmon',
    'Piemon': 'Piedmon',
    'Pinochimon': 'Puppetmon',
    'Vamdemon': 'Myotismon',
    'Venom Vamdemon': 'VenomMyotismon',
    'Hououmon': 'Phoenixmon',
    'Atlur Kabuterimon': 'MegaKabuterimon',
    'Herakle Kabuterimon': 'HerculesKabuterimon',
    'Rhino Kabuterimon': 'RhinoKabuterimon',
    'Tyrant Kabuterimon': 'TyrantKabuterimon',
    'Griffomon': 'Gryphonmon',
    'Chimairamon': 'Kimeramon',
    'Demon': 'Daemon',

    // Los Greymon, los Garurumon y los de Tamers y Adventure 02
    'Metal Greymon': 'MetalGreymon',
    'Skull Greymon': 'SkullGreymon',
    'War Greymon': 'WarGreymon',
    'Black War Greymon': 'BlackWarGreymon',
    'Metal Garurumon': 'MetalGarurumon',
    'Were Garurumon': 'WereGarurumon',
    'Magna Garurumon': 'MagnaGarurumon',
    'Omegamon': 'Omnimon',
    'Omegamon Zwart': 'Omnimon Zwart',
    'Omegamon Zwart Defeat': 'Omnimon Zwart Defeat',
    'Omegamon Alter-S': 'Omnimon Alter-S',
    'Omegamon Alter-B': 'Omnimon Alter-B',
    'Growmon': 'Growlmon',
    'Black Growmon': 'BlackGrowlmon',
    'Megalo Growmon': 'MegaloGrowlmon',
    'Black Megalo Growmon': 'BlackMegaloGrowlmon',
    'Dukemon': 'Gallantmon',
    'Chaos Dukemon': 'ChaosGallantmon',
    'Medieval Dukemon': 'Medieval Gallantmon',
    'Andiramon': 'Antylamon',
    'Anubimon': 'Anubismon',
    'Armagemon': 'Armageddemon',
    'Beelzebumon': 'Beelzemon',
    'Culumon': 'Calumon',
    'DORUmon': 'Dorumon',
    'DORUgamon': 'Dorugamon',
    'DORUguremon': 'Doruguremon',
    'DORUgoramon': 'Dorugoramon',
    'Zeed Millenniumon': 'Zeedmillenniumon',
    'V-mon': 'Veemon',
    'XV-mon': 'ExVeemon',
    'V-dramon': 'Veedramon',
    'Aero V-dramon': 'AeroVeedramon',
    'Ulforce V-dramon': 'UlforceVeedramon',
    'Ulforce V-dramon Future Mode': 'UlforceVeedramon Future Mode',
    'Fladramon': 'Flamedramon',
    'Lighdramon': 'Raidramon',
    'Pegasmon': 'Pegasusmon',
    'Slash Angemon': 'SlashAngemon',
    'JESmon': 'Jesmon',
    'JESmon GX': 'Jesmon GX',

    // Frontier y las épocas siguientes
    'Agnimon': 'Agunimon',
    'Neamon': 'Neemon',
    'Wolfmon': 'Lobomon',
    'Ranamon': 'Lanamon',
    'Garummon': 'KendoGarurumon',
    'Sleipmon': 'Kentaurosmon',
    'Ragnamon': 'Galacticmon',
    'Fairimon': 'Kazemon',
    'Flamon': 'Flamemon',
    'Vritramon': 'BurningGreymon',
    'Grottemon': 'Grumblemon',
    'Duftmon': 'Leopardmon',
    'Geo Greymon': 'GeoGreymon',
    'Rize Greymon': 'RizeGreymon',
    'Shine Greymon': 'ShineGreymon',
    'Victory Greymon': 'VictoryGreymon',
    'Kaiser Greymon': 'EmperorGreymon',
    'Decker Greymon': 'DeckerGreymon',
    'Zeke Greymon': 'ZekeGreymon',
    'Mach Gaogamon': 'MachGaogamon',
    'Candmon': 'Candlemon',
    'Ancient Beatmon': 'AncientBeetlemon',
    'Ancient Greymon': 'AncientGreymon',
    'Ancient Garurumon': 'AncientGarurumon',
    'Ancient Irismon': 'AncientKazemon',
    'Ancient Megatheriumon': 'AncientMegatheriummon',
    'Ancient Mermaimon': 'AncientMermaimon',
    'Ancient Sphinxmon': 'AncientSphinxmon',
    'Ancient Troiamon': 'AncientTroymon',
    'Ancient Volcamon': 'AncientVolcanomon',
    'Ancient Wisemon': 'AncientWisemon',
};

// "War Greymon", "war-greymon" y "WAR GREYMON" son lo mismo: se comparan sin mayúsculas, acentos, espacios ni signos
export const claveDeNombre = nombre =>
    nombre
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

const TABLA_DE_NOMBRES = new Map(Object.entries(NOMBRES_OCCIDENTALES).map(([original, occidental]) => [claveDeNombre(original), occidental]));

// Lo que va "aparte", en una segunda línea más chica, al final del nombre de un digimon: lo que está entre paréntesis ('Dukemon (Crimson Mode)')
// o entre guiones ('Gabumon -Yujo no Kizuna-', con o sin un "(X-Antibody)" después). Devuelve dónde empieza ese resto (el "(" o el primer
// guion), o -1 si el nombre no lleva nada aparte. Lo usan las cartas, la ventana de evolución y la búsqueda del nombre occidental.
const ENTRE_GUIONES = /\s-[^\s-][^()]*-(?=\s*(?:\(|$))/;

export function inicioDeLoAparte(nombre) {
    const parentesis = nombre.search(/[(（]/); // (también el paréntesis japonés, de ancho completo)
    const espacioDeGuiones = nombre.search(ENTRE_GUIONES);
    const guiones = espacioDeGuiones === -1 ? -1 : espacioDeGuiones + 1; // (el guion está después del espacio)
    if (parentesis === -1) return guiones;
    return guiones === -1 ? parentesis : Math.min(parentesis, guiones);
}

// Nombre occidental de un nombre de la API (sin el "(X-Antibody)"). Si no tiene uno distinto, devuelve el mismo.
// nombreOccidental('Omegamon') → 'Omnimon'   nombreOccidental('Dukemon (Crimson Mode)') → 'Gallantmon (Crimson Mode)'
export function nombreOccidental(nombreApi) {
    const completo = TABLA_DE_NOMBRES.get(claveDeNombre(nombreApi));
    if (completo) return completo;

    const posicion = inicioDeLoAparte(nombreApi);
    if (posicion > 0) {
        const antes = nombreApi.slice(0, posicion).trimEnd();
        const base = TABLA_DE_NOMBRES.get(claveDeNombre(antes));
        if (base) return base + nombreApi.slice(antes.length);
    }
    return nombreApi;
}

// Las cartas propias (datos.js) no están en la API, así que herramientas/nombres-japoneses.mjs no las busca: su nombre japonés va acá, a mano.
const NOMBRES_JA_PROPIOS = {
    'Yggdrasil': 'イグドラシル',
    'Homeostasis (Kami)': 'ホメオスタシス（神）',
};

const TABLA_JAPONESA = new Map(Object.entries({ ...NOMBRES_JA, ...NOMBRES_JA_PROPIOS }).map(([nombreApi, katakana]) => [claveDeNombre(nombreApi), katakana]));

// Nombre en katakana de un nombre de la API (sin el "(X-Antibody)"). Si no está en la lista, busca el de antes del paréntesis y le deja el resto como
// vino ('Dukemon (Crimson Mode)' → 'デュークモン (Crimson Mode)'); si tampoco, devuelve el nombre de la API en letras latinas.
export function nombreJapones(nombreApi) {
    const completo = TABLA_JAPONESA.get(claveDeNombre(nombreApi));
    if (completo) return completo;

    const posicion = inicioDeLoAparte(nombreApi);
    if (posicion > 0) {
        const base = TABLA_JAPONESA.get(claveDeNombre(nombreApi.slice(0, posicion)));
        if (base) return `${base} ${nombreApi.slice(posicion)}`;
    }
    return nombreApi;
}

// Digimon que, aunque tengan nombre occidental (está en la tabla de arriba, así que el buscador y el dorso lo conocen), se muestran con su nombre
// original también en español y en inglés: el occidental queda como "nombre alternativo". Se anotan con el nombre de la API.
const SE_MUESTRAN_CON_EL_ORIGINAL = new Set(['Piyomon'].map(claveDeNombre));

// El nombre que se muestra en el idioma actual (es y en: el occidental, salvo los de SE_MUESTRAN_CON_EL_ORIGINAL; ja: el de katakana, o el original
// de la API si no lo tiene)
export function nombreParaMostrar(nombreApi) {
    if (idioma === 'ja') return nombreJapones(nombreApi);
    if (!IDIOMAS_CON_NOMBRES_OCCIDENTALES.includes(idioma)) return nombreApi;
    const posicion = inicioDeLoAparte(nombreApi);
    const base = (posicion > 0 ? nombreApi.slice(0, posicion) : nombreApi).trimEnd();
    return SE_MUESTRAN_CON_EL_ORIGINAL.has(claveDeNombre(base)) ? nombreApi : nombreOccidental(nombreApi);
}

// ---- Ataques -------------------------------------------------------------------------------------------------------

const ATAQUES_JA_EN_MINUSCULAS = new Map(Object.entries(ATAQUES_JA).map(([ataque, japones]) => [ataque.toLowerCase(), japones]));
const ATAQUES_ES_EN_MINUSCULAS = new Map(Object.entries(ATAQUES_ES).map(([ataque, espanol]) => [ataque.toLowerCase(), espanol]));

// El nombre de un ataque en el idioma actual. En japonés, el de Wikimon (ベビーフレイム, するどいツメ…) si lo tiene, y si no, el de la API como viene.
// Algunos nombres de la API son genéricos ("Breath", "Kick") y en cada digimon son otro ataque: para esos hay un nombre propio por digimon
// (ATAQUES_JA_POR_DIGIMON), por eso se pide también el nombre de la API del digimon que lo usa. En español, los ataques conocidos de las primeras
// temporadas (ataquesEs.js) se ven con su nombre en español y el resto, como vienen. En inglés no cambia.
export function nombreDeAtaque(nombreAtaque, nombreApiDelDigimon) {
    if (!nombreAtaque) return nombreAtaque;
    if (idioma === 'es') return ATAQUES_ES[nombreAtaque] ?? ATAQUES_ES_EN_MINUSCULAS.get(nombreAtaque.trim().toLowerCase()) ?? nombreAtaque;
    if (idioma !== 'ja') return nombreAtaque;
    const propio = nombreApiDelDigimon ? ATAQUES_JA_POR_DIGIMON[nombreAtaque]?.[nombreApiDelDigimon] : null;
    return propio ?? ATAQUES_JA[nombreAtaque] ?? ATAQUES_JA_EN_MINUSCULAS.get(nombreAtaque.trim().toLowerCase()) ?? nombreAtaque;
}

// Las descripciones de los ataques en español son un archivo grande (ataquesDescEs.js): solo se baja cuando la página está en español. Mientras llega
// (o si no llega) se ve la descripción en inglés; al llegar se avisa con "descripciones-ataques-es" para que las ventanas abiertas se vuelvan a escribir.
let descripcionesAtaquesEs = null;
let bajandoDescripcionesAtaquesEs = false;

async function cargarDescripcionesAtaquesEs() {
    if (descripcionesAtaquesEs || bajandoDescripcionesAtaquesEs) return;
    bajandoDescripcionesAtaquesEs = true;
    try {
        ({ DESCRIPCIONES_ATAQUES_ES: descripcionesAtaquesEs } = await import('./ataquesDescEs.js'));
        document.dispatchEvent(new CustomEvent('descripciones-ataques-es'));
    } catch {
        bajandoDescripcionesAtaquesEs = false; // sin conexión o archivo faltante: queda el inglés y se vuelve a intentar al cambiar de idioma
    }
}
if (idioma === 'es') cargarDescripcionesAtaquesEs();
document.addEventListener('idioma-cambiado', () => {
    if (idioma === 'es') cargarDescripcionesAtaquesEs();
});

// La descripción de un ataque en el idioma actual. La API la trae solo en inglés; en japonés se busca la traducción (ataquesDescJa.js) y en español
// la suya (ataquesDescEs.js). Si esa descripción no está (o todavía no bajó el archivo), se deja la original. En inglés no cambia.
export function descripcionDeAtaque(descripcion) {
    if (!descripcion) return descripcion;
    if (idioma === 'ja') return DESCRIPCIONES_ATAQUES_JA[descripcion.trim()] ?? descripcion;
    if (idioma === 'es') return descripcionesAtaquesEs?.[descripcion.trim()] ?? descripcion;
    return descripcion;
}

// ---- Grupos (los "Fields" de la API) -------------------------------------------------------------------------------

// Son nombres propios: en inglés se ven como los trae la API. En japonés, con su nombre oficial en katakana (el de Wikimon y los libros de Digimon).
// En español se dejan como se los conoce en el mundo hispano, que es el nombre en inglés (también en el juego de cartas en español: Nature Spirits,
// Metal Empire…). Lo único que se traduce es "Unknown", que no es un nombre propio sino la palabra "desconocido".
const GRUPOS_ES = { 'Unknown': 'Desconocido' };

const GRUPOS_JA = {
    'Nature Spirits': 'ネイチャースピリッツ',
    'Deep Savers': 'ディープセイバーズ',
    'Nightmare Soldiers': 'ナイトメアソルジャーズ',
    'Wind Guardians': 'ウィンドガーディアンズ',
    'Metal Empire': 'メタルエンパイア',
    'Virus Busters': 'ウィルスバスターズ',
    "Dragon's Roar": 'ドラゴンズロア',
    'Jungle Troopers': 'ジャングルトルーパーズ',
    'Dark Area': 'ダークエリア',
    'Unknown': 'アンノウン',
};

// El nombre de un grupo en el idioma actual (un grupo que traiga la API y no esté en la lista se ve como viene)
export function nombreDeGrupo(campo) {
    if (idioma === 'ja') return GRUPOS_JA[campo] ?? campo;
    return idioma === 'es' ? (GRUPOS_ES[campo] ?? campo) : campo;
}

// ---- Especies (los "types" de la API) y sus familias -----------------------------------------------------------------

// En inglés las especies se ven como las trae la API. En japonés, con el nombre que les pone Wikimon (爬虫類型, 竜人型…). En español, traducidas
// (Reptile → Reptil, Holy Knight → Caballero sagrado): no hay una traducción oficial de los "tipos" y se tradujeron del inglés, con un mismo
// vocabulario para todas. Las que son nombres propios o palabras raras (Oni, Braun, Tathāgata, Avatar, Cyborg, LCD, Slime) quedan como son.
// Una que no esté en la lista (la API trae una nueva) se ve como viene.
const ESPECIES_ES = {
    'Alien': 'Alienígena',
    'Amphibian': 'Anfibio',
    'Ancient': 'Antiguo',
    'Ancient Aquatic Beast Man': 'Hombre bestia acuático antiguo',
    'Ancient Beast': 'Bestia antigua',
    'Ancient Bird': 'Ave antigua',
    'Ancient Bird Man': 'Hombre ave antiguo',
    'Ancient Crustacean': 'Crustáceo antiguo',
    'Ancient Dragon': 'Dragón antiguo',
    'Ancient Dragon Man': 'Hombre dragón antiguo',
    'Ancient Fairy': 'Hada antigua',
    'Ancient Fish': 'Pez antiguo',
    'Ancient Holy Knight': 'Caballero sagrado antiguo',
    'Ancient Insect': 'Insecto antiguo',
    'Ancient Mineral': 'Mineral antiguo',
    'Ancient Mutation': 'Mutación antigua',
    'Ancient Mythical Beast': 'Bestia mítica antigua',
    'Ancient Ore': 'Mena antigua',
    'Ancient Plant': 'Planta antigua',
    'Angel': 'Ángel',
    'Ankylosaur': 'Anquilosaurio',
    'Aquatic': 'Acuático',
    'Aquatic Beast Man': 'Hombre bestia acuático',
    'Aquatic Mammal': 'Mamífero acuático',
    'Archangel': 'Arcángel',
    'Armor': 'Armadura',
    'Artificial Fallen Angel': 'Ángel caído artificial',
    'Avatar': 'Avatar',
    'Baby Dragon': 'Dragón bebé',
    'Beast': 'Bestia',
    'Beast Dragon': 'Dragón bestia',
    'Beast Knight': 'Caballero bestia',
    'Beast Man': 'Hombre bestia',
    'Bewitching Beast': 'Bestia hechizante',
    'Bewitching Bird': 'Ave hechizante',
    'Bird': 'Ave',
    'Bird Dragon': 'Dragón ave',
    'Bird Man': 'Hombre ave',
    'Braun': 'Braun',
    'Bulb': 'Bulbo',
    'Card': 'Carta',
    'Ceratopsian': 'Ceratopsio',
    'Cherub': 'Querubín',
    'Chick': 'Pollito',
    'Composite': 'Compuesto',
    'Crustacean': 'Crustáceo',
    'Cyborg': 'Cyborg',
    'Dark Dragon': 'Dragón oscuro',
    'Dark Knight': 'Caballero oscuro',
    'Demon Beast': 'Bestia demoníaca',
    'Demon Dragon': 'Dragón demonio',
    'Demon God': 'Dios demonio',
    'Demon Lord': 'Señor demonio',
    'Demon Man': 'Hombre demonio',
    'Devil': 'Diablo',
    'Devil Dragon': 'Dragón diablo',
    'Dinosaur': 'Dinosaurio',
    'Dominion': 'Dominación',
    'Dragon': 'Dragón',
    'Dragon Man': 'Hombre dragón',
    'Dragon Warrior': 'Dragón guerrero',
    'Earth Dragon': 'Dragón de tierra',
    'Enhancement': 'Mejora',
    'Evil Dragon': 'Dragón maligno',
    'Fairy': 'Hada',
    'Fallen Angel': 'Ángel caído',
    'Fish': 'Pez',
    'Flame': 'Llama',
    'Flame Dragon': 'Dragón de llamas',
    'Food': 'Comida',
    'Galaxy': 'Galaxia',
    'Ghost': 'Fantasma',
    'Giant Bird': 'Ave gigante',
    'God Beast': 'Bestia divina',
    'God Man': 'Hombre divino',
    'Holy Beast': 'Bestia sagrada',
    'Holy Bird': 'Ave sagrada',
    'Holy Dragon': 'Dragón sagrado',
    'Holy Knight': 'Caballero sagrado',
    'Holy Mechanical Warrior': 'Guerrero mecánico sagrado',
    'Holy Sword': 'Espada sagrada',
    'Host Computer': 'Computadora central',
    'Hybrid': 'Híbrido',
    'Ice-Snow': 'Hielo y nieve',
    'Insect': 'Insecto',
    'Insectivorous Plant': 'Planta insectívora',
    'Invade': 'Invasor',
    'Larva': 'Larva',
    'LCD': 'LCD',
    'Lesser': 'Inferior',
    'Light Dragon': 'Dragón de luz',
    'Machine': 'Máquina',
    'Machine Dragon': 'Dragón máquina',
    'Magic Knight': 'Caballero mágico',
    'Magic Warrior': 'Guerrero mágico',
    'Major': 'Mayor',
    'Mammal': 'Mamífero',
    'Marine': 'Marino',
    'Marine Beast': 'Bestia marina',
    'Marine Man': 'Hombre marino',
    'Mine': 'Mina',
    'Mineral': 'Mineral',
    'Minor': 'Menor',
    'Mollusk': 'Molusco',
    'Monk': 'Monje',
    'Musical Instrument': 'Instrumento musical',
    'Mutant': 'Mutante',
    'Mutation': 'Mutación',
    'Mythical Beast': 'Bestia mítica',
    'Mythical Dragon': 'Dragón mítico',
    'Navigation': 'Navegación',
    'No Data': 'Sin datos',
    'Ocean Dragon': 'Dragón oceánico',
    'Oni': 'Oni',
    'Ophan': 'Ofán',
    'Ore': 'Mena',
    'Parasite': 'Parásito',
    'Perfect': 'Perfecto',
    'Plant': 'Planta',
    'Plesiosaur': 'Plesiosaurio',
    'Power': 'Poder',
    'Principality': 'Principado',
    'Pterosaur': 'Pterosaurio',
    'Puppet': 'Marioneta',
    'Rare Beast': 'Bestia rara',
    'Reptile': 'Reptil',
    'Reptile Man': 'Hombre reptil',
    'Rock': 'Roca',
    'Rock Dragon': 'Dragón de roca',
    'Security System': 'Sistema de seguridad',
    'Seed': 'Semilla',
    'Seraph': 'Serafín',
    'Shellfish': 'Marisco',
    'Skeleton': 'Esqueleto',
    'Sky Dragon': 'Dragón del cielo',
    'Slime': 'Slime',
    'Small Angel': 'Ángel pequeño',
    'Small Bird': 'Ave pequeña',
    'Small Devil': 'Diablillo',
    'Small Dragon': 'Dragón pequeño',
    'Smoke': 'Humo',
    'Space Alien': 'Alienígena espacial',
    'Species Unknown': 'Especie desconocida',
    'Spirit': 'Espíritu',
    'Stegosaur': 'Estegosaurio',
    'Super Major': 'Supermayor',
    'Synthetic Beast': 'Bestia sintética',
    'Tathāgata': 'Tathāgata',
    'Toy': 'Juguete',
    'Tropical Fish': 'Pez tropical',
    'Unanalyzable': 'Inanalizable',
    'Unbalanced': 'Desequilibrado',
    'Undead': 'No muerto',
    'Unique': 'Único',
    'Unknown': 'Desconocido',
    'Virtue': 'Virtud',
    'Warrior': 'Guerrero',
    'Weapon': 'Arma',
    'Wicked God': 'Dios malvado',
};

export function nombreDeEspecie(especie) {
    if (idioma === 'ja') return ESPECIES_JA[especie] ?? especie;
    return idioma === 'es' ? (ESPECIES_ES[especie] ?? especie) : especie;
}

// Las "familias" del filtro de especies se arman con las palabras que comparten los nombres (Dragon, Beast, Ancient…): en español, cada palabra traducida;
// en japonés, cada una con su "系".
const FAMILIAS_ES = {
    Alien: 'Alienígena',
    Ancient: 'Antiguo',
    Angel: 'Ángel',
    Aquatic: 'Acuático',
    Beast: 'Bestia',
    Bewitching: 'Hechizante',
    Bird: 'Ave',
    Crustacean: 'Crustáceo',
    Dark: 'Oscuro',
    Demon: 'Demonio',
    Devil: 'Diablo',
    Dinosaur: 'Dinosaurio',
    Dragon: 'Dragón',
    Fairy: 'Hada',
    Fallen: 'Caído',
    Fish: 'Pez',
    Flame: 'Llama',
    God: 'Dios',
    Holy: 'Sagrado',
    Insect: 'Insecto',
    Knight: 'Caballero',
    Machine: 'Máquina',
    Magic: 'Mágico',
    Major: 'Mayor',
    Mammal: 'Mamífero',
    Man: 'Hombre',
    Marine: 'Marino',
    Mineral: 'Mineral',
    Mutation: 'Mutación',
    Mythical: 'Mítico',
    Ore: 'Mena',
    Plant: 'Planta',
    Reptile: 'Reptil',
    Rock: 'Roca',
    Small: 'Pequeño',
    Unknown: 'Desconocido',
    Warrior: 'Guerrero',
};

const FAMILIAS_JA = {
    'Alien': 'エイリアン系',
    'Ancient': '古代系',
    'Angel': '天使系',
    'Aquatic': '水棲系',
    'Beast': '獣系',
    'Bewitching': '妖系',
    'Bird': '鳥系',
    'Crustacean': '甲殻類系',
    'Dark': '暗黒系',
    'Demon': '魔系',
    'Devil': '悪魔系',
    'Dinosaur': '恐竜系',
    'Dragon': '竜系',
    'Fairy': '妖精系',
    'Fallen': '堕天使系',
    'Fish': '魚系',
    'Flame': '火炎系',
    'God': '神系',
    'Holy': '聖系',
    'Insect': '昆虫系',
    'Knight': '騎士系',
    'Machine': 'マシーン系',
    'Magic': '魔法系',
    'Major': 'メジャー系',
    'Mammal': '哺乳類系',
    'Man': '人系',
    'Marine': '海洋系',
    'Mineral': '鉱物系',
    'Mutation': '突然変異系',
    'Mythical': '幻系',
    'Ore': '鉱石系',
    'Plant': '植物系',
    'Reptile': '爬虫類系',
    'Rock': '岩系',
    'Small': '小型系',
    'Unknown': '不明系',
    'Warrior': '戦士系',
};

export function nombreDeFamilia(familia) {
    if (idioma === 'ja') return FAMILIAS_JA[familia] ?? familia;
    return idioma === 'es' ? (FAMILIAS_ES[familia] ?? familia) : familia;
}

// El orden alfabético de las especies y de las familias: en español, por como se ven (Antiguo, Ave, Bestia…); en los demás idiomas, por el nombre
// de la API (en japonés tampoco se reordena)
export const compararEspecies = (a, b) => (idioma === 'es' ? nombreDeEspecie(a).localeCompare(nombreDeEspecie(b), 'es') : a.localeCompare(b, 'en'));
export const compararFamilias = (a, b) => (idioma === 'es' ? nombreDeFamilia(a).localeCompare(nombreDeFamilia(b), 'es') : a.localeCompare(b, 'en'));
