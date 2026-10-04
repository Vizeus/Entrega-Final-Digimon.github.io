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
        'combate.contador.limpiar': 'Quitar la selección de los digimons elegidos',
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
        'carta.infoNivel': 'Información del nivel {nivel}',
        'carta.infoTipo': 'Información del tipo {tipo}',
        'carta.infoElemento': 'Información del elemento {elemento}',
        'zoom.cerrar': 'Cerrar (Esc)',
        'zoom.ayuda': 'Esc o un clic afuera para cerrar · ← → para cambiar de carta',
        'zoom.anterior': 'Carta anterior (←)',
        'zoom.siguiente': 'Carta siguiente (→)',
        'aviso.zoom.mouse': 'Hacé doble clic en una carta para agrandarla',
        'aviso.zoom.dedos': 'Doble toque o pellizco sobre una carta para agrandarla',
        'aviso.inclinar.dedo': 'Mantenela apretada y mové el dedo para que brille y se incline',
        'aviso.voltear.dedo': 'Con un barrido rápido horizontal con el dedo, das vuelta la carta',
        'aviso.zoom.cerrar': 'Tocá en cualquier parte por fuera de la carta para cerrarla',
        'aviso.zoom.deslizar': 'Deslizá el dedo hacia un costado, empezando por fuera de la carta, para pasar a otra',
        'aviso.contador.mouse': 'Podés hacer clic acá para deseleccionar todas las cartas, o hacer clic en cada carta para deseleccionarla a mano',
        'aviso.contador.dedos': 'Podés tocar acá para deseleccionar todas las cartas, o tocar cada carta para deseleccionarla a mano',
        'aviso.inclinacion.normal': 'Mantené apretada Shift para anular la inclinación de las cartas, y con este botón podés invertirla',
        'aviso.inclinacion.normal.boton': 'Con este botón podés invertir la inclinación de las cartas',
        'aviso.inclinacion.invertida': 'Pasá el mouse por las cartas mientras mantenés apretada Shift para inclinarlas, y con este botón podés cambiarlo',
        'aviso.inclinacion.invertida.boton': 'Con este botón podés cambiar cómo se inclinan las cartas',
        'aviso.audio': 'Con este botón podés silenciar el sonido de la página',
        'aviso.audio.vibracion': 'Con este botón podés apagar el sonido y la vibración de la página',
        'aviso.zoomExtra': 'Girá la rueda hacia arriba con el mouse sobre la carta para acercarte todavía más, y hacia abajo para volver. Ya acercada, agarrala y arrastrala para moverla',
        'carta.especie': 'Especie',
        'carta.campos': 'Grupos',
        'carta.estreno': 'Estreno',
        'carta.nombreOriginal': 'Nombre original (Japón)',
        'carta.nombreOccidental': 'Nombre occidental',
        'ataques.boton': '⚔️ Ataques',
        'ataques.boton.ayuda': 'Ver todos sus ataques',
        'ataques.titulo': '⚔️ Ataques de {nombre}',
        'ataques.ayuda': 'Tocá un ataque para ver qué hace y quiénes lo usan',
        'ataques.quienesUsan': 'Digimons que usan este ataque ({n}):',
        'ataques.quienesUsan.uno': 'Digimon que usa este ataque (1):',
        'ataques.sinDescripcion': 'Este ataque no tiene descripción detallada.',
        'ataques.irACarta': 'Ir a la carta',
        'combate.usa': 'usa',
        'audio.silenciar': 'Silenciar el sonido',
        'audio.activar': 'Activar el sonido',
        'audio.todo': 'Sonido y vibración activados. Tocá para quitar solo el sonido',
        'audio.vibracion': 'Solo vibración, sin sonido. Tocá para quitar también la vibración',
        'audio.nada': 'Sin sonido ni vibración. Tocá para activar todo',
        'inclinacion.normal': 'Las cartas se inclinan al pasar el mouse (con Shift apretada, no). Hacé clic para invertirlo',
        'inclinacion.invertida': 'Las cartas se inclinan solo mientras mantenés apretada Shift. Hacé clic para que se inclinen al pasar el mouse',
        'carta.sinDescripcion': 'Sin descripción disponible.',
        'carta.idiomaOriginal': 'Descripción original en inglés',

        // Combate
        'combate.preparando': 'Preparando combate...',
        'combate.peleando': '¡Los Digimons están peleando!',
        'combate.ganador': '¡El ganador es {nombre}!',
        'combate.anular': 'Anular el combate',
        'aceptar': 'Aceptar',

        // Ventanas de información (tipos, elementos y niveles)
        'info.fuerte': 'Fuerte contra',
        'info.debil': 'Débil frente a',
        'info.mutua': 'Ventaja mutua con',
        'info.seCancelan': '(se cancelan)',
        'info.ninguno': 'ninguno',
        'info.poder': 'Nivel de poder',
        'info.poderCombate': 'Poder en combate',
        'info.sinDato': 'sin dato',
        'info.evolucionaDe': 'Evoluciona de',
        'info.evolucionaA': 'Evoluciona a',
        'info.verInfoDe': 'Ver información de {nombre}',
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
        'nivel.pieAlto': 'Rompe la escala: en el combate pesa como un nivel {n}. Cada nivel de diferencia con el rival suma o resta un {p}% de probabilidad de ganar, y contra un rival muy por debajo casi no cuentan el tipo ni el elemento.',
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
        'nivel.desc.Adult': 'Forma madura con ataques propios; la más común en la serie. Acá también están los Armor (círculo rojo con una "A" en la carta) y las formas humanas de los Hybrid (círculo verde con una "H").',
        'nivel.desc.Perfect': 'Gran poder y ataques devastadores; muy por encima de un Adult. Acá también están las formas bestia de los Hybrid (círculo verde con una "H" en la carta).',
        'nivel.desc.Ultimate': 'Los más poderosos de una evolución normal, como WarGreymon o MetalGarurumon. Acá también están las fusiones y formas supremas de los Hybrid (círculo verde con una "H" en la carta).',
        'nivel.desc.Super Ultimate': 'Nivel inventado para este simulador: por encima del Mega. Reyes Reales, Soberanos y Lores Demonio, cuyo poder rompe la escala normal.',
        'nivel.desc.Absolute': 'Nivel inventado para este simulador: lo más alto de todo. Seres capaces de destruir o de gobernar el mundo digital entero.',
        'nivel.desc.Desconocido': 'La API no informa su nivel.',

        // Filtros y buscador
        'filtros.titulo': 'Filtros',
        'filtros.region': 'Filtros y buscador de digimons',
        'filtros.buscar': 'Buscar digimon por nombre o número',
        'filtros.borrarBusqueda': 'Borrar búsqueda',
        'filtros.tipo': 'Tipo',
        'filtros.nivel': 'Nivel',
        'filtros.elemento': 'Elemento',
        'filtros.x': 'X-Antibody',
        'filtros.x.con': 'Con X-Antibody',
        'filtros.x.sin': 'Sin X-Antibody',
        'filtros.x.boton.indistinto': 'X-Antibody',
        'filtros.x.boton.con': 'Con X',
        'filtros.x.boton.sin': 'Sin X',
        'filtros.x.ayuda.indistinto': 'X-Antibody: indistinto. Un clic para ver solo las que la tienen',
        'filtros.x.ayuda.con': 'Solo las que tienen X-Antibody. Un clic para ver solo las que no la tienen',
        'filtros.x.ayuda.sin': 'Solo las que no tienen X-Antibody. Un clic para volver a ver todas',
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
        'combate.contador.limpiar': 'Clear the picked digimon',
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
        'carta.infoNivel': '{nivel} level info',
        'carta.infoTipo': '{tipo} type info',
        'carta.infoElemento': '{elemento} element info',
        'zoom.cerrar': 'Close (Esc)',
        'zoom.ayuda': 'Press Esc or click outside to close · ← → to switch cards',
        'zoom.anterior': 'Previous card (←)',
        'zoom.siguiente': 'Next card (→)',
        'aviso.zoom.mouse': 'Double-click a card to enlarge it',
        'aviso.zoom.dedos': 'Double-tap or pinch a card to enlarge it',
        'aviso.inclinar.dedo': 'Press and hold a card, then move your finger: it shines and tilts!',
        'aviso.voltear.dedo': 'Swipe quickly sideways with one finger to flip the card',
        'aviso.zoom.cerrar': 'Tap anywhere outside the card to close it',
        'aviso.zoom.deslizar': 'Swipe sideways, starting outside the card, to switch cards',
        'aviso.contador.mouse': 'You can click here to deselect all the cards, or click each card to deselect it by hand',
        'aviso.contador.dedos': 'You can tap here to deselect all the cards, or tap each card to deselect it by hand',
        'aviso.inclinacion.normal': 'Hold Shift to cancel the tilt of the cards, and use this button to invert it',
        'aviso.inclinacion.normal.boton': 'Use this button to invert how the cards tilt',
        'aviso.inclinacion.invertida': 'Move the mouse over the cards while holding Shift to tilt them, and use this button to change it',
        'aviso.inclinacion.invertida.boton': 'Use this button to change how the cards tilt',
        'aviso.audio': 'Use this button to mute the page\'s sound',
        'aviso.audio.vibracion': 'Use this button to turn off the page\'s sound and vibration',
        'aviso.zoomExtra': 'With the mouse over the card, scroll up to zoom in even closer, and scroll down to go back. Once zoomed in, grab the card and drag it around',
        'carta.especie': 'Species',
        'carta.campos': 'Groups',
        'carta.estreno': 'Release',
        'carta.nombreOriginal': 'Original name (Japan)',
        'carta.nombreOccidental': 'Western name',
        'ataques.boton': '⚔️ Attacks',
        'ataques.boton.ayuda': 'See all its attacks',
        'ataques.titulo': '⚔️ {nombre}\'s attacks',
        'ataques.ayuda': 'Tap an attack to see what it does and who uses it',
        'ataques.quienesUsan': 'Digimons that use this attack ({n}):',
        'ataques.quienesUsan.uno': 'Digimon that uses this attack (1):',
        'ataques.sinDescripcion': 'This attack has no detailed description.',
        'ataques.irACarta': 'Go to card',
        'combate.usa': 'uses',
        'audio.silenciar': 'Mute the sound',
        'audio.activar': 'Turn the sound on',
        'audio.todo': 'Sound and vibration on. Tap to turn off just the sound',
        'audio.vibracion': 'Vibration only, no sound. Tap to turn off the vibration too',
        'audio.nada': 'No sound or vibration. Tap to turn everything on',
        'inclinacion.normal': 'Cards tilt when the mouse moves over them (not while holding Shift). Click to invert it',
        'inclinacion.invertida': 'Cards tilt only while you hold Shift. Click to make them tilt when the mouse moves over them',
        'carta.sinDescripcion': 'No description available.',
        'carta.idiomaOriginal': '',

        // Battle
        'combate.preparando': 'Getting the battle ready...',
        'combate.peleando': 'The Digimon are fighting!',
        'combate.ganador': 'The winner is {nombre}!',
        'combate.anular': 'Cancel the battle',
        'aceptar': 'OK',

        // Info windows (types, elements and levels)
        'info.fuerte': 'Strong against',
        'info.debil': 'Weak against',
        'info.mutua': 'Mutual advantage with',
        'info.seCancelan': '(they cancel out)',
        'info.ninguno': 'none',
        'info.poder': 'Power level',
        'info.poderCombate': 'Battle power',
        'info.sinDato': 'no data',
        'info.evolucionaDe': 'Evolves from',
        'info.evolucionaA': 'Evolves to',
        'info.verInfoDe': 'View info for {nombre}',
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
        'nivel.pieAlto': 'It breaks the scale: in battle it weighs as much as a level {n}. Each level of difference with the rival adds or subtracts {p}% to the chance of winning, and against a rival far below, type and element barely count.',
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
        'nivel.desc.Adult': 'A mature form with attacks of its own; the most common in the series. The Armor digimon (red circle with an "A" on the card) and the human forms of the Hybrids (green circle with an "H") are here too.',
        'nivel.desc.Perfect': 'Great power and devastating attacks; far above an Adult. The beast forms of the Hybrids (green circle with an "H" on the card) are here too.',
        'nivel.desc.Ultimate': 'The most powerful of a normal evolution, like WarGreymon or MetalGarurumon. The fusions and supreme forms of the Hybrids (green circle with an "H" on the card) are here too.',
        'nivel.desc.Super Ultimate': 'A level made up for this simulator: above Mega. Royal Knights, Sovereigns and Demon Lords, whose power breaks the normal scale.',
        'nivel.desc.Absolute': 'A level made up for this simulator: the highest of all. Beings able to destroy or to rule the whole digital world.',
        'nivel.desc.Desconocido': 'The API does not report its level.',

        // Filters and search
        'filtros.titulo': 'Filters',
        'filtros.region': 'Digimon filters and search',
        'filtros.buscar': 'Search Digimon by name or number',
        'filtros.borrarBusqueda': 'Clear search',
        'filtros.tipo': 'Type',
        'filtros.nivel': 'Level',
        'filtros.elemento': 'Element',
        'filtros.x': 'X-Antibody',
        'filtros.x.con': 'With X-Antibody',
        'filtros.x.sin': 'Without X-Antibody',
        'filtros.x.boton.indistinto': 'X-Antibody',
        'filtros.x.boton.con': 'With X',
        'filtros.x.boton.sin': 'No X',
        'filtros.x.ayuda.indistinto': 'X-Antibody: any. Click to show only those that have it',
        'filtros.x.ayuda.con': 'Only those with X-Antibody. Click to show only those without it',
        'filtros.x.ayuda.sin': 'Only those without X-Antibody. Click to show them all again',
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
