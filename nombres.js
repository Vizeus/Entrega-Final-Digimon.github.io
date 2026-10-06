// -----------------------------------------------------------------------------------------------------------------
// NOMBRES DE LOS DIGIMON SEGÚN EL IDIOMA
// -----------------------------------------------------------------------------------------------------------------
// La API trae los nombres ORIGINALES (los japoneses, escritos en letras latinas): Omegamon, Herakle Kabuterimon, Vamdemon...
// En español y en inglés la página muestra los nombres occidentales, que desde hace años son los mismos en todo el mundo
// (los del doblaje al inglés, los juegos y el juego de cartas): Omnimon, HerculesKabuterimon, Myotismon...
// El buscador encuentra a cada digimon por cualquiera de los dos nombres (ver filtros.js).
//
// Para la versión japonesa (todavía no existe): alcanza con quitar 'ja' de IDIOMAS_CON_NOMBRES_OCCIDENTALES, y las cartas
// pasan a mostrar el nombre original tal cual viene de la API.

const IDIOMAS_CON_NOMBRES_OCCIDENTALES = ['es', 'en'];

// Nombre de la API (original) → nombre occidental. Solo están los digimon cuyo nombre cambia (los más conocidos); los demás
// se muestran con el nombre de la API. Para sumar uno, basta con agregar una línea. Si el nombre de la API lleva algo entre
// paréntesis, se busca primero el nombre completo y después solo lo de antes del paréntesis, que se vuelve a agregar:
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
const claveDeNombre = nombre =>
    nombre
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

const TABLA_DE_NOMBRES = new Map(Object.entries(NOMBRES_OCCIDENTALES).map(([original, occidental]) => [claveDeNombre(original), occidental]));

// Nombre occidental de un nombre de la API (sin el "(X-Antibody)"). Si no tiene uno distinto, devuelve el mismo.
// nombreOccidental('Omegamon') → 'Omnimon'   nombreOccidental('Dukemon (Crimson Mode)') → 'Gallantmon (Crimson Mode)'
function nombreOccidental(nombreApi) {
    const completo = TABLA_DE_NOMBRES.get(claveDeNombre(nombreApi));
    if (completo) return completo;

    const posicion = nombreApi.indexOf('(');
    if (posicion > 0) {
        const antes = nombreApi.slice(0, posicion).trimEnd();
        const base = TABLA_DE_NOMBRES.get(claveDeNombre(antes));
        if (base) return base + nombreApi.slice(antes.length);
    }
    return nombreApi;
}

// Digimon que, aunque tengan nombre occidental (está en la tabla de arriba, así que el buscador y el dorso lo conocen), se muestran con su nombre
// original también en español y en inglés: el occidental queda como "nombre alternativo". Se anotan con el nombre de la API.
const SE_MUESTRAN_CON_EL_ORIGINAL = new Set(['Piyomon'].map(claveDeNombre));

// El nombre que se muestra en el idioma actual (es y en: el occidental, salvo los de SE_MUESTRAN_CON_EL_ORIGINAL; el resto de idiomas: el
// original de la API)
function nombreParaMostrar(nombreApi) {
    if (!IDIOMAS_CON_NOMBRES_OCCIDENTALES.includes(idioma)) return nombreApi;
    const base = nombreApi.split('(')[0].trimEnd();
    return SE_MUESTRAN_CON_EL_ORIGINAL.has(claveDeNombre(base)) ? nombreApi : nombreOccidental(nombreApi);
}
