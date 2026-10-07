// -----------------------------------------------------------------------------------------------------------------
// FILTROS Y BUSCADOR
//
//   · Tres filtros (tipo, nivel y elemento): dentro de un mismo filtro se pueden elegir varias opciones (alcanza con que
//     cumpla una) y entre filtros distintos tienen que cumplirse todos.
//   · Cada opción muestra cuántos digimons quedarían si se elige, teniendo en cuenta los otros filtros y la búsqueda.
//   · El buscador ignora mayúsculas, acentos, espacios de más y signos (v-mon = vmon), acepta varias palabras en cualquier orden
//     y también el número del digimon ("15" o "#15").
//   · Las cartas que no cumplen se esconden con la clase "filtrada" (el CSS las oculta). Las cartas llegan de a poco
//     mientras carga la página: cartas.js avisa con el evento "carta-agregada" y se vuelven a hacer las cuentas.
// Los textos vienen de i18n.js y se vuelven a escribir cuando cambia el idioma.
// -----------------------------------------------------------------------------------------------------------------

import {
    COLOR_BUSQUEDA,
    COLOR_ELEMENTO,
    COLOR_NIVEL,
    COLOR_NIVEL_DESCONOCIDO,
    COLOR_TIPO,
    COLOR_X,
    EMOJIS_ELEMENTO,
    EMOJIS_TIPO,
    ORDEN_ELEMENTOS,
    ORDEN_NIVELES,
    numeracionNiveles,
} from './datos.js';
import { nombreElemento, nombreTipo, t } from './i18n.js';
import { listaDigimons, nombreNivel } from './pagina.js';
import { nombreApiCompleto, nombreCompleto, nombreOccidentalCompleto } from './cartas.js';

// Cada filtro: qué opciones tiene (con el nombre interno), cómo se llama cada una y qué lleva de ícono
const GRUPOS_FILTRO = {
    tipo: {
        claves: ['Vacuna', 'Virus', 'Datos', 'Libre', 'Variable', 'Desconocido'],
        nombre: nombreTipo,
        color: clave => COLOR_TIPO[clave],
        icono: clave => ({ clase: 'f-e', texto: EMOJIS_TIPO[clave] }),
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
    // X-Antibody: no tiene panel de opciones; se maneja con un solo botón (.f-xa) que rota entre "indistinto" (nada elegido),
    // "con" y "sin"
    x: {
        claves: ['con', 'sin'],
        soloBoton: true,
        nombre: clave => t(`filtros.x.${clave}`),
        color: () => COLOR_X,
        icono: () => ({ clase: 'f-e', texto: 'X' }),
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
const botonX = seccionFiltros.querySelector('.f-xa');
const zonaActivos = seccionFiltros.querySelector('.f-activos');
const textoCuenta = seccionFiltros.querySelector('.f-cuenta');
const botonLimpiar = seccionFiltros.querySelector('.f-resumen .f-limpiar');
const avisoVacio = document.getElementById('f-vacio');

// ---- Qué está elegido ----------------------------------------------------------------------------------------------
const elegidos = { tipo: new Set(), nivel: new Set(), elemento: new Set(), x: new Set() };
let busqueda = ''; // lo que se escribió, ya normalizado (para comparar)
let busquedaEscrita = ''; // lo que se escribió, tal cual (para mostrar en la etiqueta)

// ---- Buscador ------------------------------------------------------------------------------------------------------
// "Agúmon  X" -> "agumon x": sin acentos, en minúscula y con un solo espacio entre palabras
const normalizar = texto => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const compactar = texto => texto.replace(/[^a-z0-9]/g, ''); // "v-mon (black)" -> "vmonblack"

// Lo que se necesita saber de cada carta para filtrarla (se calcula una sola vez)
function datosDeFiltro(carta) {
    if (!carta.datosFiltro) {
        // Se busca por los dos nombres del digimon (el original de la API y el occidental), con el "(X-Antibody)" si lo tiene.
        // El que se ve es siempre uno de los dos, así que no hace falta volver a calcularlo si cambia el idioma.
        const nombres = [...new Set([nombreCompleto(carta), nombreApiCompleto(carta), nombreOccidentalCompleto(carta)].map(normalizar))].map(nombre => ({
            nombre,
            compacto: compactar(nombre),
        }));
        carta.datosFiltro = {
            tipo: carta.dataset.tipo,
            nivel: carta.dataset.nivelApi,
            elemento: carta.dataset.elemento,
            x: carta.dataset.xAntibody ? 'con' : 'sin', // si tiene X-Antibody
            marca: carta.dataset.marca ? normalizar(carta.dataset.marca) : null, // 'armor' o 'hybrid'
            id: Number(carta.dataset.id),
            nombres,
        };
    }
    return carta.datosFiltro;
}

function coincideBusqueda(datos, consulta) {
    if (!consulta) return true;

    // Si lo escrito es un número ("15" o "#15") también sirve el número del digimon
    const numero = consulta.match(/^#?(\d+)$/);
    if (numero && datos.id === Number(numero[1])) return true;

    // Cada palabra tiene que estar en el mismo nombre (en cualquier orden): en el original o en el occidental, pero sin mezclarlos,
    // o bien coincidir con la marca especial de la carta (Armor o Hybrid).
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
function crearChips() {
    for (const [grupo, definicion] of Object.entries(GRUPOS_FILTRO)) {
        if (definicion.soloBoton) continue; // sin panel de opciones
        const panel = seccionFiltros.querySelector(`.f-grupo[data-g="${grupo}"] .f-panel`);
        for (const clave of definicion.claves) {
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
            chip.innerHTML = `<span class="${icono.clase}">${icono.texto}</span><span class="f-k"></span><i>0</i>`;
            panel.append(chip);
        }
    }
}

// Escribe en el idioma actual el nombre de cada opción
function etiquetarChips() {
    seccionFiltros.querySelectorAll('.f-chip').forEach(chip => {
        const { g: grupo, k: clave } = chip.dataset;
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

    const marca = document.createElement('span');
    marca.className = icono.clase;
    marca.textContent = icono.texto;
    const nombre = document.createElement('span');
    nombre.className = 'f-k';
    nombre.textContent = texto; // puede ser lo que escribió la persona: siempre como texto, nunca como HTML
    etiqueta.append(marca, nombre);
    return etiqueta;
}

let firmaEtiquetas = ''; // las etiquetas que hay ahora (para no rehacerlas si no cambiaron)

function escribirEtiquetas() {
    const etiquetas = [];
    if (busquedaEscrita) {
        etiquetas.push(crearEtiqueta('q', busquedaEscrita, COLOR_BUSQUEDA, { clase: 'f-e', texto: '🔍' }, `“${busquedaEscrita}”`, t('filtros.busqueda')));
    }
    for (const grupo of GRUPOS) {
        const definicion = GRUPOS_FILTRO[grupo];
        for (const clave of definicion.claves.filter(opcion => elegidos[grupo].has(opcion))) {
            etiquetas.push(crearEtiqueta(grupo, clave, definicion.color(clave), definicion.icono(clave), definicion.nombre(clave), t(`filtros.${grupo}`)));
        }
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

// ---- Filtrar y contar ----------------------------------------------------------------------------------------------
// Muestra u oculta cada carta y actualiza cuentas, botones, etiquetas y avisos
function refrescar() {
    const conteo = { tipo: {}, nivel: {}, elemento: {}, x: {} };
    let total = 0;
    let visibles = 0;

    for (const carta of listaDigimons.children) {
        const datos = datosDeFiltro(carta);
        total++;

        // Qué filtros cumple esta carta (un filtro sin nada elegido lo cumple todo)
        const cumple = {};
        for (const grupo of GRUPOS) {
            cumple[grupo] = elegidos[grupo].size === 0 || elegidos[grupo].has(datos[grupo]);
        }
        const cumpleBusqueda = coincideBusqueda(datos, busqueda);
        const cumpleTodo = cumpleBusqueda && GRUPOS.every(grupo => cumple[grupo]);

        if (cumpleTodo) visibles++;
        if (carta.classList.contains('filtrada') === cumpleTodo) carta.classList.toggle('filtrada', !cumpleTodo);

        // Cuenta de cada opción: cuántas cartas la tendrían si se elige, mirando todos los demás filtros y la búsqueda
        if (!cumpleBusqueda) continue;
        for (const grupo of GRUPOS) {
            if (GRUPOS.every(otro => otro === grupo || cumple[otro])) {
                conteo[grupo][datos[grupo]] = (conteo[grupo][datos[grupo]] || 0) + 1;
            }
        }
    }

    // Solo se toca lo que cambió: mientras cargan las cartas esto se repite muchas veces, y reescribir textos iguales
    // hacía que el navegador redibujara la barra a cada rato (en el celular, los botones tardaban en responder)
    seccionFiltros.querySelectorAll('.f-chip').forEach(chip => {
        const { g: grupo, k: clave } = chip.dataset;
        const elegido = elegidos[grupo].has(clave);
        const cantidad = conteo[grupo][clave] || 0;
        cambiarAtributo(chip, 'aria-pressed', String(elegido));
        cambiarTexto(chip.querySelector('i'), String(cantidad));
        chip.classList.toggle('vacio', total > 0 && cantidad === 0 && !elegido); // sin cartas: se ve apagada
    });

    // Botón de X-Antibody: su estado (indistinto, con o sin) y su texto en el idioma actual
    const estadoX = [...elegidos.x][0] ?? 'indistinto';
    if (botonX.dataset.estado !== estadoX) botonX.dataset.estado = estadoX;
    cambiarTexto(botonX.querySelector('.f-xa-texto'), t(`filtros.x.boton.${estadoX}`));
    cambiarAtributo(botonX, 'title', t(`filtros.x.ayuda.${estadoX}`));

    seccionFiltros.querySelectorAll('.f-grupo').forEach(grupo => {
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

    const hayFiltros = busqueda !== '' || GRUPOS.some(grupo => elegidos[grupo].size > 0);
    botonLimpiar.hidden = !hayFiltros;
    avisoVacio.hidden = !(total > 0 && visibles === 0);
}

// Las cartas llegan de a poco: si llegan varias juntas, se hacen las cuentas una sola vez por cuadro
let refrescoPendiente = 0;
function programarRefresco() {
    if (!refrescoPendiente) {
        refrescoPendiente = requestAnimationFrame(() => {
            refrescoPendiente = 0;
            refrescar();
        });
    }
}

export function limpiarTodo() {
    GRUPOS.forEach(grupo => elegidos[grupo].clear());
    cajaBusqueda.value = '';
    leerBusqueda();
    refrescar();
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

    // Panel de opciones de cada filtro: se abre con el botón (uno a la vez)
    const grupos = seccionFiltros.querySelectorAll('.f-grupo');
    const abrir = (grupo, abierto) => {
        grupo.classList.toggle('abierto', abierto);
        grupo.querySelector('.f-btn').setAttribute('aria-expanded', String(abierto));
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

    // Elegir o sacar una opción (el panel queda abierto para poder elegir más)
    seccionFiltros.addEventListener('click', evento => {
        const chip = evento.target.closest('.f-chip');
        if (!chip) return;
        const { g: grupo, k: clave } = chip.dataset;
        if (elegidos[grupo].has(clave)) {
            elegidos[grupo].delete(clave);
        } else {
            elegidos[grupo].add(clave);
        }
        refrescar();
    });

    // Sacar un filtro desde su etiqueta
    zonaActivos.addEventListener('click', evento => {
        const etiqueta = evento.target.closest('.f-tag');
        if (!etiqueta) return;
        const { g: grupo, k: clave } = etiqueta.dataset;
        if (grupo === 'q') {
            cajaBusqueda.value = '';
            leerBusqueda();
        } else {
            elegidos[grupo].delete(clave);
        }
        refrescar();
    });

    // Botón de X-Antibody: cada clic pasa al siguiente estado (indistinto → con → sin → indistinto)
    botonX.addEventListener('click', () => {
        const actual = [...elegidos.x][0];
        elegidos.x.clear();
        if (actual === undefined) {
            elegidos.x.add('con');
        } else if (actual === 'con') {
            elegidos.x.add('sin');
        }
        refrescar();
    });

    botonLimpiar.addEventListener('click', limpiarTodo);
    avisoVacio.querySelector('.f-limpiar').addEventListener('click', limpiarTodo);

    document.addEventListener('carta-agregada', programarRefresco);
    // Si cambia el idioma o el sistema de niveles, los nombres de las opciones y de las etiquetas activas se escriben de nuevo
    for (const aviso of ['idioma-cambiado', 'niveles-cambiados']) {
        document.addEventListener(aviso, () => {
            etiquetarChips();
            refrescar();
        });
    }
}

// Pone en marcha los filtros (lo llama main.js)
export function prepararFiltros() {
    crearChips();
    etiquetarChips();
    activarFiltros();
    refrescar();
}
