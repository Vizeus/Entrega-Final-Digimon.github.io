// -----------------------------------------------------------------------------------------------------------------
// FILTROS Y BUSCADOR
//
//   · Cinco filtros (atributo, nivel, elemento, grupo y especie): dentro de un mismo filtro se pueden elegir varias opciones (alcanza con
//     que cumpla una) y entre filtros distintos tienen que cumplirse todos.
//   · Los grupos son los "Fields" de la API (Deep Savers, Metal Empire...) y las especies, sus "types" (Alien, Cyborg, Slime...). Un digimon
//     puede tener varios o ninguno, y sus opciones no están escritas de antemano: se suman a medida que llegan los digimons
//     (descubrirOpciones). El panel de las especies, que son muchísimas, lleva arriba una cajita para buscar entre ellas.
//   · El filtro de estreno es un período de años (desde, hasta o los dos): la API solo trae el año de estreno de cada digimon.
//   · Cada opción muestra cuántos digimons quedarían si se elige, teniendo en cuenta los otros filtros y la búsqueda.
//   · El buscador ignora mayúsculas, acentos, espacios de más y signos (v-mon = vmon), acepta varias palabras en cualquier orden
//     y también el número del digimon ("15" o "#15").
//   · Las cartas que no cumplen se esconden con la clase "filtrada" (el CSS las oculta). Las cartas llegan de a poco
//     mientras carga la página: cartas.js avisa con el evento "carta-agregada" y se vuelven a hacer las cuentas.
//   · "Ordenar por" (no filtra nada): la lista va por número (ID, el de siempre) o en orden alfabético por el nombre que se ve en la carta.
//   · "Agrupar" (tampoco filtra): junta en bloques los digimons con el mismo atributo, nivel, elemento o grupo, en el orden en que se marcaron
//     los criterios; dentro de cada bloque rige el orden de arriba.
// Los textos vienen de i18n.js y se vuelven a escribir cuando cambia el idioma.
// -----------------------------------------------------------------------------------------------------------------

import {
    COLOR_BUSQUEDA,
    COLOR_CAMPO,
    COLOR_ESPECIE,
    COLOR_ELEMENTO,
    COLOR_ESTRENO,
    COLOR_NIVEL,
    COLOR_NIVEL_DESCONOCIDO,
    COLOR_ATRIBUTO,
    COLOR_X,
    COLOR_XW,
    EMOJIS_ELEMENTO,
    EMOJIS_ATRIBUTO,
    FAMILIAS_DE_ESPECIES_A_MANO,
    ORDEN_CAMPOS,
    ORDEN_ELEMENTOS,
    ORDEN_NIVELES,
    PRIORIDAD_DE_CAMPOS,
    SIN_DATO,
    numeracionNiveles,
} from './datos.js';
import { nombreElemento, nombreAtributo, t } from './i18n.js';
import { listaDigimons, nombreNivel } from './pagina.js';
import { nombreApiCompleto, nombreCompleto, nombreOccidentalCompleto, separarXAntibody } from './cartas.js';

// Cada filtro: qué opciones tiene (con el nombre interno), cómo se llama cada una y qué lleva de ícono (o null si no lleva)
const GRUPOS_FILTRO = {
    atributo: {
        claves: ['Vacuna', 'Virus', 'Datos', 'Libre', 'Variable', 'Desconocido'],
        nombre: nombreAtributo,
        color: clave => COLOR_ATRIBUTO[clave],
        icono: clave => ({ clase: 'f-e', texto: EMOJIS_ATRIBUTO[clave] }),
    },
    nivel: {
        claves: ORDEN_NIVELES,
        nombre: nombreNivel, // sigue el sistema de clasificación vigente
        color: clave => COLOR_NIVEL[numeracionNiveles[clave]] || COLOR_NIVEL_DESCONOCIDO,
        icono: clave => ({ clase: 'f-lv', texto: numeracionNiveles[clave] ?? '?' }), // el poder del nivel, en un círculo
    },
    elemento: {
        claves: ORDEN_ELEMENTOS,
        nombre: nombreElemento,
        color: clave => COLOR_ELEMENTO[clave],
        icono: clave => ({ clase: 'f-e', texto: EMOJIS_ELEMENTO[clave] }),
    },
    // Grupos (los "Fields" de la API): las opciones se suman a medida que llegan los digimons (descubrirOpciones), así que "claves" empieza vacío.
    // Cada carta trae una lista (puede estar vacía) y alcanza con que tenga uno de los elegidos. Son nombres propios: se ven como los trae la API.
    // Son muchas opciones: no llevan ícono (icono: null) y todas tienen el mismo color (un tono apagado).
    campo: {
        claves: [],
        nombre: clave => clave,
        color: () => COLOR_CAMPO,
        icono: () => null,
    },
    // Especies (los "types" de la API): igual que los grupos, las opciones se suman a medida que llegan los digimons, sin ícono y con un solo color (otro tono, para no confundir sus etiquetas con las de grupo).
    especie: {
        claves: [],
        nombre: clave => clave,
        color: () => COLOR_ESPECIE,
        icono: () => null,
    },
    // X-Antibody y Xros Wars: no tienen panel de opciones; se manejan con un solo botón cada uno (.f-xa y .f-xw) que rota entre "indistinto"
    // (nada elegido), "con" y "sin"
    x: {
        claves: ['con', 'sin'],
        soloBoton: true,
        nombre: clave => t(`filtros.x.${clave}`),
        color: () => COLOR_X,
        icono: () => ({ clase: 'f-e', texto: 'X' }),
    },
    xw: {
        claves: ['con', 'sin'],
        soloBoton: true,
        nombre: clave => t(`filtros.xw.${clave}`),
        color: () => COLOR_XW,
        icono: () => ({ clase: 'f-e', texto: 'XW' }),
    },
};
const GRUPOS = Object.keys(GRUPOS_FILTRO);

// Blanco u oscuro para el texto, según qué tan claro es el color de fondo
function colorDelTexto(hex) {
    const canal = posicion => {
        const valor = parseInt(hex.slice(posicion, posicion + 2), 16) / 255;
        return valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
    };
    const luminancia = 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
    return luminancia > 0.3 ? '#2b2400' : '#fff';
}

// ---- Elementos de la página ----------------------------------------------------------------------------------------
const seccionFiltros = document.getElementById('filtros');
const cajaBusqueda = seccionFiltros.querySelector('.f-buscar input');
const botonBorrarBusqueda = seccionFiltros.querySelector('.f-x');
const botonesDeTresEstados = seccionFiltros.querySelectorAll('.f-tres'); // X-Antibody y Xros Wars (su data-g dice de qué filtro es cada uno)
const zonaActivos = seccionFiltros.querySelector('.f-activos');
const textoCuenta = seccionFiltros.querySelector('.f-cuenta');
const botonLimpiar = seccionFiltros.querySelector('.f-resumen .f-limpiar');
const avisoVacio = document.getElementById('f-vacio');

// ---- Qué está elegido ----------------------------------------------------------------------------------------------
const elegidos = { atributo: new Set(), nivel: new Set(), elemento: new Set(), campo: new Set(), especie: new Set(), x: new Set(), xw: new Set() };
let desdeAnio = null; // estreno: primer año del período (null: sin límite)
let hastaAnio = null; // estreno: último año del período (null: sin límite)
const aniosVistos = new Set(); // los años de estreno de los digimons que ya llegaron (son los que se pueden elegir)
let busqueda = ''; // lo que se escribió, ya normalizado (para comparar)
let busquedaEscrita = ''; // lo que se escribió, tal cual (para mostrar en la etiqueta)

// ---- Buscador ------------------------------------------------------------------------------------------------------
// "Agúmon  X" -> "agumon x": sin acentos, en minúscula y con un solo espacio entre palabras
const normalizar = texto => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const compactar = texto => texto.replace(/[^a-z0-9]/g, ''); // "v-mon (black)" -> "vmonblack"

// De los grupos de una carta, el más específico (el de menos digimons): es el que cuenta al agrupar. Sin grupos, "Unknown" (ver SIN_DATO).
// Lo que no está en PRIORIDAD_DE_CAMPOS (un grupo nuevo de la API) gana a todos.
function campoPrincipal(campos) {
    if (!campos?.length) return SIN_DATO;
    const prioridad = campo => PRIORIDAD_DE_CAMPOS.indexOf(campo);
    return campos.reduce((elegido, campo) => (prioridad(campo) < prioridad(elegido) ? campo : elegido));
}

// Lo que se necesita saber de cada carta para filtrarla (se calcula una sola vez)
function datosDeFiltro(carta) {
    if (!carta.datosFiltro) {
        // Se busca por los dos nombres del digimon (el original de la API y el occidental), sin el "(X-Antibody)": eso se filtra con su botón.
        // El que se ve es siempre uno de los dos, así que no hace falta volver a calcularlo si cambia el idioma.
        const sinX = nombre => normalizar(separarXAntibody(nombre).nombre);
        const nombres = [...new Set([nombreCompleto(carta), nombreApiCompleto(carta), nombreOccidentalCompleto(carta)].map(sinX))].map(nombre => ({
            nombre,
            compacto: compactar(nombre),
        }));
        carta.datosFiltro = {
            atributo: carta.dataset.atributo,
            nivel: carta.dataset.nivelApi,
            elemento: carta.dataset.elemento,
            // los grupos y las especies de la carta: listas (a diferencia de los demás datos, que son un solo valor)
            campo: carta.datosDorso?.campos ?? [],
            campoPrincipal: campoPrincipal(carta.datosDorso?.campos), // el único grupo en que va al agrupar la lista (ver PRIORIDAD_DE_CAMPOS)
            especie: carta.datosDorso?.especies ?? [],
            x: carta.dataset.xAntibody ? 'con' : 'sin', // si tiene X-Antibody
            xw: carta.dataset.xrosWars ? 'con' : 'sin', // si lleva la marca XW (forma fusionada de Digimon Xros Wars: ver datos.js)
            marca: carta.dataset.marca ? normalizar(carta.dataset.marca) : null, // 'armor' o 'hybrid'
            id: Number(carta.dataset.id),
            anio: Number(String(carta.datosDorso?.estreno ?? '').match(/\d{4}/)?.[0]) || null, // el año de estreno (null si no se sabe)
            nombres,
        };
    }
    return carta.datosFiltro;
}

// ¿Su año de estreno cae dentro del período elegido? Sin ningún límite elegido entran todas; con alguno, las que no tienen año quedan afuera
function coincideEstreno(anio) {
    if (desdeAnio === null && hastaAnio === null) return true;
    return anio !== null && (desdeAnio === null || anio >= desdeAnio) && (hastaAnio === null || anio <= hastaAnio);
}

function coincideBusqueda(datos, consulta) {
    if (!consulta) return true;

    // Si lo escrito es un número ("15" o "#15") también sirve el número del digimon
    const numero = consulta.match(/^#?(\d+)$/);
    if (numero && datos.id === Number(numero[1])) return true;

    // Cada palabra tiene que estar en el mismo nombre (en cualquier orden): en el original o en el occidental, pero sin mezclarlos,
    // o bien coincidir con una marca especial de la carta (Armor o Hybrid; X-Antibody y Xros Wars tienen su propio botón).
    // Las que no llevan signos también se buscan sin signos: "vmon", "wargreymon"
    const palabras = consulta.split(' ');
    const coincideMarca = palabra => {
        if (!datos.marca) return false;
        if (datos.marca === 'armor')
            return (
                palabra === 'armor' ||
                palabra === 'armors' ||
                palabra === 'armour' ||
                palabra === 'armours' ||
                palabra === 'armadura' ||
                palabra === 'armaduras'
            );
        if (datos.marca === 'hybrid') return palabra === 'hybrid' || palabra === 'hybrids' || palabra === 'hibrido' || palabra === 'hibridos';
        return datos.marca.includes(palabra);
    };

    return datos.nombres.some(({ nombre, compacto }) =>
        palabras.every(palabra => coincideMarca(palabra) || nombre.includes(palabra) || (/^[a-z0-9]+$/.test(palabra) && compacto.includes(palabra))),
    );
}

// ---- Opciones (chips) ----------------------------------------------------------------------------------------------
function crearChip(grupo, clave) {
    const definicion = GRUPOS_FILTRO[grupo];
    const color = definicion.color(clave);
    const icono = definicion.icono(clave);

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'f-chip';
    chip.dataset.g = grupo;
    chip.dataset.k = clave;
    chip.setAttribute('aria-pressed', 'false');
    chip.style.setProperty('--c', color);
    chip.style.setProperty('--t', colorDelTexto(color));
    chip.classList.toggle('sin-icono', !icono);
    chip.innerHTML = `${icono ? `<span class="${icono.clase}">${icono.texto}</span>` : ''}<span class="f-k"></span><i>0</i>`;
    return chip;
}

function crearChips() {
    for (const [grupo, definicion] of Object.entries(GRUPOS_FILTRO)) {
        if (definicion.soloBoton) continue; // sin panel de opciones
        const panel = seccionFiltros.querySelector(`.f-grupo[data-g="${grupo}"] .f-panel`);
        for (const clave of definicion.claves) {
            panel.append(crearChip(grupo, clave));
        }
    }
}

// Filtros cuyas opciones llegan con los digimons: en qué orden se muestran y cuáles ya se vieron.
// Grupos: primero los conocidos (en el orden de datos.js) y después los que traiga la API y no estén ahí, por orden alfabético.
// Especies: por orden alfabético.
const lugarDelCampo = clave => {
    const lugar = ORDEN_CAMPOS.indexOf(clave);
    return lugar === -1 ? ORDEN_CAMPOS.length : lugar;
};
const OPCIONES_QUE_LLEGAN = {
    campo: { orden: (a, b) => lugarDelCampo(a) - lugarDelCampo(b) || a.localeCompare(b, 'en'), vistas: new Set() },
    especie: { orden: (a, b) => a.localeCompare(b, 'en'), vistas: new Set() },
};

// Suma al filtro las opciones que traiga una carta y todavía no estén (y deja todas en su orden)
function descubrirOpciones(grupo, valores) {
    const { orden, vistas } = OPCIONES_QUE_LLEGAN[grupo];
    const nuevas = valores.filter(valor => !vistas.has(valor));
    if (nuevas.length === 0) return;

    const claves = GRUPOS_FILTRO[grupo].claves;
    nuevas.forEach(valor => vistas.add(valor));
    claves.push(...nuevas);
    claves.sort(orden);

    const panel = seccionFiltros.querySelector(`.f-grupo[data-g="${grupo}"] .f-panel`);
    const lista = panel.querySelector('.f-especies') ?? panel; // las especies tienen su propia lista (la otra es la de las familias)
    const existentes = new Map([...lista.querySelectorAll('.f-chip')].map(chip => [chip.dataset.k, chip]));
    lista.append(...claves.map(clave => existentes.get(clave) ?? crearChip(grupo, clave))); // (al volver a poner uno que ya estaba, solo se lo cambia de lugar)
    if (grupo === 'especie') actualizarFamilias();
    etiquetarChips();
    buscarEntreLasOpciones(grupo); // si había algo escrito en la cajita de búsqueda, las nuevas también lo cumplen o se esconden
}

// ---- Familias de especies ------------------------------------------------------------------------------------------
// Grupos de especies que se marcan de una vez (ver FAMILIAS_DE_ESPECIES_A_MANO en datos.js). Lo elegido sigue siendo siempre la lista de especies:
// la familia es solo un atajo, y se ve marcada del todo, a medias o sin marcar según cuántas de sus especies estén elegidas.
let familias = new Map(); // nombre de la familia → Set con sus especies
let familiasDe = new Map(); // especie → nombres de las familias a las que pertenece

// Arma las familias con las palabras que comparten los nombres de las especies
function calcularFamilias(especies) {
    const palabras = nombre =>
        normalizar(nombre)
            .split(/[\s\-/]+/)
            .filter(palabra => palabra.length >= 3);
    const porClave = new Map(); // palabra (sin mayúsculas ni acentos) → { nombre, miembros }
    const sumar = (clave, nombre, especie) => {
        if (!porClave.has(clave)) porClave.set(clave, { nombre, miembros: new Set() });
        porClave.get(clave).miembros.add(especie);
    };
    for (const especie of especies) {
        for (const palabra of palabras(especie)) {
            // el nombre de la familia es la palabra tal cual está escrita en la especie ("Dragon"), no la normalizada
            const original = especie.split(/[\s\-/]+/).find(parte => normalizar(parte) === palabra) ?? palabra;
            sumar(palabra, original, especie);
        }
    }
    for (const [nombre, extra] of Object.entries(FAMILIAS_DE_ESPECIES_A_MANO)) {
        for (const especie of extra.filter(nombreExtra => especies.includes(nombreExtra))) sumar(normalizar(nombre), nombre, especie);
    }
    const resultado = new Map();
    const firmas = new Set(); // dos familias con exactamente las mismas especies serían lo mismo: se queda una
    const ordenadas = [...porClave.values()].filter(({ miembros }) => miembros.size >= 2).sort((a, b) => a.nombre.localeCompare(b.nombre, 'en'));
    for (const { nombre, miembros } of ordenadas) {
        const firma = [...miembros].sort().join('|');
        if (firmas.has(firma)) continue;
        firmas.add(firma);
        resultado.set(nombre, miembros);
    }
    return resultado;
}

// Cuántas especies de la familia están elegidas: 'false' (ninguna), 'mixed' (algunas) o 'true' (todas)
function estadoDeFamilia(nombre) {
    const miembros = familias.get(nombre);
    if (!miembros) return 'false';
    let elegidas = 0;
    for (const especie of miembros) if (elegidos.especie.has(especie)) elegidas++;
    return elegidas === 0 ? 'false' : elegidas === miembros.size ? 'true' : 'mixed';
}

function crearChipFamilia(nombre) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'f-chip f-familia';
    chip.dataset.g = 'especie';
    chip.dataset.fam = nombre;
    chip.setAttribute('aria-pressed', 'false');
    chip.style.setProperty('--c', COLOR_ESPECIE);
    chip.style.setProperty('--t', colorDelTexto(COLOR_ESPECIE));
    chip.innerHTML = '<span class="f-casilla" aria-hidden="true"></span><span class="f-k"></span><i>0</i>';
    return chip;
}

// Se rehacen cada vez que llega una especie nueva (las cartas llegan de a poco)
function actualizarFamilias() {
    familias = calcularFamilias(GRUPOS_FILTRO.especie.claves);
    familiasDe = new Map();
    for (const [nombre, miembros] of familias) {
        for (const especie of miembros) {
            if (!familiasDe.has(especie)) familiasDe.set(especie, []);
            familiasDe.get(especie).push(nombre);
        }
    }
    const lista = seccionFiltros.querySelector('.f-grupo[data-g="especie"] .f-familias');
    const existentes = new Map([...lista.querySelectorAll('.f-chip')].map(chip => [chip.dataset.fam, chip]));
    lista.replaceChildren(...[...familias.keys()].map(nombre => existentes.get(nombre) ?? crearChipFamilia(nombre)));
}

// Marca todas las especies de la familia, o las saca si ya estaban todas
function alternarFamilia(nombre) {
    const miembros = familias.get(nombre);
    if (!miembros) return;
    const todas = estadoDeFamilia(nombre) === 'true';
    for (const especie of miembros) {
        if (todas) {
            elegidos.especie.delete(especie);
        } else {
            elegidos.especie.add(especie);
        }
    }
}

// ---- Búsqueda dentro del panel (las especies) ----------------------------------------------------------------------
// Muestra solo las opciones que tienen lo escrito en el nombre (sin mayúsculas ni acentos). Las elegidas se ven siempre, así no se pierde de
// vista qué hay marcado.
function buscarEntreLasOpciones(grupo) {
    const caja = seccionFiltros.querySelector(`.f-grupo[data-g="${grupo}"] .f-opciones-buscar input`);
    if (!caja) return;
    const consulta = normalizar(caja.value);
    const panel = caja.closest('.f-panel');
    panel.classList.toggle('buscando', consulta !== ''); // mientras se busca se ven las dos listas (familias y especies) con sus títulos
    seccionFiltros.querySelectorAll(`.f-chip[data-g="${grupo}"]`).forEach(chip => {
        const { k: clave, fam } = chip.dataset;
        const elegida = fam ? estadoDeFamilia(fam) !== 'false' : elegidos[grupo].has(clave);
        const sirve = !consulta || normalizar(fam ?? clave).includes(consulta) || elegida;
        if (chip.hidden === sirve) chip.hidden = !sirve;
    });
    // un título sin ninguna opción debajo no se muestra
    panel.querySelectorAll('.f-subtitulo').forEach(titulo => {
        const hayAlgo = Boolean(titulo.nextElementSibling?.querySelector('.f-chip:not([hidden])'));
        if (titulo.hidden === hayAlgo) titulo.hidden = !hayAlgo;
    });
}

function borrarBusquedaDeOpciones(grupo) {
    const caja = seccionFiltros.querySelector(`.f-grupo[data-g="${grupo}"] .f-opciones-buscar input`);
    if (caja && caja.value !== '') {
        caja.value = '';
        buscarEntreLasOpciones(grupo);
    }
}

// Escribe en el idioma actual el nombre de cada opción
function etiquetarChips() {
    seccionFiltros.querySelectorAll('.f-chip').forEach(chip => {
        const { g: grupo, k: clave, fam } = chip.dataset;
        if (fam) {
            chip.querySelector('.f-k').textContent = fam; // las familias son nombres propios de la API: no se traducen
            chip.title = t('filtros.familia', { nombre: fam, n: familias.get(fam)?.size ?? 0 });
            return;
        }
        const nombre = GRUPOS_FILTRO[grupo].nombre(clave);
        chip.querySelector('.f-k').textContent = nombre;
        chip.title = `${t(`filtros.${grupo}`)}: ${nombre}`;
    });
}

// Una etiqueta de "filtros activos": al tocarla se saca ese filtro
function crearEtiqueta(grupo, clave, color, icono, texto, nombreGrupo) {
    const etiqueta = document.createElement('button');
    etiqueta.type = 'button';
    etiqueta.className = 'f-tag';
    etiqueta.dataset.g = grupo;
    etiqueta.dataset.k = clave;
    etiqueta.title = t('filtros.quitar', { grupo: nombreGrupo, valor: texto });
    etiqueta.style.setProperty('--c', color);
    etiqueta.style.setProperty('--t', colorDelTexto(color));

    const nombre = document.createElement('span');
    nombre.className = 'f-k';
    nombre.textContent = texto; // puede ser lo que escribió la persona: siempre como texto, nunca como HTML
    if (icono) {
        const marca = document.createElement('span');
        marca.className = icono.clase;
        marca.textContent = icono.texto;
        etiqueta.append(marca);
    } else {
        etiqueta.classList.add('sin-icono');
    }
    etiqueta.append(nombre);
    return etiqueta;
}

// El período de estreno elegido, con palabras: "2005–2010", "desde 2005", "hasta 2010" o "2005" (si es un solo año)
function textoDelPeriodo() {
    if (desdeAnio !== null && hastaAnio !== null)
        return t(desdeAnio === hastaAnio ? 'filtros.estreno.uno' : 'filtros.estreno.rango', { desde: desdeAnio, hasta: hastaAnio });
    return desdeAnio !== null ? t('filtros.estreno.desdeSolo', { desde: desdeAnio }) : t('filtros.estreno.hastaSolo', { hasta: hastaAnio });
}

let firmaEtiquetas = ''; // las etiquetas que hay ahora (para no rehacerlas si no cambiaron)
const PREFIJO_FAMILIA = 'familia:'; // en la etiqueta de una familia, la clave es este prefijo y el nombre de la familia

function escribirEtiquetas() {
    const etiquetas = [];
    if (busquedaEscrita) {
        etiquetas.push(crearEtiqueta('q', busquedaEscrita, COLOR_BUSQUEDA, { clase: 'f-e', texto: '🔍' }, `“${busquedaEscrita}”`, t('filtros.busqueda')));
    }
    for (const grupo of GRUPOS) {
        const definicion = GRUPOS_FILTRO[grupo];
        let claves = definicion.claves.filter(opcion => elegidos[grupo].has(opcion));
        if (grupo === 'especie') {
            // Una familia con todas sus especies elegidas es una sola etiqueta ("Dragon (todas)") en vez de una por especie. Las familias más
            // grandes van primero, y una que ya está cubierta por otras no se muestra. Las especies que no entran en ninguna etiqueta de familia van sueltas.
            const completas = [...familias.keys()]
                .filter(nombre => estadoDeFamilia(nombre) === 'true')
                .sort((a, b) => familias.get(b).size - familias.get(a).size || a.localeCompare(b, 'en'));
            const cubiertas = new Set();
            for (const nombre of completas) {
                const miembros = familias.get(nombre);
                if ([...miembros].every(especie => cubiertas.has(especie))) continue;
                miembros.forEach(especie => cubiertas.add(especie));
                etiquetas.push(
                    crearEtiqueta(grupo, `${PREFIJO_FAMILIA}${nombre}`, COLOR_ESPECIE, null, t('filtros.familia.todas', { nombre }), t(`filtros.${grupo}`)),
                );
            }
            claves = claves.filter(especie => !cubiertas.has(especie));
        }
        for (const clave of claves) {
            etiquetas.push(crearEtiqueta(grupo, clave, definicion.color(clave), definicion.icono(clave), definicion.nombre(clave), t(`filtros.${grupo}`)));
        }
    }
    if (desdeAnio !== null || hastaAnio !== null) {
        const texto = textoDelPeriodo();
        etiquetas.push(crearEtiqueta('estreno', 'periodo', COLOR_ESTRENO, { clase: 'f-e', texto: '📅' }, texto, t('filtros.estreno')));
    }
    // Si las etiquetas son las mismas que ya están, no se rehacen (si no, un toque sobre una podía perderse)
    const firma = etiquetas.map(etiqueta => etiqueta.outerHTML).join('');
    if (firma === firmaEtiquetas) return;
    firmaEtiquetas = firma;
    zonaActivos.replaceChildren(...etiquetas);
}

// Cambian un texto o un atributo solo si de verdad es distinto
function cambiarTexto(elemento, texto) {
    if (elemento.textContent !== texto) elemento.textContent = texto;
}

function cambiarAtributo(elemento, nombre, valor) {
    if (elemento.getAttribute(nombre) !== valor) elemento.setAttribute(nombre, valor);
}

// Escribe el filtro de estreno: los años que se pueden elegir (los de los digimons que ya llegaron), lo elegido y el botón
let firmaAnios = '';
function escribirEstreno() {
    const grupo = seccionFiltros.querySelector('.f-grupo[data-g="estreno"]');
    const selectores = grupo.querySelectorAll('select');
    const anios = [...aniosVistos].sort((a, b) => a - b);
    const libre = t('filtros.estreno.libre');
    const firma = `${libre}|${anios.join(',')}`;
    if (firma !== firmaAnios) {
        firmaAnios = firma;
        selectores.forEach(selector => {
            selector.replaceChildren(new Option(libre, ''), ...anios.map(anio => new Option(String(anio), String(anio))));
        });
    }
    const valores = { desde: desdeAnio, hasta: hastaAnio };
    selectores.forEach(selector => {
        const valor = String(valores[selector.dataset.lado] ?? '');
        if (selector.value !== valor) selector.value = valor;
    });
    grupo.querySelector('.f-btn').classList.toggle('tiene', desdeAnio !== null || hastaAnio !== null);
}

// ---- Filtrar y contar ----------------------------------------------------------------------------------------------
// Muestra u oculta cada carta y actualiza cuentas, botones, etiquetas y avisos
function refrescar() {
    const conteo = Object.fromEntries(GRUPOS.map(grupo => [grupo, {}]));
    const conteoFamilias = {}; // cuántas cartas tendría cada familia de especies (con las mismas reglas que el conteo de las opciones)
    let total = 0;
    let visibles = 0;

    for (const carta of listaDigimons.children) {
        const datos = datosDeFiltro(carta);
        total++;
        descubrirOpciones('campo', datos.campo);
        descubrirOpciones('especie', datos.especie);

        // Qué filtros cumple esta carta (un filtro sin nada elegido lo cumple todo; el de grupos, si tiene alguno de los elegidos)
        const cumple = {};
        for (const grupo of GRUPOS) {
            const valor = datos[grupo];
            cumple[grupo] =
                elegidos[grupo].size === 0 || (Array.isArray(valor) ? valor.some(opcion => elegidos[grupo].has(opcion)) : elegidos[grupo].has(valor));
        }
        // La búsqueda y el período de estreno valen para todo: también para la cuenta de cada opción de los otros filtros
        if (datos.anio !== null) aniosVistos.add(datos.anio);
        const cumpleBusqueda = coincideBusqueda(datos, busqueda) && coincideEstreno(datos.anio);
        const cumpleTodo = cumpleBusqueda && GRUPOS.every(grupo => cumple[grupo]);

        if (cumpleTodo) visibles++;
        if (carta.classList.contains('filtrada') === cumpleTodo) carta.classList.toggle('filtrada', !cumpleTodo);

        // Cuenta de cada opción: cuántas cartas la tendrían si se elige, mirando todos los demás filtros y la búsqueda
        if (!cumpleBusqueda) continue;
        for (const grupo of GRUPOS) {
            if (GRUPOS.every(otro => otro === grupo || cumple[otro])) {
                const valor = datos[grupo];
                for (const opcion of Array.isArray(valor) ? valor : [valor]) {
                    conteo[grupo][opcion] = (conteo[grupo][opcion] || 0) + 1;
                }
                if (grupo === 'especie') {
                    // una carta suma una sola vez a cada familia, aunque tenga varias especies de ella
                    const deEstaCarta = new Set(valor.flatMap(especie => familiasDe.get(especie) ?? []));
                    for (const nombre of deEstaCarta) conteoFamilias[nombre] = (conteoFamilias[nombre] || 0) + 1;
                }
            }
        }
    }

    // Solo se toca lo que cambió: mientras cargan las cartas esto se repite muchas veces, y reescribir textos iguales
    // hacía que el navegador redibujara la barra a cada rato (en el celular, los botones tardaban en responder)
    seccionFiltros.querySelectorAll('.f-chip').forEach(chip => {
        const { g: grupo, k: clave, fam } = chip.dataset;
        // aria-pressed: 'true' (elegida), 'false' o, en las familias con solo algunas de sus especies elegidas, 'mixed'
        const estado = fam ? estadoDeFamilia(fam) : String(elegidos[grupo].has(clave));
        const cantidad = (fam ? conteoFamilias[fam] : conteo[grupo][clave]) || 0;
        cambiarAtributo(chip, 'aria-pressed', estado);
        cambiarTexto(chip.querySelector('i'), String(cantidad));
        chip.classList.toggle('vacio', total > 0 && cantidad === 0 && estado === 'false'); // sin cartas: se ve apagada
    });

    // Botones de X-Antibody y Xros Wars: su estado (indistinto, con o sin) y su texto en el idioma actual
    for (const boton of botonesDeTresEstados) {
        const grupo = boton.dataset.g;
        const estado = [...elegidos[grupo]][0] ?? 'indistinto';
        if (boton.dataset.estado !== estado) boton.dataset.estado = estado;
        cambiarTexto(boton.querySelector('.f-texto'), t(`filtros.${grupo}.boton.${estado}`));
        cambiarAtributo(boton, 'title', t(`filtros.${grupo}.ayuda.${estado}`));
        cambiarAtributo(boton, 'aria-label', t(`filtros.${grupo}`)); // (el nombre del filtro, en el idioma de ahora; el texto de adentro puede estar oculto en el celular)
    }

    escribirEstreno();

    seccionFiltros.querySelectorAll('.f-grupo').forEach(grupo => {
        if (!(grupo.dataset.g in elegidos)) return; // (los desplegables de "Estreno" y "Ordenar por" no eligen opciones de las de arriba)
        const cuantos = elegidos[grupo.dataset.g].size;
        const contador = grupo.querySelector('.f-n');
        grupo.querySelector('.f-btn').classList.toggle('tiene', cuantos > 0);
        cambiarTexto(contador, String(cuantos));
        if (contador.hidden !== (cuantos === 0)) contador.hidden = cuantos === 0;
    });

    escribirEtiquetas();
    // Dos versiones del mismo dato: la larga ("Mostrando 12 de 860 digimons") y una cortita ("12 de 860") para la barra finita del celular
    // (el CSS muestra una u otra; la que no se ve no se lee ni en pantalla ni con lector)
    const datos = { v: `<b>${visibles}</b>`, n: total };
    const cuenta = `<span class="f-cuenta-larga">${t('filtros.cuenta', datos)}</span><span class="f-cuenta-corta">${t('filtros.cuenta.corta', datos)}</span>`;
    if (textoCuenta.innerHTML !== cuenta) textoCuenta.innerHTML = cuenta;

    const hayFiltros = busqueda !== '' || desdeAnio !== null || hastaAnio !== null || GRUPOS.some(grupo => elegidos[grupo].size > 0);
    botonLimpiar.hidden = !hayFiltros;
    avisoVacio.hidden = !(total > 0 && visibles === 0);
}

// ---- Orden de la lista ---------------------------------------------------------------------------------------------
// Por número (ID: el orden de siempre, el de llegada, que en la API coincide con la fecha de estreno) o alfabético por el nombre que se ve en la carta (sin importar mayúsculas ni tildes;
// si dos son iguales, por número). Se reordenan los <li> de verdad (no con la propiedad "order" del CSS): así las flechas del zoom, el teclado
// y los lectores de pantalla siguen el mismo orden que se ve.
// Las cartas siguen llegando mientras se está ordenando: las nuevas se meten cada una en su lugar sin tocar a las que ya estaban (si no, cada
// tanda movería todas las cartas de la lista). Solo al cambiar de orden se reacomoda todo, una vez.
let orden = 'id'; // 'id' | 'az'
const ORDENES = { id: 'filtros.orden.id.corto', az: 'filtros.orden.az.corto' };
const COMPARADOR_DE_NOMBRES = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
const TANDA_QUE_SE_REACOMODA_ENTERA = 200; // con tantas cartas fuera de lugar conviene reordenar todo de una vez y no una por una
const nombresVisibles = new WeakMap(); // carta → el nombre que se ve (se vuelve a leer si cambia el idioma)

const nombreParaOrdenar = carta => {
    if (!nombresVisibles.has(carta)) nombresVisibles.set(carta, nombreCompleto(carta));
    return nombresVisibles.get(carta);
};

// El lugar de la carta en el orden "por ID": su número, salvo las cartas propias, que van entre dos de la API (ver CARTAS_PROPIAS en datos.js)
const lugarPorId = carta => Number(carta.dataset.lugarEnElOrden ?? carta.dataset.id);

// Agrupar: la lista se parte en bloques según el dato elegido (todos los de nivel 1, después todos los de nivel 2...). Se pueden marcar varios
// criterios: se agrupa por el primero que se marcó, dentro de cada bloque por el segundo, y así. Dentro del último bloque rige el Orden elegido.
// Cada criterio compara dos cartas según el lugar de su dato en la lista de opciones del filtro (la misma que se ve en el desplegable);
// lo que no está en esa lista (un valor raro de la API) va al final.
let agrupar = []; // los criterios marcados, en el orden en que se marcaron: 'atributo' | 'nivel' | 'elemento' | 'campo'
const lugarEn = (lista, valor) => {
    const lugar = lista.indexOf(valor);
    return lugar === -1 ? lista.length : lugar;
};
const COMPARADORES_DE_GRUPO = {
    atributo: (a, b) => lugarEn(GRUPOS_FILTRO.atributo.claves, a.atributo) - lugarEn(GRUPOS_FILTRO.atributo.claves, b.atributo),
    nivel: (a, b) => lugarEn(ORDEN_NIVELES, a.nivel) - lugarEn(ORDEN_NIVELES, b.nivel),
    elemento: (a, b) => lugarEn(ORDEN_ELEMENTOS, a.elemento) - lugarEn(ORDEN_ELEMENTOS, b.elemento),
    // Grupos: en el orden del filtro, pero "Unknown" (los que no tienen grupo) siempre al final, como "Desconocido" en los niveles
    campo: (a, b) => {
        const lugar = campo => (campo === SIN_DATO ? ORDEN_CAMPOS.length + 1 : lugarDelCampo(campo));
        return lugar(a.campoPrincipal) - lugar(b.campoPrincipal) || a.campoPrincipal.localeCompare(b.campoPrincipal, 'en');
    },
};

function compararCartas(a, b) {
    if (agrupar.length > 0) {
        const datosA = datosDeFiltro(a);
        const datosB = datosDeFiltro(b);
        for (const criterio of agrupar) {
            const diferencia = COMPARADORES_DE_GRUPO[criterio](datosA, datosB);
            if (diferencia !== 0) return diferencia;
        }
    }
    if (orden === 'az') {
        const porNombre = COMPARADOR_DE_NOMBRES.compare(nombreParaOrdenar(a), nombreParaOrdenar(b));
        if (porNombre !== 0) return porNombre;
    }
    return lugarPorId(a) - lugarPorId(b);
}

// Deja la lista en el orden elegido. Devuelve true si movió alguna carta.
function acomodarLista() {
    const cartas = [...listaDigimons.children];
    let ordenadas = 1; // cuántas cartas del principio ya están en orden
    while (ordenadas < cartas.length && compararCartas(cartas[ordenadas - 1], cartas[ordenadas]) <= 0) ordenadas++;
    if (ordenadas >= cartas.length) return false;

    if (cartas.length - ordenadas > TANDA_QUE_SE_REACOMODA_ENTERA) {
        listaDigimons.append(...cartas.sort(compararCartas));
        return true;
    }
    const enOrden = cartas.slice(0, ordenadas);
    for (const carta of cartas.slice(ordenadas).sort(compararCartas)) {
        // su lugar: antes de la primera que tiene que ir después de ella
        let desde = 0;
        let hasta = enOrden.length;
        while (desde < hasta) {
            const medio = (desde + hasta) >> 1;
            if (compararCartas(enOrden[medio], carta) <= 0) desde = medio + 1;
            else hasta = medio;
        }
        listaDigimons.insertBefore(carta, enOrden[desde] ?? null);
        enOrden.splice(desde, 0, carta);
    }
    return true;
}

// Escribe el orden elegido en el botón y en las opciones del desplegable
function escribirOrden() {
    const grupo = seccionFiltros.querySelector('.f-grupo[data-g="orden"]');
    const valor = grupo.querySelector('.f-orden-valor');
    cambiarTexto(valor, t(ORDENES[orden]));
    cambiarAtributo(grupo.querySelector('.f-btn'), 'title', t(`filtros.orden.${orden}.ayuda`)); // al dejar el puntero encima: cómo ordena
    grupo.querySelector('.f-btn').classList.toggle('tiene', orden !== 'id'); // con el orden de siempre el botón se ve como los demás sin nada elegido
    grupo.querySelectorAll('.f-orden-op').forEach(opcion => cambiarAtributo(opcion, 'aria-checked', String(opcion.dataset.orden === orden)));
}

// Escribe lo que se agrupa en el botón (la cantidad de criterios y qué dice al pasar el mouse) y en las opciones del desplegable (tildadas y con su número)
function escribirAgrupar() {
    const grupo = seccionFiltros.querySelector('.f-grupo[data-g="agrupar"]');
    const boton = grupo.querySelector('.f-btn');
    const contador = grupo.querySelector('.f-n');
    const nombres = agrupar.map(criterio => t(`filtros.${criterio}`));
    boton.classList.toggle('tiene', agrupar.length > 0);
    cambiarTexto(contador, String(agrupar.length));
    if (contador.hidden !== (agrupar.length === 0)) contador.hidden = agrupar.length === 0;
    cambiarAtributo(boton, 'title', agrupar.length ? t('filtros.agrupar.ayuda.con', { criterios: nombres.join(' › ') }) : t('filtros.agrupar.ayuda.sin'));
    grupo.querySelectorAll('.f-agrupar-op').forEach(opcion => {
        const lugar = agrupar.indexOf(opcion.dataset.agrupar) + 1; // 0 si no está marcada
        cambiarAtributo(opcion, 'aria-checked', String(lugar > 0));
        cambiarTexto(opcion.querySelector('.f-orden-punto'), lugar > 0 ? String(lugar) : '');
        cambiarAtributo(opcion, 'title', lugar > 0 ? t('filtros.agrupar.lugar', { n: lugar }) : t('filtros.agrupar.sacada'));
    });
}

// Las cartas llegan de a poco: si llegan varias juntas, se hacen las cuentas una sola vez por cuadro
let refrescoPendiente = 0;
function programarRefresco() {
    if (!refrescoPendiente) {
        refrescoPendiente = requestAnimationFrame(() => {
            refrescoPendiente = 0;
            acomodarLista(); // (las cartas nuevas entran al final de la lista: se las pone en su lugar)
            refrescar();
        });
    }
}

export function limpiarTodo() {
    GRUPOS.forEach(grupo => elegidos[grupo].clear());
    desdeAnio = null;
    hastaAnio = null;
    cajaBusqueda.value = '';
    leerBusqueda();
    refrescar();
    Object.keys(OPCIONES_QUE_LLEGAN).forEach(buscarEntreLasOpciones);
}

function leerBusqueda() {
    busqueda = normalizar(cajaBusqueda.value);
    busquedaEscrita = cajaBusqueda.value.trim();
    botonBorrarBusqueda.hidden = cajaBusqueda.value === '';
}

// ---- Eventos -------------------------------------------------------------------------------------------------------
function activarFiltros() {
    // Buscador: espera un momento después de la última tecla para no recalcular con cada letra
    let esperaBusqueda;
    cajaBusqueda.addEventListener('input', () => {
        botonBorrarBusqueda.hidden = cajaBusqueda.value === '';
        clearTimeout(esperaBusqueda);
        esperaBusqueda = setTimeout(() => {
            leerBusqueda();
            refrescar();
        }, 150);
    });

    botonBorrarBusqueda.addEventListener('click', () => {
        clearTimeout(esperaBusqueda);
        cajaBusqueda.value = '';
        leerBusqueda();
        refrescar();
        cajaBusqueda.focus();
    });

    // El panel nace alineado con su botón; si así se saliera por la derecha de la pantalla (el último botón de la fila), se corre hacia la izquierda.
    // Y si así se saliera por abajo (en el celular la barra tiene varias filas y el panel cae debajo de todas), se achica y se desplaza por dentro:
    // lo que quedara fuera de la pantalla no se podría alcanzar, porque la barra no se desplaza con la página. Siempre se deja un poquito de aire
    // abajo (MARGEN_ABAJO) para que se vean las cartas por debajo y se note que el panel termina ahí, sin pegarse al borde.
    const MARGEN_ABAJO = 16;
    const mantenerPanelEnPantalla = panel => {
        const desplazado = panel.scrollTop; // (al sacarle y volver a ponerle el alto máximo, el panel perdería su posición)
        panel.style.left = '';
        panel.style.maxHeight = '';
        const vista = window.visualViewport; // lo que de verdad se ve: descuenta la barra del navegador y el teclado del celular
        const limite = (vista ? vista.offsetTop + vista.height : document.documentElement.clientHeight) - MARGEN_ABAJO;
        const sobra = panel.getBoundingClientRect().right - (document.documentElement.clientWidth - 8);
        if (sobra > 0) panel.style.left = `${-sobra}px`;
        // Dónde empieza el panel, sin contar la animación con que aparece (que lo corre 6px mientras dura)
        const base = panel.offsetParent;
        const arriba = (base ? base.getBoundingClientRect().top + base.clientTop : 0) + panel.offsetTop;
        if (arriba + panel.offsetHeight > limite) {
            // (el alto máximo no cuenta el relleno ni el borde del panel: se les resta)
            const estilo = getComputedStyle(panel);
            const marco = panel.offsetHeight - panel.clientHeight + parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom);
            panel.style.maxHeight = `${Math.max(limite - arriba - marco, 140)}px`;
        }
        panel.scrollTop = desplazado;
    };

    // Panel de opciones de cada filtro: se abre con el botón (uno a la vez)
    const grupos = seccionFiltros.querySelectorAll('.f-grupo');
    const abrir = (grupo, abierto) => {
        grupo.classList.toggle('abierto', abierto);
        grupo.querySelector('.f-btn').setAttribute('aria-expanded', String(abierto));
        if (!abierto) borrarBusquedaDeOpciones(grupo.dataset.g); // al volver a abrir el panel están todas las opciones
        if (abierto) mantenerPanelEnPantalla(grupo.querySelector('.f-panel'));
    };
    grupos.forEach(grupo => {
        grupo.querySelector('.f-btn').addEventListener('click', () => abrir(grupo, !grupo.classList.contains('abierto')));
    });
    document.addEventListener('pointerdown', evento => {
        grupos.forEach(grupo => {
            if (grupo.classList.contains('abierto') && !grupo.contains(evento.target)) abrir(grupo, false);
        });
    });
    document.addEventListener('keydown', evento => {
        if (evento.key !== 'Escape') return;
        grupos.forEach(grupo => {
            if (grupo.classList.contains('abierto')) {
                abrir(grupo, false);
                grupo.querySelector('.f-btn').focus();
            }
        });
    });

    // Si cambia lo que se ve de la pantalla con un panel abierto (se gira el celular, aparece el teclado al escribir en la cajita de las especies,
    // la barra del navegador se esconde), el panel se vuelve a acomodar para que siga sin tocar el borde de abajo
    const reacomodarPanelAbierto = () => {
        grupos.forEach(grupo => {
            if (grupo.classList.contains('abierto')) mantenerPanelEnPantalla(grupo.querySelector('.f-panel'));
        });
    };
    window.addEventListener('resize', reacomodarPanelAbierto);
    window.visualViewport?.addEventListener('resize', reacomodarPanelAbierto);

    // Deslizar de más para cerrar: un panel con scroll (el de las especies, que es largo) que ya llegó al fondo y recibe otro deslizar hacia abajo
    // (el dedo sube un buen tramo) se interpreta como "ya no hay más, quiero salir": se cierra. Vale solo si el deslizar EMPEZÓ con el panel en el
    // fondo: el mismo gesto que lo lleva hasta el fondo no lo cierra (eso es solo el primer deslizar). Se cierra al soltar el dedo, así lo que queda
    // del gesto no pasa a mover la página de abajo.
    const FONDO_CERCA = 2; // px de tolerancia para dar por llegado al fondo
    const DESLIZAR_PARA_CERRAR = 48; // px que tiene que subir el dedo (un toque o un arrastre corto no cierran)
    const estaEnElFondo = panel =>
        panel.scrollHeight > panel.clientHeight + FONDO_CERCA && panel.scrollTop + panel.clientHeight >= panel.scrollHeight - FONDO_CERCA;
    grupos.forEach(grupo => {
        const panel = grupo.querySelector('.f-panel');
        let gesto = null; // el deslizar en curso: dónde empezó, dónde está el dedo y si arrancó con el panel en el fondo
        panel.addEventListener(
            'touchstart',
            evento => {
                const y = evento.touches[0].clientY;
                gesto = evento.touches.length === 1 ? { y, ultimaY: y, enElFondo: estaEnElFondo(panel) } : null;
            },
            { passive: true },
        );
        panel.addEventListener(
            'touchmove',
            evento => {
                if (!gesto) return;
                if (evento.touches.length !== 1 || !estaEnElFondo(panel))
                    gesto = null; // se movió el contenido o hay más dedos: no es "deslizar de más"
                else gesto.ultimaY = evento.touches[0].clientY;
            },
            { passive: true },
        );
        panel.addEventListener(
            'touchend',
            () => {
                const actual = gesto;
                gesto = null;
                if (!actual?.enElFondo || !estaEnElFondo(panel)) return;
                if (actual.y - actual.ultimaY >= DESLIZAR_PARA_CERRAR) {
                    abrir(grupo, false);
                    document.activeElement?.blur?.(); // (si estaba escribiendo en la cajita de las especies, se baja el teclado)
                }
            },
            { passive: true },
        );
        panel.addEventListener('touchcancel', () => (gesto = null), { passive: true });
    });

    // Elegir o sacar una opción (el panel queda abierto para poder elegir más)
    seccionFiltros.addEventListener('click', evento => {
        const chip = evento.target.closest('.f-chip');
        if (!chip) return;
        const { g: grupo, k: clave, fam } = chip.dataset;
        if (fam) {
            alternarFamilia(fam);
        } else if (elegidos[grupo].has(clave)) {
            elegidos[grupo].delete(clave);
        } else {
            elegidos[grupo].add(clave);
        }
        refrescar();
        buscarEntreLasOpciones(grupo);
    });

    // Las dos vistas del panel de las especies: familias o especies sueltas
    seccionFiltros.querySelectorAll('.f-vista').forEach(boton => {
        boton.addEventListener('click', () => {
            const panel = boton.closest('.f-panel');
            panel.dataset.vista = boton.dataset.v;
            panel.querySelectorAll('.f-vista').forEach(otro => otro.setAttribute('aria-pressed', String(otro === boton)));
        });
    });

    // Cajita de búsqueda del panel de las especies
    seccionFiltros.querySelectorAll('.f-opciones-buscar input').forEach(caja => {
        const grupo = caja.closest('.f-grupo').dataset.g;
        caja.addEventListener('input', () => buscarEntreLasOpciones(grupo));
    });

    // Sacar un filtro desde su etiqueta
    zonaActivos.addEventListener('click', evento => {
        const etiqueta = evento.target.closest('.f-tag');
        if (!etiqueta) return;
        const { g: grupo, k: clave } = etiqueta.dataset;
        if (grupo === 'q') {
            cajaBusqueda.value = '';
            leerBusqueda();
        } else if (grupo === 'estreno') {
            desdeAnio = null;
            hastaAnio = null;
        } else if (clave.startsWith(PREFIJO_FAMILIA)) {
            familias.get(clave.slice(PREFIJO_FAMILIA.length))?.forEach(especie => elegidos.especie.delete(especie)); // se sacan todas las especies de la familia
        } else {
            elegidos[grupo].delete(clave);
        }
        refrescar();
        if (grupo in OPCIONES_QUE_LLEGAN) buscarEntreLasOpciones(grupo);
    });

    // Estreno: al elegir un año inicial mayor que el final (o al revés) el otro límite se corre hasta ese año, así el período nunca queda al revés
    seccionFiltros.querySelectorAll('.f-grupo[data-g="estreno"] select').forEach(selector => {
        selector.addEventListener('change', () => {
            const anio = selector.value === '' ? null : Number(selector.value);
            if (selector.dataset.lado === 'desde') {
                desdeAnio = anio;
                if (anio !== null && hastaAnio !== null && anio > hastaAnio) hastaAnio = anio;
            } else {
                hastaAnio = anio;
                if (anio !== null && desdeAnio !== null && anio < desdeAnio) desdeAnio = anio;
            }
            refrescar();
        });
    });

    // Ordenar por: elegir una opción cierra el desplegable. Al cambiar de orden la lista es otra: se vuelve a mirarla desde arriba
    seccionFiltros.querySelectorAll('.f-orden-op[data-orden]').forEach(opcion => {
        opcion.addEventListener('click', () => {
            abrir(opcion.closest('.f-grupo'), false);
            if (opcion.dataset.orden === orden) return;
            orden = opcion.dataset.orden;
            escribirOrden();
            acomodarLista();
            window.scrollTo({ top: 0, behavior: 'instant' });
        });
    });

    // Agrupar: cada opción se marca o se desmarca (el desplegable queda abierto para marcar más). El número de cada una es el orden en que se
    // marcó: ese es el orden de los bloques. Al cambiar, la lista es otra y se vuelve a mirar desde arriba
    seccionFiltros.querySelectorAll('.f-agrupar-op').forEach(opcion => {
        opcion.addEventListener('click', () => {
            const criterio = opcion.dataset.agrupar;
            agrupar = agrupar.includes(criterio) ? agrupar.filter(otro => otro !== criterio) : [...agrupar, criterio];
            escribirAgrupar();
            acomodarLista();
            window.scrollTo({ top: 0, behavior: 'instant' });
        });
    });

    // Botones de X-Antibody y Xros Wars: cada clic pasa al siguiente estado (indistinto → con → sin → indistinto)
    botonesDeTresEstados.forEach(boton => {
        boton.addEventListener('click', () => {
            const conjunto = elegidos[boton.dataset.g];
            const actual = [...conjunto][0];
            conjunto.clear();
            if (actual === undefined) {
                conjunto.add('con');
            } else if (actual === 'con') {
                conjunto.add('sin');
            }
            refrescar();
        });
    });

    botonLimpiar.addEventListener('click', limpiarTodo);
    avisoVacio.querySelector('.f-limpiar').addEventListener('click', limpiarTodo);

    document.addEventListener('carta-agregada', programarRefresco);
    // Si cambia el idioma o el sistema de niveles, los nombres de las opciones y de las etiquetas activas se escriben de nuevo
    for (const aviso of ['idioma-cambiado', 'niveles-cambiados']) {
        document.addEventListener(aviso, () => {
            etiquetarChips();
            escribirOrden();
            escribirAgrupar();
            refrescar();
        });
    }
    // Los nombres de las cartas cambian con el idioma: con el orden alfabético se vuelve a ordenar (cuando ya se escribieron los nuevos nombres)
    document.addEventListener('idioma-cambiado', () => {
        requestAnimationFrame(() => {
            if (orden !== 'az') return;
            listaDigimons.querySelectorAll(':scope > li').forEach(carta => nombresVisibles.delete(carta));
            acomodarLista();
        });
    });
}

// Pone en marcha los filtros (lo llama main.js)
export function prepararFiltros() {
    crearChips();
    etiquetarChips();
    activarFiltros();
    escribirOrden();
    escribirAgrupar();
    refrescar();
}
