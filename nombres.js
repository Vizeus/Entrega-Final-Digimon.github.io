// -----------------------------------------------------------------------------------------------------------------
// NOMBRES DE LOS DIGIMON SEGÚN EL IDIOMA
// -----------------------------------------------------------------------------------------------------------------

import { idioma } from './i18n.js';
import { NOMBRES_JA } from './nombresJa.js';
import { ATAQUES_JA, ATAQUES_JA_POR_DIGIMON } from './ataquesJa.js';
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

// El nombre de un ataque en el idioma actual. En japonés, el de Wikimon (ベビーフレイム, するどいツメ…) si lo tiene, y si no, el de la API como viene.
// Algunos nombres de la API son genéricos ("Breath", "Kick") y en cada digimon son otro ataque: para esos hay un nombre propio por digimon
// (ATAQUES_JA_POR_DIGIMON), por eso se pide también el nombre de la API del digimon que lo usa. En español y en inglés no cambia.
export function nombreDeAtaque(nombreAtaque, nombreApiDelDigimon) {
    if (idioma !== 'ja' || !nombreAtaque) return nombreAtaque;
    const propio = nombreApiDelDigimon ? ATAQUES_JA_POR_DIGIMON[nombreAtaque]?.[nombreApiDelDigimon] : null;
    return propio ?? ATAQUES_JA[nombreAtaque] ?? ATAQUES_JA_EN_MINUSCULAS.get(nombreAtaque.trim().toLowerCase()) ?? nombreAtaque;
}

// ---- Grupos (los "Fields" de la API) -------------------------------------------------------------------------------

// Son nombres propios: en español y en inglés se ven como los trae la API. En japonés, con su nombre oficial en katakana (el de Wikimon y los libros de Digimon).
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
    return idioma === 'ja' ? (GRUPOS_JA[campo] ?? campo) : campo;
}

// ---- Especies (los "types" de la API) y sus familias -----------------------------------------------------------------

// Las especies son nombres propios: en español y en inglés se ven como los trae la API. En japonés, con el nombre que les pone Wikimon (爬虫類型, 竜人型…);
// una que no esté en la lista (la API trae una nueva) se ve como viene.
export function nombreDeEspecie(especie) {
    return idioma === 'ja' ? (ESPECIES_JA[especie] ?? especie) : especie;
}

// Las "familias" del filtro de especies se arman con las palabras que comparten los nombres (Dragon, Beast, Ancient…): en japonés, cada palabra con su "系".
const FAMILIAS_JA = {
    'Ancient': '古代系',
    'Angel': '天使系',
    'Aquatic': '水棲系',
    'Beast': '獣系',
    'Bewitching': '妖系',
    'Bird': '鳥系',
    'Crustacean': '甲殻類系',
    'Dark': '暗黒系',
    'Demon': '魔系',
    'Dinosaur': '恐竜系',
    'Dragon': '竜系',
    'Fallen': '堕天使系',
    'Flame': '火炎系',
    'God': '神系',
    'Holy': '聖系',
    'Insect': '昆虫系',
    'Knight': '騎士系',
    'Machine': 'マシーン系',
    'Magic': '魔法系',
    'Mammal': '哺乳類系',
    'Man': '人系',
    'Mutation': '突然変異系',
    'Mythical': '幻系',
    'Plant': '植物系',
    'Reptile': '爬虫類系',
    'Rock': '岩系',
    'Small': '小型系',
    'Unknown': '不明系',
    'Warrior': '戦士系',
};

export function nombreDeFamilia(familia) {
    return idioma === 'ja' ? (FAMILIAS_JA[familia] ?? familia) : familia;
}
