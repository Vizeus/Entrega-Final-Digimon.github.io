// -----------------------------------------------------------------------------------------------------------------
// IDIOMAS (español / inglés)
//
// Cómo funciona:
//   1. Al abrir la página se elige el idioma: primero el que la persona eligió con el botón ES | EN (se guarda en el
//      navegador); si nunca eligió, el primer idioma de su navegador que sea español o inglés; si no hay ninguno, inglés.
//   2. Los textos fijos del HTML llevan data-i18n="clave" (texto), data-i18n-html="clave" (texto con <br>)
//      o data-i18n-attr="atributo:clave;otro:clave" (title, aria-label, placeholder, alt...).
//   3. Los textos que arma el JS se piden con t('clave', { variable: valor }).
//   4. Al cambiar de idioma se vuelven a escribir todos los textos y se avisa con el evento "idioma-cambiado",
//      así cada parte de la página (cartas, filtros, menús) se traduce sin recargar.
//
// Ojo: por dentro, el tipo y el elemento de cada Digimon siguen guardados en español ("Datos", "Fuego"...) porque el combate
// y los filtros los usan como identificadores. Lo que cambia con el idioma es solo el nombre que se muestra.
// -----------------------------------------------------------------------------------------------------------------

const IDIOMAS = ['es', 'en'];

const DICCIONARIO = {
    es: {
        // Barra de arriba
        'logo.alt': 'Logo de Digimon',
        'combate.consigna': 'Elige 2 digimons con los que quieras simular un combate',
        'combate.contador': 'Digimons elegidos',
        'combate.iniciar': 'Iniciar Combate',
        'combate.iniciar.ayuda': 'Elige 2 digimons para poder iniciar el combate',
        'niveles.rotulo': 'Niveles',
        'niveles.ayuda.japon': 'Nombres de los niveles: Japón (Child, Adult, Perfect…). Tocá para usar los de EE.UU. (Rookie, Champion, Ultimate…)',
        'niveles.ayuda.eeuu': 'Nombres de los niveles: EE.UU. (Rookie, Champion, Ultimate…). Tocá para usar los de Japón (Child, Adult, Perfect…)',
        'menu.tipos': 'Info. tipos',
        'menu.elementos': 'Info. elementos',
        'menu.niveles': 'Info. niveles',
        'menu.abrir': 'Más opciones',
        'idioma.cambiar': 'Cambiar idioma (Español / English)',
        'carga.rotulo': 'Progreso de la carga de <br>Digimons:',

        // Nombres que se muestran
        'tipo.Datos': 'Datos',
        'tipo.Virus': 'Virus',
        'tipo.Vacuna': 'Vacuna',
        'tipo.Libre': 'Libre',
        'tipo.Variable': 'Variable',
        'tipo.Desconocido': 'Desconocido',
        'elemento.Fuego': 'Fuego',
        'elemento.Agua': 'Agua',
        'elemento.Planta': 'Planta',
        'elemento.Hielo': 'Hielo',
        'elemento.Rayo': 'Rayo',
        'elemento.Viento': 'Viento',
        'elemento.Tierra': 'Tierra',
        'elemento.Luz': 'Luz',
        'elemento.Oscuridad': 'Oscuridad',
        'elemento.Metal': 'Metal',
        'elemento.Veneno': 'Veneno',
        'elemento.Neutro': 'Neutro',
        'nivel.Desconocido': 'Desconocido',

        // Cartas
        'carta.nv': 'NV',
        'carta.voltear': 'Dar vuelta la carta',
        'carta.especie': 'Especie',
        'carta.estreno': 'Estreno',
        'carta.ataques': 'Ataques',
        'carta.sinDescripcion': 'Sin descripción disponible.',
        'carta.idiomaOriginal': 'Descripción original en inglés',

        // Combate
        'combate.preparando': 'Preparando combate...',
        'combate.peleando': '¡Los Digimons están peleando!',
        'combate.ganador': '¡El ganador es {nombre}!',
        'aceptar': 'Aceptar',

        // Ventanas de información (tipos, elementos y niveles)
        'info.fuerte': 'Fuerte contra',
        'info.debil': 'Débil frente a',
        'info.mutua': 'Ventaja mutua con',
        'info.seCancelan': '(se cancelan)',
        'info.ninguno': 'ninguno',
        'info.poder': 'Nivel de poder',
        'info.sinDato': 'sin dato',
        'info.clasificacion': 'Clasificación actual',
        'info.japon': 'Japón 🇯🇵',
        'info.eeuu': 'EE.UU. 🇺🇸',
        'info.otraClasificacion': 'En la otra clasificación',
        'info.nivelTitulo': '{nombre} · nivel {n}',
        'info.nivelItem': '{nombre} · nv {n}',
        'tipo.pie': 'Cada ventaja de tipo suma un {p}% de probabilidad de ganar.',
        'tipo.pieSin': 'Los tipos sin ventaja no suman ni restan probabilidad en el combate.',
        'elemento.pie': 'Cada ventaja de elemento suma un {p}% de probabilidad de ganar.',
        'elemento.pieNeutro': 'El elemento Neutro no suma ni resta probabilidad en el combate.',
        'nivel.pie': 'Cada nivel de diferencia con el rival suma o resta un {p}% de probabilidad de ganar.',
        'nivel.pieSin': 'Sin nivel no se suma ni se resta probabilidad en el combate.',
        'tipo.desc.Datos': 'Los Datos son Digimon con habilidades equilibradas.',
        'tipo.desc.Virus': 'Los Virus tienen habilidades ofensivas.',
        'tipo.desc.Vacuna': 'Los Vacuna se destacan por sus habilidades defensivas.',
        'tipo.desc.Libre': 'Los Libres no tienen atributos definidos, por lo que son equilibrados en combate.',
        'tipo.desc.Variable': 'Los Variables son adaptables, con habilidades cambiantes; pueden ser difíciles de predecir.',
        'tipo.desc.Desconocido': 'Los Desconocidos tienen atributos no clasificados, lo que los hace inesperados en combate.',
        'elemento.desc.Fuego': 'Digimon que atacan con llamas, calor y explosiones.',
        'elemento.desc.Agua': 'Digimon de mares, olas y burbujas.',
        'elemento.desc.Planta': 'Digimon de hojas, espinas, flores y bosques.',
        'elemento.desc.Hielo': 'Digimon de nieve, escarcha y frío extremo.',
        'elemento.desc.Rayo': 'Digimon que lanzan electricidad y relámpagos.',
        'elemento.desc.Viento': 'Digimon de tormentas, tornados y ráfagas.',
        'elemento.desc.Tierra': 'Digimon de roca, arena y temblores.',
        'elemento.desc.Luz': 'Digimon sagrados, de energía luminosa.',
        'elemento.desc.Oscuridad': 'Digimon de sombras, maldiciones y pesadillas.',
        'elemento.desc.Metal': 'Digimon de acero, cañones y láseres.',
        'elemento.desc.Veneno': 'Digimon de toxinas y ácidos.',
        'elemento.desc.Neutro': 'Digimon sin un elemento definido.',
        'nivel.desc.Baby I': 'Los recién nacidos: los más frágiles de todos.',
        'nivel.desc.Baby II': 'Bebés que ya empiezan a moverse y a defenderse un poco.',
        'nivel.desc.Child': 'La primera forma "de combate": ágiles, pero todavía de poco poder.',
        'nivel.desc.Adult': 'Forma madura con ataques propios; la más común en la serie.',
        'nivel.desc.Armor': 'Nacen de la Digievolución con huevos digitales (Digimon Adventure 02); su poder es similar al de un Adult.',
        'nivel.desc.Perfect': 'Gran poder y ataques devastadores; muy por encima de un Adult.',
        'nivel.desc.Hybrid': 'Nacen de la evolución con espíritus (Digimon Frontier); según la forma van de Adult a Ultimate, acá quedan en un punto medio.',
        'nivel.desc.Ultimate': 'El escalón más alto de la lista: los más poderosos, como Omnimon.',
        'nivel.desc.Desconocido': 'La API no informa su nivel.',

        // Filtros y buscador
        'filtros.titulo': 'Filtros',
        'filtros.region': 'Filtros y buscador de digimons',
        'filtros.buscar': 'Buscar digimon por nombre o número',
        'filtros.borrarBusqueda': 'Borrar búsqueda',
        'filtros.tipo': 'Tipo',
        'filtros.nivel': 'Nivel',
        'filtros.elemento': 'Elemento',
        'filtros.busqueda': 'Búsqueda',
        'filtros.porTipo': 'Filtrar por tipo',
        'filtros.porNivel': 'Filtrar por nivel',
        'filtros.porElemento': 'Filtrar por elemento',
        'filtros.activos': 'Filtros activos',
        'filtros.quitar': 'Quitar {grupo}: {valor}',
        'filtros.cuenta': 'Mostrando {v} de {n} digimons',
        'filtros.limpiar': 'Limpiar ✕',
        'filtros.limpiarTodo': 'Limpiar filtros',
        'filtros.vacio': '😕 Ningún digimon cumple esa combinación.',
    },

    en: {
        // Top bar
        'logo.alt': 'Digimon logo',
        'combate.consigna': 'Pick 2 Digimon to simulate a battle',
        'combate.contador': 'Digimon picked',
        'combate.iniciar': 'Start Battle',
        'combate.iniciar.ayuda': 'Pick 2 Digimon to start the battle',
        'niveles.rotulo': 'Levels',
        'niveles.ayuda.japon': 'Level names: Japan (Child, Adult, Perfect…). Tap to use the US ones (Rookie, Champion, Ultimate…)',
        'niveles.ayuda.eeuu': 'Level names: USA (Rookie, Champion, Ultimate…). Tap to use the Japanese ones (Child, Adult, Perfect…)',
        'menu.tipos': 'Types info',
        'menu.elementos': 'Elements info',
        'menu.niveles': 'Levels info',
        'menu.abrir': 'More options',
        'idioma.cambiar': 'Change language (Español / English)',
        'carga.rotulo': 'Loading progress of <br>Digimon:',

        // Displayed names
        'tipo.Datos': 'Data',
        'tipo.Virus': 'Virus',
        'tipo.Vacuna': 'Vaccine',
        'tipo.Libre': 'Free',
        'tipo.Variable': 'Variable',
        'tipo.Desconocido': 'Unknown',
        'elemento.Fuego': 'Fire',
        'elemento.Agua': 'Water',
        'elemento.Planta': 'Plant',
        'elemento.Hielo': 'Ice',
        'elemento.Rayo': 'Lightning',
        'elemento.Viento': 'Wind',
        'elemento.Tierra': 'Earth',
        'elemento.Luz': 'Light',
        'elemento.Oscuridad': 'Darkness',
        'elemento.Metal': 'Metal',
        'elemento.Veneno': 'Poison',
        'elemento.Neutro': 'Neutral',
        'nivel.Desconocido': 'Unknown',

        // Cards
        'carta.nv': 'LV',
        'carta.voltear': 'Flip the card',
        'carta.especie': 'Species',
        'carta.estreno': 'Release',
        'carta.ataques': 'Attacks',
        'carta.sinDescripcion': 'No description available.',
        'carta.idiomaOriginal': '',

        // Battle
        'combate.preparando': 'Getting the battle ready...',
        'combate.peleando': 'The Digimon are fighting!',
        'combate.ganador': 'The winner is {nombre}!',
        'aceptar': 'OK',

        // Info windows (types, elements and levels)
        'info.fuerte': 'Strong against',
        'info.debil': 'Weak against',
        'info.mutua': 'Mutual advantage with',
        'info.seCancelan': '(they cancel out)',
        'info.ninguno': 'none',
        'info.poder': 'Power level',
        'info.sinDato': 'no data',
        'info.clasificacion': 'Current classification',
        'info.japon': 'Japan 🇯🇵',
        'info.eeuu': 'USA 🇺🇸',
        'info.otraClasificacion': 'In the other classification',
        'info.nivelTitulo': '{nombre} · level {n}',
        'info.nivelItem': '{nombre} · lv {n}',
        'tipo.pie': 'Each type advantage adds {p}% to the chance of winning.',
        'tipo.pieSin': 'Types without an advantage neither add nor subtract chance in battle.',
        'elemento.pie': 'Each element advantage adds {p}% to the chance of winning.',
        'elemento.pieNeutro': 'The Neutral element neither adds nor subtracts chance in battle.',
        'nivel.pie': 'Each level of difference with the rival adds or subtracts {p}% to the chance of winning.',
        'nivel.pieSin': 'Without a level, no chance is added or subtracted in battle.',
        'tipo.desc.Datos': 'Data Digimon have balanced abilities.',
        'tipo.desc.Virus': 'Virus Digimon have offensive abilities.',
        'tipo.desc.Vacuna': 'Vaccine Digimon stand out for their defensive abilities.',
        'tipo.desc.Libre': 'Free Digimon have no defined attribute, so they are balanced in combat.',
        'tipo.desc.Variable': 'Variable Digimon are adaptable, with changing abilities; they can be hard to predict.',
        'tipo.desc.Desconocido': 'Unknown Digimon have unclassified attributes, which makes them unpredictable in combat.',
        'elemento.desc.Fuego': 'Digimon that attack with flames, heat and explosions.',
        'elemento.desc.Agua': 'Digimon of seas, waves and bubbles.',
        'elemento.desc.Planta': 'Digimon of leaves, thorns, flowers and forests.',
        'elemento.desc.Hielo': 'Digimon of snow, frost and extreme cold.',
        'elemento.desc.Rayo': 'Digimon that fire electricity and lightning.',
        'elemento.desc.Viento': 'Digimon of storms, tornadoes and gusts.',
        'elemento.desc.Tierra': 'Digimon of rock, sand and tremors.',
        'elemento.desc.Luz': 'Sacred Digimon, made of luminous energy.',
        'elemento.desc.Oscuridad': 'Digimon of shadows, curses and nightmares.',
        'elemento.desc.Metal': 'Digimon of steel, cannons and lasers.',
        'elemento.desc.Veneno': 'Digimon of toxins and acids.',
        'elemento.desc.Neutro': 'Digimon without a defined element.',
        'nivel.desc.Baby I': 'Newborns: the most fragile of all.',
        'nivel.desc.Baby II': 'Babies that are starting to move around and defend themselves a little.',
        'nivel.desc.Child': 'The first "battle" form: agile, but still low on power.',
        'nivel.desc.Adult': 'A mature form with attacks of its own; the most common in the series.',
        'nivel.desc.Armor': 'Born from Digivolution with Digi-Eggs (Digimon Adventure 02); their power is similar to an Adult\'s.',
        'nivel.desc.Perfect': 'Great power and devastating attacks; far above an Adult.',
        'nivel.desc.Hybrid': 'Born from spirit evolution (Digimon Frontier); depending on the form they range from Adult to Ultimate, here they sit at a middle point.',
        'nivel.desc.Ultimate': 'The highest rung on the list: the most powerful ones, like Omnimon.',
        'nivel.desc.Desconocido': 'The API does not report its level.',

        // Filters and search
        'filtros.titulo': 'Filters',
        'filtros.region': 'Digimon filters and search',
        'filtros.buscar': 'Search Digimon by name or number',
        'filtros.borrarBusqueda': 'Clear search',
        'filtros.tipo': 'Type',
        'filtros.nivel': 'Level',
        'filtros.elemento': 'Element',
        'filtros.busqueda': 'Search',
        'filtros.porTipo': 'Filter by type',
        'filtros.porNivel': 'Filter by level',
        'filtros.porElemento': 'Filter by element',
        'filtros.activos': 'Active filters',
        'filtros.quitar': 'Remove {grupo}: {valor}',
        'filtros.cuenta': 'Showing {v} of {n} Digimon',
        'filtros.limpiar': 'Clear ✕',
        'filtros.limpiarTodo': 'Clear filters',
        'filtros.vacio': '😕 No Digimon match that combination.',
    },
};

// ---- Elección del idioma -------------------------------------------------------------------------------------------
function idiomaGuardado() {
    try {
        const guardado = localStorage.getItem('idioma');
        return IDIOMAS.includes(guardado) ? guardado : null;
    } catch (error) {
        return null; // el navegador no deja guardar (modo privado, por ejemplo)
    }
}

function detectarIdioma() {
    const elegido = idiomaGuardado();
    if (elegido) return elegido;

    const preferidos = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (const preferido of preferidos) {
        const codigo = String(preferido).toLowerCase().slice(0, 2);
        if (IDIOMAS.includes(codigo)) return codigo;
    }
    return 'en'; // ni español ni inglés: inglés, que es lo que más gente entiende
}

let idioma = detectarIdioma();

// ---- Textos --------------------------------------------------------------------------------------------------------
// t('clave') devuelve el texto en el idioma actual. Las variables van entre llaves: t('combate.ganador', { nombre: 'Agumon' })
function t(clave, variables = {}) {
    let texto = DICCIONARIO[idioma]?.[clave] ?? DICCIONARIO.es[clave] ?? clave;
    for (const [nombre, valor] of Object.entries(variables)) {
        texto = texto.split(`{${nombre}}`).join(valor);
    }
    return texto;
}

// Escribe en el idioma actual todos los textos fijos del HTML marcados con data-i18n
function aplicarTextos(raiz = document) {
    document.documentElement.lang = idioma;

    raiz.querySelectorAll('[data-i18n]').forEach(elemento => {
        elemento.textContent = t(elemento.dataset.i18n);
    });
    raiz.querySelectorAll('[data-i18n-html]').forEach(elemento => {
        elemento.innerHTML = t(elemento.dataset.i18nHtml); // los textos son nuestros (el diccionario), no de la gente
    });
    raiz.querySelectorAll('[data-i18n-attr]').forEach(elemento => {
        for (const par of elemento.dataset.i18nAttr.split(';')) {
            const [atributo, clave] = par.split(':').map(parte => parte.trim());
            if (atributo && clave) elemento.setAttribute(atributo, t(clave));
        }
    });

    // Botón de idioma: marca cuál está activo
    document.querySelectorAll('#cambiar-idioma [data-idioma]').forEach(marca => {
        marca.classList.toggle('activo', marca.dataset.idioma === idioma);
    });
}

function cambiarIdioma(nuevo) {
    if (!IDIOMAS.includes(nuevo) || nuevo === idioma) return;
    idioma = nuevo;
    try {
        localStorage.setItem('idioma', idioma);
    } catch (error) {
        // si no se puede guardar, igual cambia mientras la página esté abierta
    }
    aplicarTextos();
    document.dispatchEvent(new CustomEvent('idioma-cambiado', { detail: { idioma } }));
}

// Nombres para mostrar (el valor interno sigue siendo el de español)
const nombreTipo = tipo => t(`tipo.${tipo}`);
const nombreElemento = elemento => t(`elemento.${elemento}`);

aplicarTextos();

document.getElementById('cambiar-idioma')?.addEventListener('click', () => cambiarIdioma(idioma === 'es' ? 'en' : 'es'));
