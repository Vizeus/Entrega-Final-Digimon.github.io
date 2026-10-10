// -----------------------------------------------------------------------------------------------------------------
// LÍNEA EVOLUTIVA: el botón "🧬 Evolución" del dorso de cada carta abre una ventana con un árbol:
//
//      viene de  ──▶  [este digimon]  ──▶  evoluciona a
//
// Los datos salen de digi-api.com (priorEvolutions / nextEvolutions). Para no mostrar cosas raras se filtra:
//   - solo aparecen los digimons que están en este simulador (en la carta ya tenemos su imagen, nivel y nombre);
//   - una "evolución" que va para el lado contrario (un nivel más bajo en "evoluciona a", o más alto en "viene de")
//     se descarta, porque la API también anota las involuciones;
//   - una variante del mismo digimon del mismo nivel (Agumon → Agumon (X-Antibody)) tampoco cuenta como evolución.
// La API no trae huevos: a los Baby I no les anota de quién vienen. Para que igual tengan su "viene de", en esa columna se
// dibuja un Digitama (huevo); cuál de los cuatro diseños le toca a cada digimon es al azar, no es un dato de la API.
// Como hay digimons con decenas de evoluciones, de cada lado se ven las primeras TOPE_RAMAS (las de nivel más cercano)
// y un botón despliega el resto. Al tocar un digimon del árbol, el árbol se centra en él (y hay un botón para volver).
// -----------------------------------------------------------------------------------------------------------------

import { CON_MOUSE } from './util.js';
import { COLOR_NIVEL, COLOR_NIVEL_DESCONOCIDO, EMOJIS_ELEMENTO, EMOJIS_ATRIBUTO } from './datos.js';
import { DICCIONARIO, nombreElemento, nombreAtributo, t } from './i18n.js';
import { centrarVentana, conCruzDeCierre, mantenerEnSuLugar } from './ventanas.js';
import { cartaPorId, listaDigimons, nombreNivel } from './pagina.js';
import { nombreCompleto, reducirMovimiento } from './cartas.js';
import { inicioDeLoAparte } from './nombres.js';
import { cartaEnZoom, cerrarZoom } from './zoom.js';
import { activarBotonDelDorso } from './gestos.js';
import { limpiarTodo } from './filtros.js';
import { FICHERO_DE_ATAQUES, sonidoFichero } from './sonidos.js';

Object.assign(DICCIONARIO.es, {
    'evo.boton': '🧬 Evolución',
    'evo.boton.ayuda': 'Ver la línea evolutiva',
    'evo.titulo': '🧬 Línea evolutiva',
    'evo.viene': 'Viene de',
    'evo.va': 'Evoluciona a',
    'evo.vacio': 'Sin registros',
    'evo.huevo': 'Digitama',
    'evo.huevo.tipo': 'Huevo',
    'evo.huevo.ayuda': 'Digitama (huevo)',
    'evo.masN': 'Ver las {n} restantes',
    'evo.menos': 'Ver menos',
    'evo.volver': '← Volver',
    'evo.irCarta': '📍 Ir a la carta',
    'evo.condicion': 'Condición (en inglés): {c}',
    'evo.pie': 'Tocá uno para ver su propia línea.',
    // Etiquetas de las ramas que no siguen la "escalera" normal (y lo que dicen al pasar el mouse)
    'evo.et.armor': '🛡️ Armor',
    'evo.et.armor.ayuda': 'Evolución Armor: se logra con un Digihuevo, sin seguir los niveles normales.',
    'evo.et.hybrid': '🌀 Hybrid',
    'evo.et.hybrid.ayuda': 'Forma Hybrid: se obtiene con un Spirit, no por la evolución normal.',
    'evo.et.fusion': '🧬 Fusión',
    'evo.et.fusion.ayuda': 'Fusión de dos o más digimons (DNA o Jogress).',
    'evo.et.salto': '⏩ Salto de nivel',
    'evo.et.salto.ayuda': 'Se saltea uno o más niveles.',
    'evo.et.lateral': '↔️ Mismo nivel',
    'evo.et.lateral.ayuda': 'Evolución al mismo nivel: una forma alternativa.',
    // Texto desplegable al pie de la ventana
    'evo.lore.titulo': 'ℹ️ ¿Por qué hay evoluciones raras?',
    'evo.lore.1':
        'Digimon no tiene una sola historia: el anime, cada juego, las cartas y los mangas tienen su propia versión de quién evoluciona a quién. Esta lista junta todas, así que no es una escalera perfecta.',
    'evo.lore.2':
        'Por eso aparecen saltos de nivel, formas del mismo nivel y evoluciones especiales: fusiones (DNA o Jogress, dos digimons que se unen), Armor e Hybrid. Una etiqueta te dice cuál es cada caso.',
    'evo.lore.puntero': 'Dejá el puntero quieto sobre un digimon o sobre una etiqueta como “Salto de nivel” para ver un poco más de información.',
});

Object.assign(DICCIONARIO.en, {
    'evo.boton': '🧬 Evolution',
    'evo.boton.ayuda': 'See the evolution line',
    'evo.titulo': '🧬 Evolution line',
    'evo.viene': 'Evolves from',
    'evo.va': 'Evolves into',
    'evo.vacio': 'No records',
    'evo.huevo': 'Digitama',
    'evo.huevo.tipo': 'Egg',
    'evo.huevo.ayuda': 'Digitama (egg)',
    'evo.masN': 'Show the other {n}',
    'evo.menos': 'Show less',
    'evo.volver': '← Back',
    'evo.irCarta': '📍 Go to the card',
    'evo.condicion': 'Condition: {c}',
    'evo.pie': 'Tap one to see its own line.',
    // Tags for the branches that don't follow the normal "ladder" (and what they say on hover)
    'evo.et.armor': '🛡️ Armor',
    'evo.et.armor.ayuda': 'Armor evolution: it happens with a Digi-Egg, without following the normal levels.',
    'evo.et.hybrid': '🌀 Hybrid',
    'evo.et.hybrid.ayuda': 'Hybrid form: it is obtained with a Spirit, not through normal evolution.',
    'evo.et.fusion': '🧬 Fusion',
    'evo.et.fusion.ayuda': 'Fusion of two or more digimons (DNA or Jogress).',
    'evo.et.salto': '⏩ Level jump',
    'evo.et.salto.ayuda': 'It skips one or more levels.',
    'evo.et.lateral': '↔️ Same level',
    'evo.et.lateral.ayuda': 'Evolution to the same level: an alternate form.',
    // Expandable text at the bottom of the window
    'evo.lore.titulo': 'ℹ️ Why are there odd evolutions?',
    'evo.lore.1':
        "Digimon doesn't have a single story: the anime, each game, the cards and the manga all have their own version of who evolves into whom. This list puts them all together, so it is not a perfect ladder.",
    'evo.lore.2':
        'That is why you will see level jumps, forms of the same level and special evolutions: fusions (DNA or Jogress, two digimons joining), Armor and Hybrid. A tag tells you which case each one is.',
    'evo.lore.puntero': 'Rest the pointer on a digimon or on a tag like “Level jump” to see a bit more information.',
});

const TOPE_RAMAS = 5; // cuántas ramas se ven de cada lado, como mucho, antes de tocar "ver las restantes"
// Al abrir, de cada lado solo se ven las ramas que están a esta cantidad de niveles o menos del digimon (0 = mismo nivel). El resto
// (saltos grandes, fusiones lejanas...) queda detrás de "ver las restantes". Si ninguna entra en el rango, se ven las más cercanas.
const RANGO_DE_NIVELES = 1;
// Las fusiones (DNA, Jogress...) la API no las marca como tales: se reconocen por el texto de la condición (en inglés)
const CONDICION_DE_FUSION = /\b(dna|jogress|fusion|fuse[ds]?|biomerge|matrix|mix|combine[ds]?)\b/i;

// ---- Datos ---------------------------------------------------------------------------------------------------------
// Las evoluciones de cada digimon ya vienen con su carta: api.js las trae junto con el resto de los datos (todas las cartas las
// tienen, también las propias), así que acá no se pide nada a la API. Forma: { previas: [{ id, condicion }], siguientes: [...] }
const evolucionesDe = carta => carta.datosDorso.evo;

// ---- Qué ramas se muestran -----------------------------------------------------------------------------------------
const nivelDe = carta => (carta.dataset.nivel === undefined ? undefined : Number(carta.dataset.nivel));
const nombreDe = nombreCompleto;
// El nombre sin lo que va aparte (lo que está entre paréntesis o entre guiones): sirve para saber si dos son variantes del mismo digimon
const sinParentesis = texto => {
    const posicion = inicioDeLoAparte(texto);
    return (posicion > 0 ? texto.slice(0, posicion) : texto).trim().toLowerCase();
};

// Qué tipo de evolución "especial" es una rama (o null si sigue la escalera normal). Armor y Hybrid se saben por la marca de la carta
// (la del digimon que evoluciona: el de destino en "evoluciona a", el actual en "viene de"); la fusión, por el texto de la condición.
function etiquetaDeRama(carta, otra, condicion, distancia, sentido) {
    const marca = (sentido > 0 ? otra : carta).dataset.marca;
    if (marca === 'Armor') return 'armor';
    if (marca === 'Hybrid') return 'hybrid';
    if (/armor/i.test(condicion)) return 'armor';
    if (CONDICION_DE_FUSION.test(condicion)) return 'fusion';
    if (distancia === undefined) return null;
    if (distancia >= 2) return 'salto';
    if (distancia === 0) return 'lateral';
    return null;
}

// Cuántas ramas se ven sin tocar "ver las restantes" (las ya vienen ordenadas de la más cercana a la más lejana)
function cuantasSeVen(ramas) {
    const conNivel = ramas.filter(rama => rama.distancia !== undefined);
    if (conNivel.length === 0) return Math.min(ramas.length, TOPE_RAMAS);
    let cercanas = conNivel.filter(rama => rama.distancia <= RANGO_DE_NIVELES).length;
    if (cercanas === 0) {
        const minima = Math.min(...conNivel.map(rama => rama.distancia));
        cercanas = conNivel.filter(rama => rama.distancia === minima).length;
    }
    return Math.min(cercanas, TOPE_RAMAS);
}

// sentido: -1 = "viene de", +1 = "evoluciona a". Devuelve las cartas del simulador que sirven, las más cercanas primero.
function armarRamas(lista, carta, sentido) {
    const nivel = nivelDe(carta);
    const base = sinParentesis(nombreDe(carta));
    const vistos = new Set([Number(carta.dataset.id)]);
    const ramas = [];

    for (const { id, condicion } of lista) {
        if (vistos.has(id)) continue;
        vistos.add(id);

        const otra = cartaPorId(id);
        if (!otra) continue; // no está en el simulador

        const nivelOtra = nivelDe(otra);
        if (nivel !== undefined && nivelOtra !== undefined) {
            if ((nivelOtra - nivel) * sentido < 0) continue; // va para el lado contrario
            if (nivelOtra === nivel && sinParentesis(nombreDe(otra)) === base) continue; // variante del mismo digimon
        }
        const distancia = nivel !== undefined && nivelOtra !== undefined ? Math.abs(nivelOtra - nivel) : undefined;
        ramas.push({ carta: otra, nivel: nivelOtra, condicion, distancia, etiqueta: etiquetaDeRama(carta, otra, condicion, distancia, sentido) });
    }

    // "evoluciona a": de menor a mayor nivel; "viene de": de mayor a menor (el más cercano primero). Sin nivel, al final.
    const orden = nivelRama => (nivelRama === undefined ? 99 : nivelRama * sentido);
    ramas.sort((a, b) => orden(a.nivel) - orden(b.nivel) || nombreDe(a.carta).localeCompare(nombreDe(b.carta)));
    return ramas;
}

// ---- Piezas de la ventana ------------------------------------------------------------------------------------------
function colorDelNivel(nivel) {
    return COLOR_NIVEL[nivel] || COLOR_NIVEL_DESCONOCIDO;
}

// Nombre con lo que va entre paréntesis o entre guiones en una línea aparte, más chica (igual que en las cartas)
function crearNombreEvo(nombre) {
    const elemento = document.createElement('span');
    elemento.className = 'evo-nombre';
    const posicion = inicioDeLoAparte(nombre);
    if (posicion > 0) {
        const aparte = document.createElement('small');
        aparte.textContent = nombre.slice(posicion);
        elemento.append(nombre.slice(0, posicion).trim(), aparte);
    } else {
        elemento.textContent = nombre;
    }
    return elemento;
}

function crearNivelEvo(carta) {
    const elemento = document.createElement('span');
    elemento.className = 'evo-nv';
    elemento.textContent = nombreNivel(carta.dataset.nivelApi);
    return elemento;
}

function imagenDe(carta) {
    const imagen = document.createElement('img');
    imagen.src = carta.querySelector('.c-arte img').src; // la misma que ya cargó la carta
    imagen.alt = '';
    imagen.draggable = false;
    return imagen;
}

// Huevos: cuatro diseños, cada uno con su color (manchas verdes, rayas azules, rayas naranjas y manchas rosas).
// A cada digimon le toca uno "al azar", pero siempre el mismo: sale de un número mezclado a partir de su ID.
const FORMA_HUEVO = 'M20 4 C27 4 33 16 33 25 C33 32 27 37 20 37 C13 37 7 32 7 25 C7 16 13 4 20 4 Z';
const DISENOS_HUEVO = [
    {
        color: '#34b868',
        dibujo: '<circle cx="15" cy="15" r="3"/><circle cx="23" cy="23" r="3.6"/><circle cx="13" cy="28" r="3.4"/><circle cx="25" cy="32" r="2.4"/><circle cx="27" cy="14" r="1.8"/>',
    },
    { color: '#3a93e0', dibujo: '<path d="M6 14 Q20 20 34 14 V21 Q20 27 6 21 Z"/><path d="M6 26 Q20 32 34 26 V28.6 Q20 34.6 6 28.6 Z"/>' },
    { color: '#f0952b', dibujo: '<path d="M6 10 Q20 14 34 10 V16 Q20 20 6 16 Z"/><path d="M6 23 Q20 27 34 23 V30 Q20 34 6 30 Z"/>' },
    {
        color: '#ee5f9f',
        dibujo: '<circle cx="24" cy="17" r="4.6"/><circle cx="14" cy="27" r="5.2"/><circle cx="26" cy="31" r="1.9"/><circle cx="13" cy="14" r="1.7"/>',
    },
];

function disenoDeHuevo(carta) {
    const id = Number(carta.dataset.id);
    return DISENOS_HUEVO[Math.imul(id ^ (id >>> 3), 2246822519) >>> 30]; // mezcla los bits del ID: queda parejo y sin patrón
}

function crearHuevo(diseno) {
    const caja = document.createElement('span');
    caja.className = 'evo-huevo-img';
    caja.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true">
        <defs><clipPath id="huevo-forma"><path d="${FORMA_HUEVO}"/></clipPath></defs>
        <path class="h-cuerpo" d="${FORMA_HUEVO}"/>
        <g clip-path="url(#huevo-forma)">
            <g class="h-dibujo">${diseno.dibujo}</g>
            <ellipse class="h-sombra" cx="28" cy="31" rx="10" ry="11"/>
        </g>
        <ellipse class="h-brillo" cx="15" cy="13" rx="3" ry="5" transform="rotate(25 15 13)"/>
    </svg>`;
    return caja;
}

// El Digitama del "viene de" de un Baby I: no se toca (no hay línea evolutiva para un huevo)
function crearNodoHuevo(carta) {
    const diseno = disenoDeHuevo(carta);
    const nodo = document.createElement('div');
    nodo.className = 'evo-nodo evo-huevo';
    nodo.style.setProperty('--c', diseno.color); // el borde de la cajita toma el color del huevo
    nodo.title = t('evo.huevo.ayuda');

    const texto = document.createElement('span');
    texto.className = 'evo-txt';
    const nivel = document.createElement('span');
    nivel.className = 'evo-nv';
    nivel.textContent = t('evo.huevo.tipo');
    texto.append(crearNombreEvo(t('evo.huevo')), nivel);
    nodo.append(crearHuevo(diseno), texto);
    return nodo;
}

function crearNodo({ carta, nivel, condicion, etiqueta, huevo }) {
    if (huevo) return crearNodoHuevo(carta);
    const nodo = document.createElement('button');
    nodo.type = 'button';
    nodo.className = 'evo-nodo';
    nodo.dataset.id = carta.dataset.id;
    nodo.style.setProperty('--c', colorDelNivel(nivel));
    const lineas = [nombreDe(carta)];
    if (etiqueta) lineas.push(t(`evo.et.${etiqueta}.ayuda`));
    if (condicion) lineas.push(t('evo.condicion', { c: condicion }));
    nodo.title = lineas.join('\n');

    const texto = document.createElement('span');
    texto.className = 'evo-txt';
    texto.append(crearNombreEvo(nombreDe(carta)), crearNivelEvo(carta));
    if (etiqueta) {
        const marca = document.createElement('span');
        marca.className = `evo-etiqueta evo-et-${etiqueta}`;
        marca.textContent = t(`evo.et.${etiqueta}`);
        texto.append(marca);
    }
    nodo.append(imagenDe(carta), texto);
    return nodo;
}

function crearCentro(carta) {
    const centro = document.createElement('div');
    centro.className = 'evo-centro';

    const caja = document.createElement('div');
    caja.className = 'evo-actual';
    caja.style.setProperty('--c', colorDelNivel(nivelDe(carta)));

    const { atributo, elemento } = carta.dataset;
    const datos = document.createElement('span');
    datos.className = 'evo-datos';
    datos.textContent = `${nombreAtributo(atributo)} ${EMOJIS_ATRIBUTO[atributo]} · ${nombreElemento(elemento)} ${EMOJIS_ELEMENTO[elemento]}`;

    caja.append(imagenDe(carta), crearNombreEvo(nombreDe(carta)), crearNivelEvo(carta), datos);

    const ir = document.createElement('button');
    ir.type = 'button';
    ir.className = 'evo-ir';
    ir.dataset.ir = carta.dataset.id;
    ir.textContent = t('evo.irCarta');

    centro.append(caja, ir);
    return centro;
}

function crearColumna(clase, rotulo, ramas) {
    const columna = document.createElement('section');
    columna.className = `evo-col ${clase}`;

    const titulo = document.createElement('h5');
    titulo.textContent = rotulo;
    columna.append(titulo);

    if (ramas.length === 0) {
        const vacio = document.createElement('p');
        vacio.className = 'evo-vacio';
        vacio.textContent = t('evo.vacio');
        columna.classList.add('vacia');
        columna.append(vacio);
        return columna;
    }

    const visibles = cuantasSeVen(ramas);
    const lista = document.createElement('ul');
    lista.className = 'evo-lista';
    ramas.forEach((rama, posicion) => {
        const item = document.createElement('li');
        item.classList.toggle('extra', posicion >= visibles);
        item.classList.toggle('primera', posicion === 0);
        item.classList.toggle('ultima', posicion === visibles - 1);
        item.classList.toggle('unica', visibles === 1);
        item.append(crearNodo(rama));
        lista.append(item);
    });
    columna.append(lista);

    if (ramas.length > visibles) {
        const mas = document.createElement('button');
        mas.type = 'button';
        mas.className = 'evo-mas';
        mas.dataset.extras = ramas.length - visibles;
        mas.setAttribute('aria-expanded', 'false');
        mas.textContent = t('evo.masN', { n: ramas.length - visibles });
        columna.append(mas);
    }
    return columna;
}

function crearFlechaVertical() {
    const flecha = document.createElement('div');
    flecha.className = 'evo-flecha-v';
    flecha.setAttribute('aria-hidden', 'true');
    flecha.textContent = '▼';
    return flecha;
}

// ---- La ventana ----------------------------------------------------------------------------------------------------
let estadoEvo = null; // { historial: [ids de los digimons por los que se fue pasando] }

const contenedorEvo = () => document.querySelector('.swal2-html-container .evo');

function crearBarraVolver() {
    const barra = document.createElement('div');
    barra.className = 'evo-barra';
    const volver = document.createElement('button');
    volver.type = 'button';
    volver.className = 'evo-volver';
    volver.textContent = t('evo.volver');
    barra.append(volver);
    return barra;
}

// El texto desplegable que explica por qué las líneas evolutivas de Digimon no son una escalera perfecta
function crearLoreEvo() {
    const detalle = document.createElement('details');
    detalle.className = 'evo-lore';
    detalle.open = Boolean(estadoEvo?.loreAbierto); // al pasar a otro digimon del árbol queda como estaba
    let estaba = detalle.open; // si estaba abierto la última vez: al volver a armarlo ya abierto no tiene que sonar
    detalle.addEventListener('toggle', () => {
        if (estadoEvo) estadoEvo.loreAbierto = detalle.open;
        if (detalle.open === estaba) return;
        estaba = detalle.open;
        sonidoFichero(detalle.open, FICHERO_DE_ATAQUES); // el fichero que se abre o se cierra (sonidos.js): sin tecla, como los ataques
    });

    const titulo = document.createElement('summary');
    titulo.textContent = t('evo.lore.titulo');
    // Se abre y se cierra acá y no con lo que hace solo el navegador, para que el título se quede en su lugar (ver mantenerEnSuLugar, en ventanas.js)
    titulo.addEventListener('click', evento => {
        evento.preventDefault();
        mantenerEnSuLugar(titulo, () => {
            detalle.open = !detalle.open;
            ajustarAlturaDeListas(); // (acá y no después: así la ventana se corre una sola vez, con el alto que va a tener)
        });
        // Con una lista recortada la ventana ocupa toda la pantalla y el texto se abre achicando las listas: el botón sube en vez de quedarse, porque dejarlo
        // en su lugar sacaría la ventana de la pantalla. Se la deja centrada.
        if (hayListaConScroll()) centrarVentana();
    });

    const parrafos = [t('evo.lore.1'), t('evo.lore.2')];
    // Solo con mouse: el dato extra de cada digimon (qué es la etiqueta, la condición) está en el texto que aparece al dejar el puntero encima
    if (CON_MOUSE.matches) parrafos.push(t('evo.lore.puntero'));
    const cuerpo = document.createElement('div');
    cuerpo.className = 'evo-lore-texto';
    for (const texto of parrafos) {
        const parrafo = document.createElement('p');
        parrafo.textContent = texto;
        cuerpo.append(parrafo);
    }

    detalle.append(titulo, cuerpo);
    return detalle;
}

function crearPieEvo() {
    const pie = document.createElement('p');
    pie.className = 'info-pie';
    pie.textContent = t('evo.pie');
    return pie;
}

// Una lista desplegada reparte sus ramas en una grilla de una, dos o tres columnas, según el ancho que le toque (la ventana se ensancha al desplegar una lista:
// ver ".popup-evo" y ".evo-col.abierta" en el CSS). Cuando solo entra una columna, la lista tiene que medir lo de una rama y no lo de toda la columna: si no, la
// rama queda contra un costado y el rótulo ("Viene de" / "Evoluciona a") y el botón "ver menos" quedan centrados sobre la columna entera y no sobre las ramas. El
// CSS no puede saber cuántas columnas le tocaron a la grilla, por eso se mira acá y se le pone la clase "una-pista" a la columna (se mide con el ancho que le da
// el CSS sin la clase, y se la pone después). Se vuelve a medir al desplegar o recoger una lista y cada vez que cambia el ancho del árbol (al agrandar o achicar
// la ventana del navegador).
let anchoDelArbol = 0;
const ajustarListasDesplegadas = () => {
    const columnas = [...(contenedorEvo()?.querySelectorAll('.evo-col.abierta') ?? [])];
    columnas.forEach(columna => columna.classList.remove('una-pista'));
    // Primero se miran todas y recién después se les pone la clase (al achicarse una, la otra recibe más lugar y ya no mediría lo mismo)
    const angostas = columnas.filter(columna => {
        const estilo = getComputedStyle(columna.querySelector('.evo-lista'));
        // (en el celular la lista no es una grilla sino filas que se parten: ahí no hace falta nada)
        return estilo.display === 'grid' && estilo.gridTemplateColumns.split(' ').length === 1;
    });
    angostas.forEach(columna => columna.classList.add('una-pista'));
    ajustarAlturaDeListas(); // (con otras columnas las listas miden otro alto)
};
const observadorDelArbol = new ResizeObserver(entradas => {
    const ancho = entradas[entradas.length - 1].contentRect.width;
    if (ancho === anchoDelArbol) return; // (solo importa el ancho: un cambio de alto no cambia cuántas columnas entran)
    anchoDelArbol = ancho;
    ajustarListasDesplegadas();
});

// Una lista desplegada con muchas ramas no puede ser más alta que la pantalla: si lo fuera, se desplazaría la ventana entera (con el título, el digimon del
// medio y la otra lista). En cambio, cada lista desplegada tiene su propio scroll vertical y el resto de la ventana se queda quieto. El CSS no sabe cuánto
// lugar sobra, así que se calcula acá y se escribe en --alto-de-lista (en el árbol; el CSS se lo pone a las listas desplegadas): es lo que mide la pantalla
// menos lo que ocupa todo lo de la ventana que no es la lista (el título, el pie, el texto desplegable, lo que sobra arriba y abajo del árbol...).
// Ese "resto" es siempre el alto de la ventana menos el del árbol, valga lo que valga la lista en ese momento, así que el resultado es el mismo con la lista
// ya recortada o sin recortar, y volver a calcularlo no cambia nada. En el celular las listas no tienen scroll propio (el árbol va en una columna: ver el CSS).
const AIRE_DE_LA_VENTANA = 8; // px de pantalla que quedan libres arriba y abajo de la ventana, además del margen del contenedor de SweetAlert
const ALTO_MINIMO_DE_LISTA = 150; // aunque la pantalla sea muy baja, la lista deja ver al menos dos o tres ramas

function ajustarAlturaDeListas() {
    const arbol = contenedorEvo()?.querySelector('.evo-arbol');
    const ventana = Swal.getPopup();
    const contenedor = Swal.getContainer();
    if (!arbol || !ventana || !contenedor) return;

    const sinScroll = arbol.querySelector('.evo-col.abierta') === null || getComputedStyle(arbol).flexDirection === 'column';
    if (sinScroll) {
        arbol.style.removeProperty('--alto-de-lista');
        return;
    }

    // Todo en píxeles de la pantalla (lo que devuelve getBoundingClientRect). La ventana puede estar agrandada con "zoom" (pantallas grandes): lo que se
    // le escribe al CSS tiene que estar en píxeles de la ventana, o sea, dividido por cuánto se agranda
    const alturaDeLaVentana = ventana.getBoundingClientRect().height;
    const agrandada = ventana.offsetHeight ? alturaDeLaVentana / ventana.offsetHeight : 1;
    const altoDelArbol = Math.max(...[...arbol.querySelectorAll('.evo-col, .evo-centro')].map(elemento => elemento.getBoundingClientRect().height));
    const estilo = getComputedStyle(contenedor);
    const libre = window.innerHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom) - 2 * AIRE_DE_LA_VENTANA;
    const resto = alturaDeLaVentana - altoDelArbol;

    // Tampoco tiene sentido una lista más baja que lo que ya mide el árbol por otro lado (el digimon del medio, una lista sin desplegar): la ventana no
    // se achicaría, y la lista quedaría con menos ramas a la vista para nada
    const delResto = Math.max(
        0,
        ...[...arbol.querySelectorAll('.evo-centro, .evo-col:not(.abierta)')].map(elemento => elemento.getBoundingClientRect().height),
    );
    const alto = Math.max(ALTO_MINIMO_DE_LISTA, Math.ceil(delResto / agrandada), Math.floor((libre - resto) / agrandada));
    if (arbol.style.getPropertyValue('--alto-de-lista') !== `${alto}px`) arbol.style.setProperty('--alto-de-lista', `${alto}px`);
}
const hayListaConScroll = () =>
    [...(contenedorEvo()?.querySelectorAll('.evo-col.abierta .evo-lista') ?? [])].some(lista => lista.scrollHeight > lista.clientHeight + 1);

// Cambia el alto de la ventana (se despliega el texto "¿Por qué hay evoluciones raras?", se cambia de idioma, se desplegó o recogió una lista...): se recalcula
const observadorDeLaVentana = new ResizeObserver(() => ajustarAlturaDeListas());
window.addEventListener('resize', () => {
    if (estadoEvo) ajustarAlturaDeListas(); // (el alto de la pantalla cambia sin que cambie el de la ventana, cuando la lista ya está recortada)
});

function pintarEvolucion() {
    const contenedor = contenedorEvo();
    if (!contenedor || !estadoEvo) return;

    const id = estadoEvo.historial[estadoEvo.historial.length - 1];
    const carta = cartaPorId(id);
    const barra = estadoEvo.historial.length > 1 ? [crearBarraVolver()] : [];
    const datos = evolucionesDe(carta);

    const previas = armarRamas(datos.previas, carta, -1);
    if (previas.length === 0 && carta.dataset.nivelApi === 'Baby I') previas.push({ huevo: true, carta });
    const siguientes = armarRamas(datos.siguientes, carta, +1);

    const arbol = document.createElement('div');
    arbol.className = 'evo-arbol';
    const centro = crearCentro(carta);
    centro.classList.toggle('con-previas', previas.length > 0);
    centro.classList.toggle('con-siguientes', siguientes.length > 0);

    arbol.append(crearColumna('evo-prev', t('evo.viene'), previas));
    if (previas.length) arbol.append(crearFlechaVertical());
    arbol.append(centro);
    if (siguientes.length) arbol.append(crearFlechaVertical());
    arbol.append(crearColumna('evo-sig', t('evo.va'), siguientes));

    contenedor.replaceChildren(...barra, arbol, crearLoreEvo(), crearPieEvo());
    centrarVentana(); // (el árbol nuevo puede tener otro alto: la ventana vuelve a quedar centrada)
    observadorDelArbol.disconnect();
    anchoDelArbol = 0;
    observadorDelArbol.observe(arbol); // (avisa enseguida, y así se ajustan las listas que ya vengan desplegadas)
    observadorDeLaVentana.disconnect();
    observadorDeLaVentana.observe(Swal.getPopup());
}

// ---- Ir a la carta: se cierra la ventana, se centra la carta en la parte visible de la pantalla y se la resalta ----
const DURACION_DESTELLO_MS = 2300; // un poco más que la animación del CSS (2,1 s), para sacar la clase cuando ya terminó

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

// SweetAlert2 restaura la página (scroll y ancho de la barra de desplazamiento) recién cuando termina de cerrarse.
// Si se scrollea antes, el layout se mueve después y la carta queda mal ubicada.
async function esperarQueCierreLaVentana() {
    for (let intentos = 0; intentos < 40 && document.querySelector('.swal2-container'); intentos++) {
        await esperar(25);
    }
    await esperar(60);
}

// Cuánto falta scrollear para que la carta quede centrada en la parte de la pantalla que no tapa la barra fija de arriba
function desvioParaCentrar(carta) {
    const barra = document.getElementById('navbar');
    const tapado = barra ? Math.max(0, barra.getBoundingClientRect().bottom) : 0;
    const visible = window.innerHeight - tapado;
    const caja = carta.getBoundingClientRect();
    return caja.top - tapado - (visible - caja.height) / 2;
}

// Scroll animado hecho a mano: a diferencia del scroll suave del navegador, siempre termina en el lugar pedido,
// aunque la página esté ocupada (las cartas siguen cargando) o el usuario mueva el mouse en el medio.
function scrollAnimado(destino, duracion) {
    return new Promise(resolve => {
        const origen = window.scrollY;
        const inicio = performance.now();
        const paso = () => {
            const avance = duracion > 0 ? Math.min(1, (performance.now() - inicio) / duracion) : 1;
            const suave = 1 - (1 - avance) ** 3; // arranca rápido y frena al llegar
            window.scrollTo({ top: origen + (destino - origen) * suave, behavior: 'instant' });
            if (avance < 1) setTimeout(paso, 16);
            else resolve();
        };
        paso();
    });
}

// Las últimas filas no se pueden centrar si la página termina justo debajo de ellas: se agrega al final el espacio que falta
function asegurarEspacioAbajo(faltante) {
    if (faltante <= 0) return;
    const actual = parseFloat(getComputedStyle(listaDigimons).paddingBottom) || 0;
    listaDigimons.style.paddingBottom = `${Math.ceil(actual + faltante)}px`;
}

// Lleva la carta al centro y después revisa si el layout se movió por el camino, y corrige (hasta 4 veces)
async function centrarCarta(carta) {
    for (let intento = 0; intento < 4; intento++) {
        const desvio = desvioParaCentrar(carta);
        if (Math.abs(desvio) <= 2) return;
        const antes = window.scrollY;
        const ideal = antes + desvio;
        asegurarEspacioAbajo(ideal - (document.documentElement.scrollHeight - window.innerHeight));
        const maximo = document.documentElement.scrollHeight - window.innerHeight;
        const destino = Math.max(0, Math.min(ideal, maximo));
        if (Math.abs(destino - antes) < 1) return; // ya está arriba de todo (las primeras filas no se pueden bajar más)
        const duracion = intento === 0 && !reducirMovimiento ? Math.min(900, 350 + Math.abs(destino - antes) / 6) : 0;
        await scrollAnimado(destino, duracion);
    }
}

function resaltarCarta(carta) {
    clearTimeout(carta.temporizadorDestello);
    carta.classList.remove('evo-resaltada');
    void carta.offsetWidth; // reinicia la animación si ya la tenía
    carta.classList.add('evo-resaltada');
    carta.temporizadorDestello = setTimeout(() => carta.classList.remove('evo-resaltada'), DURACION_DESTELLO_MS);
}

export async function irALaCarta(id) {
    const carta = cartaPorId(id);
    Swal.close();
    const zoomActivo = cartaEnZoom || document.querySelector('.zoom-activa');
    if (zoomActivo) await cerrarZoom({ rapido: true });
    if (!carta) return;
    await esperarQueCierreLaVentana();
    if (carta.classList.contains('filtrada')) limpiarTodo({ conAgrupar: false }); // si los filtros la estaban escondiendo, se sacan (lo agrupado no esconde nada: queda)
    await centrarCarta(carta);
    resaltarCarta(carta); // el destello empieza cuando la carta ya está en el centro, así se ve completo
}

function alTocarEnEvolucion(evento) {
    const objetivo = evento.target;
    const nodo = objetivo.closest('.evo-nodo[data-id]'); // el huevo no tiene data-id: no lleva a ningún lado
    if (nodo) {
        estadoEvo.historial.push(Number(nodo.dataset.id));
        return pintarEvolucion();
    }
    if (objetivo.closest('.evo-volver')) {
        estadoEvo.historial.pop();
        return pintarEvolucion();
    }
    const ir = objetivo.closest('.evo-ir');
    if (ir) {
        return irALaCarta(ir.dataset.ir);
    }
    const mas = objetivo.closest('.evo-mas');
    if (mas) {
        const columna = mas.closest('.evo-col');
        const abierta = columna.classList.toggle('abierta');
        mas.setAttribute('aria-expanded', String(abierta));
        mas.textContent = abierta ? t('evo.menos') : t('evo.masN', { n: mas.dataset.extras });
        ajustarListasDesplegadas();
    }
}

export function abrirEvolucion(carta) {
    estadoEvo = { historial: [Number(carta.dataset.id)], loreAbierto: false };
    Swal.fire({
        title: t('evo.titulo'),
        html: '<div class="evo"></div>',
        showConfirmButton: false,
        ...conCruzDeCierre(),
        width: 'min(96vw, 920px)',
        customClass: { popup: 'popup-evo' },
        didOpen: () => {
            contenedorEvo().addEventListener('click', alTocarEnEvolucion);
            pintarEvolucion();
        },
        willClose: () => {
            estadoEvo = null;
            observadorDelArbol.disconnect();
            observadorDeLaVentana.disconnect();
        },
    });
}

// Si se cambia de idioma con la ventana abierta, se vuelve a escribir en el idioma nuevo. Y lo mismo si se cambia el sistema de
// niveles: los niveles del árbol se escriben con los nombres del sistema nuevo. (Lo pone en marcha main.js.)
export function activarEvolucion() {
    document.addEventListener('idioma-cambiado', () => {
        if (!estadoEvo) return;
        const titulo = Swal.getTitle();
        if (titulo) titulo.textContent = t('evo.titulo');
        pintarEvolucion();
    });
    document.addEventListener('niveles-cambiados', () => {
        if (estadoEvo) pintarEvolucion();
    });
}

// ---- El botón del dorso --------------------------------------------------------------------------------------------
export function crearBotonEvolucion(carta) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'c-evo';
    boton.textContent = t('evo.boton');
    boton.title = t('evo.boton.ayuda');
    activarBotonDelDorso(boton, () => abrirEvolucion(carta)); // toque rápido con el dedo y hundimiento (gestos.js)
    return boton;
}
