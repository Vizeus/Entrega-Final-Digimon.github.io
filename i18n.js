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
// Ojo: por dentro, el atributo y el elemento de cada digimon siguen guardados en español ("Datos", "Fuego"...) porque el combate
// y los filtros los usan como identificadores. Lo que cambia con el idioma es solo el nombre que se muestra.
// -----------------------------------------------------------------------------------------------------------------

import { emitir, guardarTexto, leerTexto } from './util.js';

const IDIOMAS = ['es', 'en'];

export const DICCIONARIO = {
    es: {
        // Barra de arriba
        'logo.alt': 'Logo de Digimon',
        'logo.ayuda': 'Volver al inicio',
        'combate.consigna': 'Elige 2 digimons con los que quieras simular un combate',
        'combate.contador': 'Digimons elegidos',
        'combate.contador.limpiar': 'Quitar la selección de los digimons elegidos',
        'combate.iniciar': 'Iniciar Combate',
        'combate.iniciar.ayuda': 'Elige 2 digimons para poder iniciar el combate',
        'niveles.rotulo': 'Niveles',
        'niveles.ayuda.japon': 'Nombres de los niveles: Japón (Child, Adult, Perfect…). Tocá para usar los de EE.UU. (Rookie, Champion, Ultimate…)',
        'niveles.ayuda.eeuu': 'Nombres de los niveles: EE.UU. (Rookie, Champion, Ultimate…). Tocá para usar los de Japón (Child, Adult, Perfect…)',
        'menu.atributos': 'Info. atributos',
        'menu.elementos': 'Info. elementos',
        'menu.niveles': 'Info. niveles',
        'menu.misc': 'Info. misceláneos',
        'menu.abrir': 'Más opciones',
        'idioma.cambiar': 'Cambiar idioma (Español / English)',
        'carga.rotulo': 'Progreso de la carga de <br>digimons:',

        // Nombres que se muestran
        'atributo.Datos': 'Datos',
        'atributo.Virus': 'Virus',
        'atributo.Vacuna': 'Vacuna',
        'atributo.Libre': 'Libre',
        'atributo.Variable': 'Variable',
        'atributo.Desconocido': 'Desconocido',
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
        'carta.infoAtributo': 'Información del atributo {atributo}',
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
        'aviso.inclinacion.normal': 'Mantené apretado Shift para anular la inclinación de las cartas, y con este botón podés invertirlo',
        'aviso.inclinacion.normal.boton': 'Con este botón podés invertir la inclinación de las cartas',
        'aviso.inclinacion.invertida': 'Pasá el mouse por las cartas mientras mantenés apretado Shift para inclinarlas, y con este botón podés cambiarlo',
        'aviso.inclinacion.invertida.boton': 'Con este botón podés cambiar cómo se inclinan las cartas',
        'aviso.audio': 'Con este botón podés silenciar el sonido de la página',
        'aviso.tema': 'Con este botón podés elegir el tema: claro, oscuro o el de tu dispositivo',
        'aviso.audio.vibracion': 'Con este botón podés apagar el sonido y la vibración de la página',
        'aviso.zoomExtra':
            'Girá la rueda hacia arriba con el mouse sobre la carta para acercarte todavía más, y hacia abajo para volver. Ya acercada, agarrala y arrastrala para moverla',
        'carta.especie': 'Especie',
        'carta.campos': 'Grupos',
        'carta.estreno': 'Estreno',
        'carta.nombreOriginal': 'Nombre original (Japón)',
        'carta.nombreOccidental': 'Nombre occidental',
        'ataques.boton': '⚔️ Ataques',
        'ataques.boton.ayuda': 'Ver todos sus ataques',
        'ataques.titulo': '⚔️ Ataques de {nombre}',
        'ataques.ayuda': 'Tocá un ataque para ver qué hace y quiénes lo usan',
        'ataques.quienesUsan': 'Otros digimons que usan este ataque ({n}):',
        'ataques.quienesUsan.uno': 'Otro digimon que usa este ataque:',
        'ataques.soloEste': 'Solo este digimon usa este ataque específico.',
        'ataques.sinDescripcion': 'Este ataque no tiene descripción detallada.',
        'ataques.irACarta': 'Ir a la carta',
        'ataques.traduccion': 'Traducción del nombre',
        'combate.usa': 'usa',
        'audio.silenciar': 'Silenciar el sonido',
        'audio.activar': 'Activar el sonido',
        'audio.todo': 'Sonido y vibración activados. Tocá para quitar solo el sonido',
        'audio.vibracion': 'Solo vibración, sin sonido. Tocá para quitar también la vibración',
        'audio.nada': 'Sin sonido ni vibración. Tocá para activar todo',
        'inclinacion.normal': 'Las cartas se inclinan al pasar el mouse (con Shift apretado, no). Hacé clic para invertirlo',
        'inclinacion.invertida': 'Las cartas se inclinan solo mientras mantenés apretado Shift. Hacé clic para que se inclinen al pasar el mouse',
        'tema.auto': 'Tema automático: usa el de tu dispositivo (ahora, {actual}). Tocá para elegir el claro',
        'tema.claro': 'Tema claro. Tocá para elegir el oscuro',
        'tema.oscuro': 'Tema oscuro. Tocá para volver al automático (el de tu dispositivo)',
        'tema.actual.claro': 'claro',
        'tema.actual.oscuro': 'oscuro',
        'carta.sinDescripcion': 'Sin descripción disponible.',
        'carta.idiomaOriginal': 'Descripción original en inglés',

        // Combate
        'combate.preparando': 'Preparando combate...',
        'combate.peleando': '¡Los digimons están peleando!',
        'combate.ganador': '¡El ganador es {nombre}!',
        'aceptar': 'Aceptar',

        // Ventanas de información (atributos, elementos y niveles)
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
        'atributo.pie': 'Cada ventaja de atributo suma un {p}% de probabilidad de ganar.',
        'atributo.pieSin': 'Los atributos sin ventaja no suman ni restan probabilidad en el combate.',
        'elemento.pie': 'Cada ventaja de elemento suma un {p}% de probabilidad de ganar.',
        'elemento.pieNeutro': 'El elemento Neutro no suma ni resta probabilidad en el combate.',
        'nivel.pie': 'Cada nivel de diferencia con el rival suma o resta un {p}% de probabilidad de ganar.',
        'nivel.pieAlto':
            'Rompe la escala: en el combate pesa como un nivel {n}. Cada nivel de diferencia con el rival suma o resta un {p}% de probabilidad de ganar, y contra un rival muy por debajo casi no cuentan el atributo ni el elemento.',
        'nivel.pieSin': 'Sin nivel no se suma ni se resta probabilidad en el combate.',
        'atributo.desc.Datos': 'Los Datos son digimon con habilidades equilibradas.',
        'atributo.desc.Virus': 'Los Virus tienen habilidades ofensivas.',
        'atributo.desc.Vacuna': 'Los Vacuna se destacan por sus habilidades defensivas.',
        'atributo.desc.Libre': 'Los Libres no tienen un atributo definido, por lo que son equilibrados en combate.',
        'atributo.desc.Variable': 'Los Variables son adaptables, con habilidades cambiantes; pueden ser difíciles de predecir.',
        'atributo.desc.Desconocido': 'Los Desconocidos tienen un atributo sin clasificar, lo que los hace inesperados en combate.',
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
        'nivel.desc.Adult':
            'Forma madura con ataques propios; la más común en la serie. Acá también están los Armor (círculo rojo con una "A" en la carta) y las formas humanas de los Hybrid (círculo verde con una "H").',
        'nivel.desc.Perfect':
            'Gran poder y ataques devastadores; muy por encima de un {nivel:Adult}. Acá también están las formas bestia de los Hybrid (círculo verde con una "H" en la carta).',
        'nivel.desc.Ultimate':
            'Los más poderosos de una evolución normal, como WarGreymon o MetalGarurumon. Acá también están las fusiones y formas supremas de los Hybrid (círculo verde con una "H" en la carta).',
        'nivel.desc.Super Ultimate':
            'Nivel inventado para este simulador: por encima del {nivel:Ultimate}. Reyes Reales, Soberanos y Lores Demonio, cuyo poder rompe la escala normal.',
        'nivel.desc.Absolute': 'Nivel inventado para este simulador: lo más alto de todo. Seres capaces de destruir o de gobernar el mundo digital entero.',
        'nivel.desc.Desconocido': 'La API no informa su nivel.',

        // Ventanas de las marcas de la carta (X-Antibody, Armor, Hybrid y Xros Wars): se abren tocando la marca en la carta o desde "Info. misceláneos"
        'misc.enCarta': 'En la carta',
        'misc.buscar': 'Cómo encontrarlos',
        'misc.nivel': 'Nivel en el simulador',
        'misc.xantibody.titulo': '🧬 X-Antibody',
        'misc.xantibody.desc':
            'La X-Antibody es un factor que algunos digimon adquieren y que les da una forma "X": versiones renovadas de digimon ya conocidos, que suelen verse más fuertes. No es un nivel, un atributo ni un elemento: es una marca aparte.',
        'misc.xantibody.enCarta': 'Gema rosa con una "X" arriba a la izquierda, y "(X-Antibody)" en el nombre',
        'misc.xantibody.buscar': 'Con el botón X-Antibody de los filtros (con o sin ella) o escribiendo X-Antibody en el buscador',
        'misc.xantibody.pie': 'No suma ni resta nada en el combate: lo que cuenta es su nivel, su atributo y su elemento.',
        'misc.armor.titulo': '🛡️ Armor',
        'misc.armor.desc':
            'La evolución Armor (Digimon Adventure 02): un digimon se une a un Digihuevo y toma una forma nueva, sin seguir los niveles normales de evolución. Son muy pocos, y en este simulador no forman un nivel aparte: cada uno queda dentro de un nivel normal.',
        'misc.armor.enCarta': 'Círculo rojo con una "A" arriba a la izquierda',
        'misc.armor.nivel': 'Todos son {nivel:Adult}',
        'misc.armor.buscar': 'Escribiendo Armor en el buscador',
        'misc.armor.pie': 'En el combate cuenta como un digimon de su nivel: no suma ni resta nada por ser Armor.',
        'misc.hybrid.titulo': '🌀 Hybrid',
        'misc.hybrid.desc':
            'Los Hybrid (Digimon Frontier) son las formas que toman los protagonistas al usar un Spirit, no por la evolución normal. Hay formas humanas, formas bestia y fusiones, de poder muy distinto, y tampoco forman un nivel aparte: cada una queda dentro de un nivel normal.',
        'misc.hybrid.enCarta': 'Círculo verde con una "H" arriba a la izquierda',
        'misc.hybrid.nivel': 'Humanas: {nivel:Adult}. Bestia: {nivel:Perfect}. Fusiones y formas supremas: {nivel:Ultimate}',
        'misc.hybrid.buscar': 'Escribiendo Hybrid en el buscador',
        'misc.hybrid.pie': 'En el combate cuenta como un digimon de su nivel: no suma ni resta nada por ser Hybrid.',
        'misc.xroswars.titulo': '🔶 Xros Wars',
        'misc.xroswars.desc':
            'Los digimon de la serie Digimon Xros Wars y de su continuación (The Young Hunters), cuya idea central es el DigiXros: digimon que se fusionan para formar uno nuevo y más fuerte.',
        'misc.xroswars.enCarta': 'Círculo naranja con "XW" arriba a la izquierda',
        'misc.xroswars.buscar': 'Escribiendo Xros Wars en el buscador',
        'misc.xroswars.pie':
            'Es una aproximación: la API no trae este dato, así que se marcan los digimon estrenados entre 2010 y 2012 (los de esas series). No suma ni resta nada en el combate.',

        // Filtros y buscador
        'filtros.titulo': 'Filtros',
        'filtros.region': 'Filtros y buscador de digimons',
        'filtros.buscar': 'Buscar digimon por nombre o número',
        'filtros.borrarBusqueda': 'Borrar búsqueda',
        'filtros.atributo': 'Atributo',
        'filtros.campo': 'Grupo',
        'filtros.especie': 'Especie',
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
        'filtros.porAtributo': 'Filtrar por atributo',
        'filtros.porCampo': 'Filtrar por grupo',
        'filtros.porEspecie': 'Filtrar por especie',
        'filtros.buscarEspecie': 'Buscar especie…',
        'filtros.familias': 'Familias',
        'filtros.especies': 'Especies',
        'filtros.familia': 'Familia {nombre}: marca de una vez sus {n} especies',
        'filtros.familia.todas': '{nombre} (todas)',
        'filtros.orden': 'Orden',
        'filtros.ordenarPor': 'Ordenar por',
        'filtros.orden.id': 'Número (ID)',
        'filtros.orden.az': 'Alfabético (A–Z)',
        'filtros.orden.id.ayuda': 'Ordena por número de ID, que coincide con la fecha de estreno: de los más antiguos a los más nuevos (ascendente)',
        'filtros.orden.az.ayuda': 'Ordena por nombre, de la A a la Z (ascendente)',
        'filtros.orden.id.corto': 'ID',
        'filtros.orden.az.corto': 'A–Z',
        'filtros.porNivel': 'Filtrar por nivel',
        'filtros.porElemento': 'Filtrar por elemento',
        'filtros.estreno': 'Estreno',
        'filtros.porEstreno': 'Filtrar por fecha de estreno',
        'filtros.estreno.titulo': 'Año de estreno',
        'filtros.estreno.desde': 'Desde',
        'filtros.estreno.hasta': 'Hasta',
        'filtros.estreno.libre': 'Sin límite',
        'filtros.estreno.rango': '{desde}–{hasta}',
        'filtros.estreno.uno': '{desde}',
        'filtros.estreno.desdeSolo': 'desde {desde}',
        'filtros.estreno.hastaSolo': 'hasta {hasta}',
        'filtros.activos': 'Filtros activos',
        'filtros.quitar': 'Quitar {grupo}: {valor}',
        'filtros.cuenta': 'Mostrando {v} de {n} digimons',
        'filtros.cuenta.corta': '{v} de {n}',
        'filtros.limpiar': 'Limpiar ✕',
        'filtros.limpiarTodo': 'Limpiar filtros',
        'filtros.vacio': '😕 Ningún digimon cumple esa combinación.',
    },

    en: {
        // Top bar
        'logo.alt': 'Digimon logo',
        'logo.ayuda': 'Back to the start',
        'combate.consigna': 'Pick 2 Digimon to simulate a battle',
        'combate.contador': 'Digimon picked',
        'combate.contador.limpiar': 'Clear the picked digimon',
        'combate.iniciar': 'Start Battle',
        'combate.iniciar.ayuda': 'Pick 2 Digimon to start the battle',
        'niveles.rotulo': 'Levels',
        'niveles.ayuda.japon': 'Level names: Japan (Child, Adult, Perfect…). Tap to use the US ones (Rookie, Champion, Ultimate…)',
        'niveles.ayuda.eeuu': 'Level names: USA (Rookie, Champion, Ultimate…). Tap to use the Japanese ones (Child, Adult, Perfect…)',
        'menu.atributos': 'Attributes info',
        'menu.elementos': 'Elements info',
        'menu.niveles': 'Levels info',
        'menu.misc': 'Misc. info',
        'menu.abrir': 'More options',
        'idioma.cambiar': 'Change language (Español / English)',
        'carga.rotulo': 'Loading progress of <br>Digimon:',

        // Displayed names
        'atributo.Datos': 'Data',
        'atributo.Virus': 'Virus',
        'atributo.Vacuna': 'Vaccine',
        'atributo.Libre': 'Free',
        'atributo.Variable': 'Variable',
        'atributo.Desconocido': 'Unknown',
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
        'carta.infoAtributo': '{atributo} attribute info',
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
        'aviso.audio': "Use this button to mute the page's sound",
        'aviso.tema': "Use this button to choose the theme: light, dark or your device's",
        'aviso.audio.vibracion': "Use this button to turn off the page's sound and vibration",
        'aviso.zoomExtra':
            'With the mouse over the card, scroll up to zoom in even closer, and scroll down to go back. Once zoomed in, grab the card and drag it around',
        'carta.especie': 'Species',
        'carta.campos': 'Groups',
        'carta.estreno': 'Release',
        'carta.nombreOriginal': 'Original name (Japan)',
        'carta.nombreOccidental': 'Western name',
        'ataques.boton': '⚔️ Attacks',
        'ataques.boton.ayuda': 'See all its attacks',
        'ataques.titulo': "⚔️ {nombre}'s attacks",
        'ataques.ayuda': 'Tap an attack to see what it does and who uses it',
        'ataques.quienesUsan': 'Other Digimons that use this attack ({n}):',
        'ataques.quienesUsan.uno': 'Another Digimon that uses this attack:',
        'ataques.soloEste': 'Only this Digimon uses this specific attack.',
        'ataques.sinDescripcion': 'This attack has no detailed description.',
        'ataques.irACarta': 'Go to card',
        'ataques.traduccion': 'Name translation',
        'combate.usa': 'uses',
        'audio.silenciar': 'Mute the sound',
        'audio.activar': 'Turn the sound on',
        'audio.todo': 'Sound and vibration on. Tap to turn off just the sound',
        'audio.vibracion': 'Vibration only, no sound. Tap to turn off the vibration too',
        'audio.nada': 'No sound or vibration. Tap to turn everything on',
        'inclinacion.normal': 'Cards tilt when the mouse moves over them (not while holding Shift). Click to invert it',
        'inclinacion.invertida': 'Cards tilt only while you hold Shift. Click to make them tilt when the mouse moves over them',
        'tema.auto': 'Automatic theme: it follows your device (now, {actual}). Tap to choose the light one',
        'tema.claro': 'Light theme. Tap to choose the dark one',
        'tema.oscuro': "Dark theme. Tap to go back to automatic (your device's)",
        'tema.actual.claro': 'light',
        'tema.actual.oscuro': 'dark',
        'carta.sinDescripcion': 'No description available.',
        'carta.idiomaOriginal': '',

        // Battle
        'combate.preparando': 'Getting the battle ready...',
        'combate.peleando': 'The Digimon are fighting!',
        'combate.ganador': 'The winner is {nombre}!',
        'aceptar': 'OK',

        // Info windows (attributes, elements and levels)
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
        'atributo.pie': 'Each attribute advantage adds {p}% to the chance of winning.',
        'atributo.pieSin': 'Attributes without an advantage neither add nor subtract chance in battle.',
        'elemento.pie': 'Each element advantage adds {p}% to the chance of winning.',
        'elemento.pieNeutro': 'The Neutral element neither adds nor subtracts chance in battle.',
        'nivel.pie': 'Each level of difference with the rival adds or subtracts {p}% to the chance of winning.',
        'nivel.pieAlto':
            'It breaks the scale: in battle it weighs as much as a level {n}. Each level of difference with the rival adds or subtracts {p}% to the chance of winning, and against a rival far below, attribute and element barely count.',
        'nivel.pieSin': 'Without a level, no chance is added or subtracted in battle.',
        'atributo.desc.Datos': 'Data Digimon have balanced abilities.',
        'atributo.desc.Virus': 'Virus Digimon have offensive abilities.',
        'atributo.desc.Vacuna': 'Vaccine Digimon stand out for their defensive abilities.',
        'atributo.desc.Libre': 'Free Digimon have no defined attribute, so they are balanced in combat.',
        'atributo.desc.Variable': 'Variable Digimon are adaptable, with changing abilities; they can be hard to predict.',
        'atributo.desc.Desconocido': 'Unknown Digimon have an unclassified attribute, which makes them unpredictable in combat.',
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
        'nivel.desc.Adult':
            'A mature form with attacks of its own; the most common in the series. The Armor digimon (red circle with an "A" on the card) and the human forms of the Hybrids (green circle with an "H") are here too.',
        'nivel.desc.Perfect':
            'Great power and devastating attacks; far above the {nivel:Adult} level. The beast forms of the Hybrids (green circle with an "H" on the card) are here too.',
        'nivel.desc.Ultimate':
            'The most powerful of a normal evolution, like WarGreymon or MetalGarurumon. The fusions and supreme forms of the Hybrids (green circle with an "H" on the card) are here too.',
        'nivel.desc.Super Ultimate':
            'A level made up for this simulator: above {nivel:Ultimate}. Royal Knights, Sovereigns and Demon Lords, whose power breaks the normal scale.',
        'nivel.desc.Absolute': 'A level made up for this simulator: the highest of all. Beings able to destroy or to rule the whole digital world.',
        'nivel.desc.Desconocido': 'The API does not report its level.',

        // Windows for the card marks (X-Antibody, Armor, Hybrid and Xros Wars): opened by tapping the mark on the card or from "Misc. info"
        'misc.enCarta': 'On the card',
        'misc.buscar': 'How to find them',
        'misc.nivel': 'Level in the simulator',
        'misc.xantibody.titulo': '🧬 X-Antibody',
        'misc.xantibody.desc':
            'The X-Antibody is a factor some Digimon acquire that gives them an "X" form: renewed versions of already known Digimon, which tend to look stronger. It is not a level, an attribute or an element: it is a mark of its own.',
        'misc.xantibody.enCarta': 'Pink gem with an "X" at the top left, and "(X-Antibody)" in the name',
        'misc.xantibody.buscar': 'With the X-Antibody button in the filters (with or without it) or by typing X-Antibody in the search box',
        'misc.xantibody.pie': 'It adds or subtracts nothing in battle: what counts is its level, its attribute and its element.',
        'misc.armor.titulo': '🛡️ Armor',
        'misc.armor.desc':
            'Armor evolution (Digimon Adventure 02): a Digimon joins a Digi-Egg and takes a new form, without following the normal evolution levels. There are very few, and in this simulator they are not a level of their own: each one sits inside a normal level.',
        'misc.armor.enCarta': 'Red circle with an "A" at the top left',
        'misc.armor.nivel': 'All of them are {nivel:Adult}',
        'misc.armor.buscar': 'By typing Armor in the search box',
        'misc.armor.pie': 'In battle it counts as a Digimon of its level: it adds or subtracts nothing for being Armor.',
        'misc.hybrid.titulo': '🌀 Hybrid',
        'misc.hybrid.desc':
            'The Hybrids (Digimon Frontier) are the forms the heroes take when they use a Spirit, not through normal evolution. There are human forms, beast forms and fusions, with very different power, and they are not a level of their own either: each one sits inside a normal level.',
        'misc.hybrid.enCarta': 'Green circle with an "H" at the top left',
        'misc.hybrid.nivel': 'Human: {nivel:Adult}. Beast: {nivel:Perfect}. Fusions and supreme forms: {nivel:Ultimate}',
        'misc.hybrid.buscar': 'By typing Hybrid in the search box',
        'misc.hybrid.pie': 'In battle it counts as a Digimon of its level: it adds or subtracts nothing for being Hybrid.',
        'misc.xroswars.titulo': '🔶 Xros Wars',
        'misc.xroswars.desc':
            'The Digimon from the Digimon Xros Wars series and its sequel (The Young Hunters), whose central idea is DigiXros: Digimon that fuse to form a new, stronger one.',
        'misc.xroswars.enCarta': 'Orange circle with "XW" at the top left',
        'misc.xroswars.buscar': 'By typing Xros Wars in the search box',
        'misc.xroswars.pie':
            'It is an approximation: the API does not have this data, so the Digimon released between 2010 and 2012 (those of those series) are marked. It adds or subtracts nothing in battle.',

        // Filters and search
        'filtros.titulo': 'Filters',
        'filtros.region': 'Digimon filters and search',
        'filtros.buscar': 'Search Digimon by name or number',
        'filtros.borrarBusqueda': 'Clear search',
        'filtros.atributo': 'Attribute',
        'filtros.campo': 'Group',
        'filtros.especie': 'Species',
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
        'filtros.porAtributo': 'Filter by attribute',
        'filtros.porCampo': 'Filter by group',
        'filtros.porEspecie': 'Filter by species',
        'filtros.buscarEspecie': 'Search species…',
        'filtros.familias': 'Families',
        'filtros.especies': 'Species',
        'filtros.familia': '{nombre} family: ticks its {n} species at once',
        'filtros.familia.todas': '{nombre} (all)',
        'filtros.orden': 'Sort',
        'filtros.ordenarPor': 'Sort by',
        'filtros.orden.id': 'Number (ID)',
        'filtros.orden.az': 'Alphabetical (A–Z)',
        'filtros.orden.id.ayuda': 'Sorts by ID number, which matches the release date: from the oldest to the newest (ascending)',
        'filtros.orden.az.ayuda': 'Sorts by name, from A to Z (ascending)',
        'filtros.orden.id.corto': 'ID',
        'filtros.orden.az.corto': 'A–Z',
        'filtros.porNivel': 'Filter by level',
        'filtros.porElemento': 'Filter by element',
        'filtros.estreno': 'Release',
        'filtros.porEstreno': 'Filter by release date',
        'filtros.estreno.titulo': 'Release year',
        'filtros.estreno.desde': 'From',
        'filtros.estreno.hasta': 'To',
        'filtros.estreno.libre': 'No limit',
        'filtros.estreno.rango': '{desde}–{hasta}',
        'filtros.estreno.uno': '{desde}',
        'filtros.estreno.desdeSolo': 'from {desde}',
        'filtros.estreno.hastaSolo': 'up to {hasta}',
        'filtros.activos': 'Active filters',
        'filtros.quitar': 'Remove {grupo}: {valor}',
        'filtros.cuenta': 'Showing {v} of {n} Digimon',
        'filtros.cuenta.corta': '{v} of {n}',
        'filtros.limpiar': 'Clear ✕',
        'filtros.limpiarTodo': 'Clear filters',
        'filtros.vacio': '😕 No Digimon match that combination.',
    },
};

// ---- Elección del idioma -------------------------------------------------------------------------------------------
function idiomaGuardado() {
    const guardado = leerTexto('idioma'); // null si no hay nada o si el navegador no deja leer (modo privado, por ejemplo)
    return IDIOMAS.includes(guardado) ? guardado : null;
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

export let idioma = detectarIdioma();

// ---- Textos --------------------------------------------------------------------------------------------------------
// t('clave') devuelve el texto en el idioma actual. Las variables van entre llaves: t('combate.ganador', { nombre: 'Agumon' })
export function t(clave, variables = {}) {
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
    guardarTexto('idioma', idioma); // si no se puede guardar, igual cambia mientras la página esté abierta
    aplicarTextos();
    emitir('idioma-cambiado', { idioma });
}

// Nombres para mostrar (el valor interno sigue siendo el de español)
export const nombreAtributo = atributo => t(`atributo.${atributo}`);
export const nombreElemento = elemento => t(`elemento.${elemento}`);

aplicarTextos();

document.getElementById('cambiar-idioma')?.addEventListener('click', () => cambiarIdioma(idioma === 'es' ? 'en' : 'es'));
