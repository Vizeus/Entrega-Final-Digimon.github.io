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
        'menu.grupos': 'Info. grupos',
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
        'carta.infoElemento': 'Información del elemento {elemento} (estimado por el simulador)',
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
        'info.verInfoDeElemento': 'Ver información de {nombre} (elemento estimado)',
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
        'misc.xantibody.buscar': 'Con el botón X-Antibody de los filtros (con o sin ella)',
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
        'misc.xroswars.titulo': '🔶 Xros Wars (fusiones XW)',
        'misc.xroswars.desc':
            'XW <b>no</b> quiere decir "digimon de la temporada Xros Wars": la marca es solo para las <b>fusiones temporales</b> de esa serie (y de su continuación, The Young Hunters). Con el DigiXros, varios digimon se fusionan por un rato para formar uno nuevo y más fuerte, y esa forma fusionada es la que lleva la marca (como los Shoutmon X2 a X7).',
        'misc.xroswars.enCarta': 'Círculo naranja con "XW" arriba a la izquierda',
        'misc.xroswars.si.etiqueta': 'La llevan',
        'misc.xroswars.si': 'Las fusiones temporales, como Shoutmon X2 a X7, los "Xros Up…", los "Gattai…" y algunas formas "… Mode"',
        'misc.xroswars.no.etiqueta': 'No la llevan',
        'misc.xroswars.no': 'Los digimon de esa temporada que no son fusiones, como Shoutmon, Ganemon o Gumdramon',
        'misc.xroswars.buscar': 'Con el botón Fusión XW de los filtros (con o sin la marca)',
        'misc.xroswars.pie':
            'La API no trae este dato, así que se reconocen por el nombre ("Xros Up", "Gattai", Shoutmon X2… X7), por la especie (Enhancement o Composite) y por una lista de fusiones conocidas: puede que falte alguna. No suma ni resta nada en el combate.',

        // Ventanas de los grupos (los "Fields" de la API): se abren desde "Info. grupos" o tocando un grupo en el dorso de la carta. Los nombres de los grupos no se traducen.
        'campo.donde': 'Dónde viven',
        'campo.quienes': 'Quiénes son',
        'campo.ejemplos': 'Ejemplos',
        'campo.enElSimulador': 'En el simulador',
        'campo.cuantos': '{n} de {total} digimon',
        'campo.pie':
            'El grupo es solo una etiqueta de la franquicia (por hábitat o temática): no suma ni resta nada en el combate. Un digimon puede estar en varios grupos a la vez, por eso las cuentas de todos los grupos suman más que el total.',
        'campo.naturespirits.desc':
            'Los digimon más cercanos a la naturaleza: criaturas de aspecto animal, insectos, dinosaurios y otros seres primitivos que viven en tierras verdes y desérticas. Suelen ser tranquilos a pesar de lo duro de su entorno.',
        'campo.naturespirits.donde': 'Praderas, bosques y desiertos',
        'campo.naturespirits.quienes': 'Animales, insectos y dinosaurios',
        'campo.deepsavers.desc':
            'Los digimon del mar digital y de las regiones heladas, casi todos de forma acuática. Su carácter cambia con el entorno: los que viven en aguas bravas tienden a ser más violentos.',
        'campo.deepsavers.donde': 'Océanos, mares y zonas heladas',
        'campo.deepsavers.quienes': 'Acuáticos y polares',
        'campo.nightmaresoldiers.desc':
            'Digimon sobrenaturales: fantasmas, demonios, muertos vivientes y criaturas del folclore. Se los asocia con bosques oscuros y siniestros, lugares embrujados y los ejércitos del mal.',
        'campo.nightmaresoldiers.donde': 'Bosques oscuros y lugares embrujados',
        'campo.nightmaresoldiers.quienes': 'Demonios, fantasmas y no muertos',
        'campo.windguardians.desc':
            'Digimon del cielo, de los bosques y de las zonas altas: sobre todo aves, criaturas voladoras y plantas. Sus territorios son peligrosos porque muchas de sus especies son violentas o venenosas.',
        'campo.windguardians.donde': 'Cielos, praderas, bosques y zonas altas',
        'campo.windguardians.quienes': 'Aves, voladores y plantas',
        'campo.metalempire.desc':
            'Digimon mecánicos o metálicos, desde máquinas completas hasta cyborgs, ligados a la industria y a las ciudades. Están organizados y en expansión, como un imperio.',
        'campo.metalempire.donde': 'Ciudades y zonas industriales',
        'campo.metalempire.quienes': 'Máquinas, cyborgs y mutantes',
        'campo.virusbusters.desc':
            'A diferencia de los otros grupos, no se define por un lugar sino por una misión: sus miembros se oponen a los digimon de atributo Virus. Los motivos son muy distintos: poderes sagrados, justicia o proteger ruinas. No todo digimon que persigue virus pertenece a este grupo.',
        'campo.virusbusters.donde': 'Lugares sagrados y ruinas',
        'campo.virusbusters.quienes': 'Ángeles, caballeros santos y cazavirus',
        'campo.dragonsroar.desc': 'Digimon cuyo núcleo digital lleva datos de dragón: dragones, dinosaurios y reptiles. Son poderosos y feroces.',
        'campo.dragonsroar.donde': 'Zonas volcánicas',
        'campo.dragonsroar.quienes': 'Dragones, dinosaurios y reptiles',
        'campo.jungletroopers.desc':
            'Digimon de la selva y del bosque, sobre todo insectos y plantas, cuyo cuerpo se adapta a su entorno y es sensible a los cambios en él. A diferencia de los de Nature Spirits, se dedican a proteger el ambiente del Mundo Digital.',
        'campo.jungletroopers.donde': 'Selvas y zonas tropicales',
        'campo.jungletroopers.quienes': 'Insectos y plantas',
        'campo.darkarea.desc':
            'El grupo del Área Oscura del Mundo Digital: un lugar sombrío donde viven digimon malignos, demoníacos y aterradores, entre ellos varios Reyes Demonio.',
        'campo.darkarea.donde': 'El Área Oscura',
        'campo.darkarea.quienes': 'Digimon malvados y demoníacos',
        'campo.unknown.desc':
            'El comodín de los grupos: reúne a los digimon de origen incierto o que no encajan en ninguno de los otros, muchas veces mutantes o criaturas extrañas. En el simulador también lleva a los digimon a los que la API no les trae ningún grupo.',
        'campo.unknown.donde': 'Sin lugar fijo',
        'campo.unknown.quienes': 'Mutantes y criaturas extrañas',

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
        // (se habla de "fusión XW" y no de "Xros Wars" a secas: el botón no filtra los digimon de esa serie, sino las fusiones temporales DigiXros)
        'filtros.xw': 'Fusión XW',
        'filtros.xw.con': 'Con fusión XW',
        'filtros.xw.sin': 'Sin fusión XW',
        'filtros.xw.boton.indistinto': 'Fusión XW',
        'filtros.xw.boton.con': 'Con XW',
        'filtros.xw.boton.sin': 'Sin XW',
        'filtros.xw.ayuda.indistinto':
            'Fusión XW: indistinto. Un clic para ver solo las fusiones temporales de Xros Wars (DigiXros), como los Shoutmon X2 a X7',
        'filtros.xw.ayuda.con':
            'Solo las fusiones temporales de Xros Wars. Un clic para ver todo lo demás (incluso los digimon de esa serie que no son fusiones)',
        'filtros.xw.ayuda.sin':
            'Todo menos las fusiones temporales de Xros Wars (los digimon de esa serie que no son fusiones sí aparecen). Un clic para volver a ver todas',
        'filtros.busqueda': 'Búsqueda',
        'filtros.porAtributo': 'Filtrar por atributo',
        'filtros.porCampo': 'Filtrar por grupo',
        'filtros.porEspecie': 'Filtrar por especie',
        'filtros.buscarEspecie': 'Buscar especie…',
        'filtros.familias': 'Familias',
        'filtros.especies': 'Especies',
        'filtros.familia': 'Familia {nombre}: marca de una vez sus {n} especies',
        'filtros.familia.todas': '{nombre} (todas)',
        'filtros.agrupar': 'Agrupar',
        'filtros.agruparPor': 'Agrupar por',
        'filtros.agrupar.nota':
            'Se agrupa en el orden en que los marques. Dentro de cada bloque rige el Orden elegido. Un digimon con varios grupos va en el más chico de los suyos.',
        'filtros.agrupar.ayuda.sin': 'Junta los digimon en bloques: por ejemplo, todos los de nivel 1, luego todos los de nivel 2, y así',
        'filtros.agrupar.ayuda.con': 'Agrupado por: {criterios}',
        'filtros.agrupar.lugar': 'Se agrupa en el lugar {n}. Un clic para sacarlo',
        'filtros.agrupar.sacada': 'Un clic para agrupar por este dato',
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
        'menu.grupos': 'Groups info',
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
        'carta.infoElemento': '{elemento} element info (estimated by the simulator)',
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
        'info.verInfoDeElemento': 'View info for {nombre} (estimated element)',
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
        'misc.xantibody.buscar': 'With the X-Antibody button in the filters (with or without it)',
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
        'misc.xroswars.titulo': '🔶 Xros Wars (XW fusions)',
        'misc.xroswars.desc':
            'XW does <b>not</b> mean "a digimon from the Xros Wars season": the mark is only for the <b>temporary fusions</b> of that series (and its sequel, The Young Hunters). With DigiXros, several digimon fuse for a while into a new, stronger one, and that fused form is the one that carries the mark (like Shoutmon X2 to X7).',
        'misc.xroswars.enCarta': 'Orange circle with "XW" at the top left',
        'misc.xroswars.si.etiqueta': 'They have it',
        'misc.xroswars.si': 'The temporary fusions, like Shoutmon X2 to X7, the "Xros Up…" and "Gattai…" forms and some "… Mode" forms',
        'misc.xroswars.no.etiqueta': 'They do not',
        'misc.xroswars.no': 'The digimon of that season that are not fusions, like Shoutmon, Ganemon or Gumdramon',
        'misc.xroswars.buscar': 'With the XW fusion button in the filters (with or without the mark)',
        'misc.xroswars.pie':
            'The API does not have this data, so they are recognized by name ("Xros Up", "Gattai", Shoutmon X2… X7), by species (Enhancement or Composite) and by a list of known fusions: some may be missing. It adds or subtracts nothing in battle.',

        // Windows for the groups (the API's "Fields"): opened from "Groups info" or by tapping a group on the back of a card. Group names are not translated.
        'campo.donde': 'Where they live',
        'campo.quienes': 'Who they are',
        'campo.ejemplos': 'Examples',
        'campo.enElSimulador': 'In the simulator',
        'campo.cuantos': '{n} of {total} Digimon',
        'campo.pie':
            'A group is just a label from the franchise (by habitat or theme): it adds or subtracts nothing in battle. A Digimon can be in several groups at once, so the counts of all the groups add up to more than the total.',
        'campo.naturespirits.desc':
            'The Digimon closest to nature: animal-like creatures, insects, dinosaurs and other primitive beings living in green lands and deserts. They tend to be calm despite how harsh their surroundings are.',
        'campo.naturespirits.donde': 'Grasslands, forests and deserts',
        'campo.naturespirits.quienes': 'Animals, insects and dinosaurs',
        'campo.deepsavers.desc':
            'The Digimon of the digital sea and the icy regions, almost all of them aquatic in shape. Their temper changes with their surroundings: those living in rough waters tend to be more violent.',
        'campo.deepsavers.donde': 'Oceans, seas and icy regions',
        'campo.deepsavers.quienes': 'Aquatic and polar Digimon',
        'campo.nightmaresoldiers.desc':
            'Supernatural Digimon: ghosts, demons, the undead and creatures out of folklore. They are tied to dark, sinister forests, haunted places and the armies of evil.',
        'campo.nightmaresoldiers.donde': 'Dark forests and haunted places',
        'campo.nightmaresoldiers.quienes': 'Demons, ghosts and the undead',
        'campo.windguardians.desc':
            'Digimon of the sky, the forests and the high places: mostly birds, flying creatures and plants. Their lands are dangerous because many of their species are violent or poisonous.',
        'campo.windguardians.donde': 'Skies, grasslands, forests and high places',
        'campo.windguardians.quienes': 'Birds, flyers and plants',
        'campo.metalempire.desc':
            'Mechanical or metallic Digimon, from full machines to cyborgs, tied to industry and cities. They are organized and expanding, like an empire.',
        'campo.metalempire.donde': 'Cities and industrial areas',
        'campo.metalempire.quienes': 'Machines, cyborgs and mutants',
        'campo.virusbusters.desc':
            'Unlike the other groups, it is defined not by a place but by a mission: its members stand against Virus-attribute Digimon. Their reasons vary widely: holy powers, justice or protecting ruins. Not every Digimon that hunts viruses belongs to this group.',
        'campo.virusbusters.donde': 'Holy places and ruins',
        'campo.virusbusters.quienes': 'Angels, holy knights and virus hunters',
        'campo.dragonsroar.desc': 'Digimon whose digital core holds dragon data: dragons, dinosaurs and reptiles. They are powerful and fierce.',
        'campo.dragonsroar.donde': 'Volcanic areas',
        'campo.dragonsroar.quienes': 'Dragons, dinosaurs and reptiles',
        'campo.jungletroopers.desc':
            "Digimon of the jungle and the woods, mostly insects and plants, whose bodies adapt to their surroundings and are sensitive to changes in them. Unlike those of Nature Spirits, they work to protect the Digital World's environment.",
        'campo.jungletroopers.donde': 'Jungles and tropical areas',
        'campo.jungletroopers.quienes': 'Insects and plants',
        'campo.darkarea.desc':
            "The group of the Digital World's Dark Area: a gloomy place where evil, demonic and frightening Digimon live, including several Demon Lords.",
        'campo.darkarea.donde': 'The Dark Area',
        'campo.darkarea.quienes': 'Evil and demonic Digimon',
        'campo.unknown.desc':
            'The wildcard of the groups: it gathers Digimon of uncertain origin or that fit none of the others, often mutants or strange creatures. In the simulator it also holds the Digimon the API gives no group at all.',
        'campo.unknown.donde': 'No fixed place',
        'campo.unknown.quienes': 'Mutants and strange creatures',

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
        // (it says "XW fusion" and not just "Xros Wars": the button does not filter the digimon of that series, only the temporary DigiXros fusions)
        'filtros.xw': 'XW fusion',
        'filtros.xw.con': 'With XW fusion',
        'filtros.xw.sin': 'Without XW fusion',
        'filtros.xw.boton.indistinto': 'XW fusion',
        'filtros.xw.boton.con': 'With XW',
        'filtros.xw.boton.sin': 'No XW',
        'filtros.xw.ayuda.indistinto': 'XW fusion: any. Click to show only the temporary Xros Wars (DigiXros) fusions, like Shoutmon X2 to X7',
        'filtros.xw.ayuda.con': 'Only the temporary Xros Wars fusions. Click to show everything else (even the digimon of that series that are not fusions)',
        'filtros.xw.ayuda.sin':
            'Everything but the temporary Xros Wars fusions (the digimon of that series that are not fusions do show up). Click to show them all again',
        'filtros.busqueda': 'Search',
        'filtros.porAtributo': 'Filter by attribute',
        'filtros.porCampo': 'Filter by group',
        'filtros.porEspecie': 'Filter by species',
        'filtros.buscarEspecie': 'Search species…',
        'filtros.familias': 'Families',
        'filtros.especies': 'Species',
        'filtros.familia': '{nombre} family: ticks its {n} species at once',
        'filtros.familia.todas': '{nombre} (all)',
        'filtros.agrupar': 'Group by', // ("Group" a secas se confundiría con el filtro de grupos)
        'filtros.agruparPor': 'Group the list by',
        'filtros.agrupar.nota':
            'Grouped in the order you tick them. Inside each block, the chosen Sort applies. A digimon with several groups goes in the smallest of its own.',
        'filtros.agrupar.ayuda.sin': 'Splits the list into blocks: for example, all the level 1s, then all the level 2s, and so on',
        'filtros.agrupar.ayuda.con': 'Grouped by: {criterios}',
        'filtros.agrupar.lugar': 'Grouped in position {n}. Click to remove it',
        'filtros.agrupar.sacada': 'Click to group by this one',
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
