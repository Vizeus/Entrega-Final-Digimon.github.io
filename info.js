// -----------------------------------------------------------------------------------------------------------------
// MENÚS DE INFORMACIÓN (atributos, elementos, niveles y misceláneos) y sus ventanas emergentes
//
// Los cuatro menús de la barra tienen el mismo formato: al elegir una opción se abre una ventana con su descripción,
// contra qué es fuerte o débil y cuánto pesa en el combate (los misceláneos, que son las marcas de la carta como la X-Antibody, explican qué son y cómo buscarlas). Los números salen de las mismas tablas que usa el combate
// (datos.js y combate.js), así que lo que dice la ventana siempre coincide con lo que pasa en la pelea.
// Los textos vienen de i18n.js y se vuelven a escribir cuando cambia el idioma.
// -----------------------------------------------------------------------------------------------------------------

import {
    COLOR_ELEMENTO_ENLACE,
    COLOR_NIVEL,
    COLOR_NIVEL_DESCONOCIDO,
    COLOR_ATRIBUTO_ENLACE,
    ELEMENTO_FUERTE_CONTRA,
    EMOJIS_ELEMENTO,
    EMOJIS_ATRIBUTO,
    ORDEN_ELEMENTOS,
    ORDEN_NIVELES,
    ATRIBUTO_FUERTE_CONTRA,
    nivelesAlternativos,
    numeracionNiveles,
} from './datos.js';
import { nombreElemento, nombreAtributo, t } from './i18n.js';
import { conCruzDeCierre, mantenerEnSuLugar } from './ventanas.js';
import { clasificacionAlternativa, nombreNivel } from './pagina.js';
import { PESO_ELEMENTO, PESO_NIVEL, PESO_ATRIBUTO, PODER_EN_COMBATE } from './combate.js';
import { nombreCompleto } from './cartas.js';
import { activarBotonDelDorso } from './gestos.js';
import { FICHERO_DE_ATAQUES, sonidoFichero } from './sonidos.js';
import { irALaCarta } from './evolucion.js';

const ORDEN_ATRIBUTOS_MENU = ['Datos', 'Virus', 'Vacuna', 'Libre', 'Variable', 'Desconocido'];

const conEmojiAtributo = atributo => `${nombreAtributo(atributo)} ${EMOJIS_ATRIBUTO[atributo]}`;
const conEmojiElemento = elemento => `${nombreElemento(elemento)} ${EMOJIS_ELEMENTO[elemento]}`;
const porcentaje = peso => Math.round(peso * 100);

// Genera un botón con enlace de referencia cruzada (línea punteada al pasar el puntero)
function linkAtributo(atributo) {
    const texto = conEmojiAtributo(atributo);
    const color = COLOR_ATRIBUTO_ENLACE[atributo] || 'currentColor';
    const ayuda = t('info.verInfoDe', { nombre: nombreAtributo(atributo) });
    return `<button type="button" class="info-link info-link-atributo" data-info-atributo="${atributo}" style="--link-c: ${color};" title="${ayuda}" aria-label="${ayuda}">${texto}</button>`;
}

function linkElemento(elemento) {
    const texto = conEmojiElemento(elemento);
    const color = COLOR_ELEMENTO_ENLACE[elemento] || 'currentColor';
    const ayuda = t('info.verInfoDe', { nombre: nombreElemento(elemento) });
    return `<button type="button" class="info-link info-link-elemento" data-info-elemento="${elemento}" style="--link-c: ${color};" title="${ayuda}" aria-label="${ayuda}">${texto}</button>`;
}

function linkNivel(nivelApi, textoMostrar = null) {
    const texto = textoMostrar || nombreNivel(nivelApi);
    const ayuda = t('info.verInfoDe', { nombre: texto });
    return `<button type="button" class="info-link info-link-nivel" data-info-nivel="${nivelApi}" title="${ayuda}" aria-label="${ayuda}">${texto}</button>`;
}

// "Vacuna 💉, Hielo ❄️" o, si no hay ninguno, "ninguno"
const enLista = (elementos, formato) => (elementos.length ? elementos.map(formato).join(', ') : t('info.ninguno'));

// Quiénes le ganan a "x" según una tabla de ventajas (ej.: ATRIBUTO_FUERTE_CONTRA)
const quienesLeGanan = (tabla, x) => Object.keys(tabla).filter(clave => tabla[clave].includes(x));

const MENCIONES_NIVEL_MAP = {
    'Super Ultimate': 'Super Ultimate',
    'Absolute': 'Absolute',
    'Baby II': 'Baby II',
    'Baby I': 'Baby I',
    'Child': 'Child',
    'Adult': 'Adult',
    'Perfect': 'Perfect',
    'Ultimate': 'Ultimate',
    'Mega': 'Ultimate',
};

// Los textos de i18n.js nombran a otros niveles con una marca {nivel:Adult} (con el nombre original de la API): así se escriben con
// los nombres del sistema vigente (Japón o EE.UU.) y siguen siendo un enlace al nivel. Lo que no lleve la marca, se enlaza tal cual está escrito.
const REGEX_NIVELES = /\{nivel:([^}]+)\}|\b(Super Ultimate|Absolute|Baby II|Baby I|Child|Adult|Perfect|Ultimate|Mega)\b/g;

// Enlaza menciones de niveles, atributos o elementos que aparezcan en el texto de las descripciones
function enlazarTexto(texto) {
    if (!texto) return '';
    return texto.replace(REGEX_NIVELES, (match, marca) => {
        if (marca) return linkNivel(marca);
        const nivel = MENCIONES_NIVEL_MAP[match];
        const ayuda = t('info.verInfoDe', { nombre: match });
        return `<button type="button" class="info-link info-link-nivel" data-info-nivel="${nivel}" title="${ayuda}" aria-label="${ayuda}">${match}</button>`;
    });
}

let ultimaInfoAbierta = null;

// Ventana común a los cuatro menús: descripción, lista de datos (con la etiqueta en negrita) y un pie con el peso en el combate
function mostrarInfo(titulo, descripcion, datos, pie) {
    const filas = datos.map(([etiqueta, valor]) => `<li><b>${etiqueta}:</b> ${valor}</li>`).join('');
    const descHtml = enlazarTexto(descripcion);

    Swal.fire({
        title: titulo,
        html: `<p class="info-desc">${descHtml}</p><ul class="info-datos">${filas}</ul><p class="info-pie">${pie}</p>`,
        icon: 'info',
        width: 'min(94vw, 680px)',
        ...conCruzDeCierre(),
        confirmButtonText: t('aceptar'),
        focusConfirm: false,
        buttonsStyling: false, // sin el botón violeta de fábrica de SweetAlert: el "Aceptar" lleva el gel azul de la página (_ventanas.scss)
        // (el popup lleva la fuente pixelada de la barra en el título; ver _ventanas.scss)
        customClass: { popup: 'popup-info', confirmButton: 'ventana-boton' },
        didOpen: popup => {
            popup.querySelector('.swal2-confirm')?.blur();
        },
    });
}

export function infoAtributo(atributo) {
    ultimaInfoAbierta = { fn: infoAtributo, args: [atributo] };
    const fuerte = ATRIBUTO_FUERTE_CONTRA[atributo] || [];
    const debil = quienesLeGanan(ATRIBUTO_FUERTE_CONTRA, atributo);
    const sinVentajas = fuerte.length === 0 && debil.length === 0; // Libre, Variable y Desconocido

    mostrarInfo(
        conEmojiAtributo(atributo),
        t(`atributo.desc.${atributo}`),
        [
            [t('info.fuerte'), enLista(fuerte, linkAtributo)],
            [t('info.debil'), enLista(debil, linkAtributo)],
        ],
        sinVentajas ? t('atributo.pieSin') : t('atributo.pie', { p: porcentaje(PESO_ATRIBUTO) }),
    );
}

export function infoElemento(elemento) {
    ultimaInfoAbierta = { fn: infoElemento, args: [elemento] };
    const fuerte = ELEMENTO_FUERTE_CONTRA[elemento] || [];
    const debil = quienesLeGanan(ELEMENTO_FUERTE_CONTRA, elemento);
    const mutua = fuerte.filter(otro => debil.includes(otro)); // Luz y Oscuridad se ganan entre sí: se cancelan

    const datos = [
        [t('info.fuerte'), enLista(fuerte, linkElemento)],
        [t('info.debil'), enLista(debil, linkElemento)],
    ];
    if (mutua.length > 0) {
        datos.push([t('info.mutua'), `${enLista(mutua, linkElemento)} ${t('info.seCancelan')}`]);
    }

    mostrarInfo(
        conEmojiElemento(elemento),
        t(`elemento.desc.${elemento}`),
        datos,
        elemento === 'Neutro' ? t('elemento.pieNeutro') : t('elemento.pie', { p: porcentaje(PESO_ELEMENTO) }),
    );
}

// El nivel se pide con el nombre original de la API ('Adult'); el nombre que se muestra depende del sistema de clasificación
export function infoNivel(nivelApi) {
    ultimaInfoAbierta = { fn: infoNivel, args: [nivelApi] };
    const poder = numeracionNiveles[nivelApi]; // undefined si el nivel es desconocido
    const nombre = nombreNivel(nivelApi);

    // Cómo se llama en el otro sistema. Si se llama igual (el nivel desconocido y el 8, Absolute), no hay nada que aclarar: no se muestran ni
    // "Clasificación actual" ni "En la otra clasificación", que dirían lo mismo para los dos sistemas
    const otroNombre = poder === undefined ? nombre : clasificacionAlternativa ? nivelApi : nivelesAlternativos[nivelApi] || nivelApi;
    const seLlamaIgual = otroNombre === nombre;

    const datos = [[t('info.poder'), poder ?? t('info.sinDato')]];
    if (!seLlamaIgual) datos.push([t('info.clasificacion'), t(clasificacionAlternativa ? 'info.eeuu' : 'info.japon')]);

    // Referencias cruzadas: nivel anterior y nivel siguiente
    if (poder !== undefined) {
        if (poder > 1) {
            const nivelPrevio = ORDEN_NIVELES[poder - 2];
            if (nivelPrevio) datos.push([t('info.evolucionaDe'), linkNivel(nivelPrevio)]);
        }
        if (poder < 8) {
            const nivelSiguiente = ORDEN_NIVELES[poder];
            if (nivelSiguiente) datos.push([t('info.evolucionaA'), linkNivel(nivelSiguiente)]);
        }
    }

    // Los niveles que rompen la escala (7 y 8) pesan más en el combate de lo que dice su número
    const poderCombate = PODER_EN_COMBATE[poder];
    if (poderCombate !== undefined) {
        datos.push([t('info.poderCombate'), poderCombate]);
    }

    // Cómo se llama en el otro sistema (solo si el nombre es distinto)
    if (!seLlamaIgual) datos.push([t('info.otraClasificacion'), otroNombre]);

    mostrarInfo(
        poder === undefined ? nombre : t('info.nivelTitulo', { nombre, n: poder }),
        t(`nivel.desc.${nivelApi}`),
        datos,
        poder === undefined
            ? t('nivel.pieSin')
            : poderCombate !== undefined
              ? t('nivel.pieAlto', { n: poderCombate, p: porcentaje(PESO_NIVEL) })
              : t('nivel.pie', { p: porcentaje(PESO_NIVEL) }),
    );
}

// Las marcas de la carta (la gema de la X-Antibody y los círculos de Armor, Hybrid y Xros Wars de la esquina de arriba a la izquierda): qué es cada una
// y cómo encontrarla con el buscador. Se abren tocando la marca en la carta (cartas.js) o desde el menú "Info. misceláneos" de la barra.
// Las claves van en minúscula y sin espacios: xantibody, armor, hybrid y xroswars (los textos de cada una están en i18n.js: "misc.<clave>.*").
const ORDEN_MISC = ['xantibody', 'armor', 'hybrid', 'xroswars'];

export function infoMisc(clave) {
    if (!ORDEN_MISC.includes(clave)) return;
    ultimaInfoAbierta = { fn: infoMisc, args: [clave] };
    const datos = [[t('misc.enCarta'), t(`misc.${clave}.enCarta`)]];
    // (Armor y Hybrid no son un nivel: dicen en cuál de los 8 quedó cada uno, con un enlace a su ventana)
    if (clave === 'armor' || clave === 'hybrid') datos.push([t('misc.nivel'), enlazarTexto(t(`misc.${clave}.nivel`))]);
    datos.push([t('misc.buscar'), t(`misc.${clave}.buscar`)]);
    mostrarInfo(t(`misc.${clave}.titulo`), t(`misc.${clave}.desc`), datos, t(`misc.${clave}.pie`));
}

// Clics en referencias cruzadas (links)
const alTocarUnaReferencia = evento => {
    const linkT = evento.target.closest('.info-link-atributo');
    if (linkT) {
        evento.preventDefault();
        evento.stopPropagation();
        const atributo = linkT.dataset.infoAtributo;
        if (atributo) {
            infoAtributo(atributo);
        }
        return;
    }

    const linkE = evento.target.closest('.info-link-elemento');
    if (linkE) {
        evento.preventDefault();
        evento.stopPropagation();
        const elemento = linkE.dataset.infoElemento;
        if (elemento) {
            infoElemento(elemento);
        }
        return;
    }

    const linkN = evento.target.closest('.info-link-nivel');
    if (linkN) {
        evento.preventDefault();
        evento.stopPropagation();
        const nivel = linkN.dataset.infoNivel;
        if (nivel) {
            infoNivel(nivel);
        }
        return;
    }
};

// Redibujar la ventana si se cambia el idioma o el sistema de niveles
const redibujarInfoAbierta = () => {
    if (!ultimaInfoAbierta) return;
    const popup = document.querySelector('.popup-info:not(.popup-ataques)');
    if (popup && typeof Swal !== 'undefined' && Swal.isVisible()) {
        ultimaInfoAbierta.fn(...ultimaInfoAbierta.args);
    }
};

// ---- Ventana de ataques de una carta ---------------------------------------------------------------------------------
// El botón "⚔️ Ataques" del dorso (lo arma cartas.js al construir el dorso). Abre una lista con todos los ataques de la carta; al tocar
// uno se despliega qué hace (la descripción viene de la API, en inglés). Se abren de a uno o varios a la vez: abrir uno no cierra los otros (ver más abajo).
let cartaDeAtaques = null; // la carta cuya ventana de ataques está abierta (para reescribirla si se cambia el idioma)

export function crearBotonAtaques(carta) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'c-ataques';
    boton.textContent = t('ataques.boton');
    boton.title = t('ataques.boton.ayuda');
    activarBotonDelDorso(boton, () => abrirAtaques(carta)); // toque rápido con el dedo y hundimiento (gestos.js)
    return boton;
}

function obtenerDigimonsConAtaque(nombreAtaque) {
    if (!nombreAtaque) return [];
    const nombreNormalizado = nombreAtaque.trim().toLowerCase();
    const cartas = Array.from(document.querySelectorAll('#listado-digimons > li'));
    const encontradas = cartas.filter(carta => {
        const habilidades = carta.datosDorso?.habilidades || [];
        return habilidades.some(h => (h.nombre || '').trim().toLowerCase() === nombreNormalizado);
    });

    // Ordenamos por nivel (menor a mayor poder) y luego por nombre
    encontradas.sort((a, b) => {
        const nvA = numeracionNiveles[a.dataset.nivelApi] ?? 99;
        const nvB = numeracionNiveles[b.dataset.nivelApi] ?? 99;
        if (nvA !== nvB) return nvA - nvB;
        const nomA = nombreCompleto(a);
        const nomB = nombreCompleto(b);
        return nomA.localeCompare(nomB);
    });

    return encontradas;
}

function crearMiniNodoDigimon(carta) {
    const id = carta.dataset.id;
    const nodo = document.createElement('button');
    nodo.type = 'button';
    nodo.className = 'evo-nodo ataque-digimon-nodo';
    nodo.dataset.id = id;

    const nvOriginal = carta.dataset.nivelApi;
    const nvNumero = numeracionNiveles[nvOriginal];
    const color = COLOR_NIVEL[nvNumero] || carta.querySelector('.c-arte')?.style.getPropertyValue('--c') || COLOR_NIVEL_DESCONOCIDO;
    nodo.style.setProperty('--c', color);

    const nombreTexto = nombreCompleto(carta);
    nodo.title = `${nombreTexto} (${t('ataques.irACarta') || 'Ir a la carta'})`;

    const imagen = document.createElement('img');
    const imgOrigen = carta.querySelector('.c-arte img');
    imagen.src = imgOrigen?.currentSrc || imgOrigen?.src || '';
    imagen.alt = '';
    imagen.draggable = false;

    const texto = document.createElement('span');
    texto.className = 'evo-txt';

    const nombre = document.createElement('span');
    nombre.className = 'evo-nombre';
    nombre.textContent = nombreTexto;

    const nivel = document.createElement('span');
    nivel.className = 'evo-nv';
    nivel.textContent = nombreNivel(carta.dataset.nivelApi);

    texto.append(nombre, nivel);
    nodo.append(imagen, texto);

    nodo.addEventListener('click', e => {
        e.stopPropagation();
        irALaCarta(id);
    });

    return nodo;
}

function crearListaDeAtaques(habilidades, cartaActual) {
    const lista = document.createElement('ul');
    lista.className = 'ataques-lista';

    for (const habilidad of habilidades) {
        const item = document.createElement('li');
        item.className = 'ataque-item';

        // En la lista cada ataque lleva un solo nombre: el de la API (el nombre japonés escrito con letras latinas, como en Wikimon: "Baby Flame" o "Surudoi Tsume").
        // La traducción (la API la trae solo para algunos, los de nombre japonés de verdad) se muestra recién al abrir el ataque, entre paréntesis
        const nombre = document.createElement('span');
        nombre.className = 'ataque-nombre';
        nombre.textContent = habilidad.nombre;

        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'ataque-boton';
        boton.setAttribute('aria-expanded', 'false');
        const flecha = document.createElement('span');
        flecha.className = 'ataque-flecha';
        flecha.setAttribute('aria-hidden', 'true');
        flecha.textContent = '▾';
        boton.append(nombre, flecha);

        const detalle = document.createElement('div');
        detalle.className = 'ataque-detalle';
        detalle.hidden = true;

        const traduccion = (habilidad.traduccion || '').trim();
        if (traduccion && traduccion.toLowerCase() !== habilidad.nombre.trim().toLowerCase()) {
            const alias = document.createElement('p');
            alias.className = 'ataque-alias';
            alias.title = t('ataques.traduccion'); // al dejar el puntero encima
            alias.textContent = `(${traduccion})`;
            detalle.append(alias);
        }

        if (habilidad.descripcion) {
            const descripcion = document.createElement('p');
            descripcion.className = 'ataque-desc';
            descripcion.textContent = habilidad.descripcion;
            detalle.append(descripcion);
        } else {
            const sinDesc = document.createElement('p');
            sinDesc.className = 'ataque-desc sin-desc-texto';
            sinDesc.textContent = t('ataques.sinDescripcion');
            detalle.append(sinDesc);
        }

        // Los otros digimons que usan el mismo ataque (el dueño de la ventana no cuenta: sería repetirlo)
        const otrosConAtaque = obtenerDigimonsConAtaque(habilidad.nombre).filter(c => c.dataset.id !== cartaActual?.dataset.id);
        const seccion = document.createElement('div');
        seccion.className = 'ataque-digimons-seccion';

        if (otrosConAtaque.length === 0) {
            // Solo lo usa este digimon: un aviso corto, sin imágenes
            const soloEste = document.createElement('p');
            soloEste.className = 'ataque-solo-este';
            soloEste.textContent = t('ataques.soloEste');
            seccion.append(soloEste);
        } else {
            const titulo = document.createElement('h6');
            titulo.className = 'ataque-digimons-titulo';
            titulo.textContent = t(otrosConAtaque.length === 1 ? 'ataques.quienesUsan.uno' : 'ataques.quienesUsan', { n: otrosConAtaque.length });

            const grid = document.createElement('div');
            grid.className = 'ataque-digimons-grid';

            for (const c of otrosConAtaque) {
                grid.append(crearMiniNodoDigimon(c));
            }

            seccion.append(titulo, grid);
        }
        detalle.append(seccion);

        boton.addEventListener('click', () => {
            const abrir = boton.getAttribute('aria-expanded') !== 'true';
            // El botón se queda donde está aunque la ventana crezca (ver mantenerEnSuLugar, en ventanas.js). Por eso abrir un ataque no cierra los otros: al
            // cerrarse uno que está más arriba, los de abajo subirían y el botón que se acaba de tocar se correría de lugar
            mantenerEnSuLugar(boton, () => {
                boton.setAttribute('aria-expanded', String(abrir));
                detalle.hidden = !abrir;
            });
            sonidoFichero(abrir, FICHERO_DE_ATAQUES); // el fichero que se abre o se cierra (sonidos.js): sin tecla
            if (abrir) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });

        item.append(boton, detalle);
        lista.append(item);
    }
    return lista;
}

export function abrirAtaques(carta) {
    const habilidades = carta.datosDorso?.habilidades || [];
    if (!habilidades.length) return;
    cartaDeAtaques = carta;

    const cuerpo = document.createElement('div');
    const ayuda = document.createElement('p');
    ayuda.className = 'ataques-ayuda';
    ayuda.textContent = t('ataques.ayuda');
    cuerpo.append(ayuda, crearListaDeAtaques(habilidades, carta));
    const pie = document.createElement('p');
    pie.className = 'info-pie ataques-pie';
    pie.textContent = t('carta.idiomaOriginal'); // las descripciones de la API vienen en inglés (en inglés no hace falta avisar)
    pie.hidden = !pie.textContent;
    cuerpo.append(pie);

    Swal.fire({
        titleText: t('ataques.titulo', { nombre: nombreCompleto(carta) }),
        html: cuerpo,
        ...conCruzDeCierre(),
        showConfirmButton: false, // se cierra con la cruz, tocando afuera o con Esc: sin "Aceptar"
        width: 'min(94vw, 680px)',
        customClass: { popup: 'popup-info popup-ataques' }, // el título con la fuente pixelada, como las otras ventanas de información
        willClose: () => {
            cartaDeAtaques = null;
        },
    });
}

// Si se cambia el idioma con la ventana abierta, el título, la ayuda y el aviso se vuelven a escribir en el idioma nuevo
const traducirVentanaDeAtaques = () => {
    if (!cartaDeAtaques) return;
    const titulo = Swal.getTitle();
    if (titulo) titulo.textContent = t('ataques.titulo', { nombre: nombreCompleto(cartaDeAtaques) });
    const ayuda = document.querySelector('.popup-ataques .ataques-ayuda');
    if (ayuda) ayuda.textContent = t('ataques.ayuda');
    document.querySelectorAll('.popup-ataques .ataque-alias').forEach(alias => (alias.title = t('ataques.traduccion')));
    const pie = document.querySelector('.popup-ataques .ataques-pie');
    if (pie) {
        pie.textContent = t('carta.idiomaOriginal');
        pie.hidden = !pie.textContent;
    }
};

// Qué ventana abre cada menú (por el id de su lista)
const VENTANA_DE_CADA_MENU = {
    'lista-atributos': infoAtributo,
    'lista-elementos': infoElemento,
    'lista-niveles': infoNivel,
    'lista-misc': infoMisc,
};

// Escribe las opciones de un menú: cada botón guarda en data-k el identificador de lo que abre
function escribirOpciones(idLista, opciones) {
    const items = opciones.map(([clave, texto]) => {
        const item = document.createElement('li');
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.dataset.k = clave;
        boton.textContent = texto;
        item.append(boton);
        return item;
    });
    document.getElementById(idLista).replaceChildren(...items);
}

// Se llama al cargar la página y cada vez que cambia el idioma
function escribirMenus() {
    escribirOpciones(
        'lista-atributos',
        ORDEN_ATRIBUTOS_MENU.map(atributo => [atributo, conEmojiAtributo(atributo)]),
    );
    escribirOpciones(
        'lista-elementos',
        ORDEN_ELEMENTOS.map(elemento => [elemento, conEmojiElemento(elemento)]),
    );
    escribirOpciones(
        'lista-niveles',
        ORDEN_NIVELES.map(nivelApi => {
            const poder = numeracionNiveles[nivelApi];
            const nombre = nombreNivel(nivelApi);
            return [nivelApi, poder === undefined ? nombre : t('info.nivelItem', { nombre, n: poder })];
        }),
    );
    escribirOpciones(
        'lista-misc',
        ORDEN_MISC.map(clave => [clave, t(`misc.${clave}.titulo`)]),
    );
}

// Comportamiento de los menús: un botón que abre y cierra la lista con el clic (también con teclado).
// Se cierra al elegir una opción, al hacer clic afuera o con Esc.
function activarMenusInfo() {
    const menus = document.querySelectorAll('.menu-info');
    const estaAbierto = menu => menu.classList.contains('abierto');
    const abrir = (menu, abierto) => {
        menu.classList.toggle('abierto', abierto);
        menu.querySelector('.menu-desplegable').setAttribute('aria-expanded', String(abierto));
    };

    menus.forEach(menu => {
        const lista = menu.querySelector('ul');

        menu.querySelector('.menu-desplegable').addEventListener('click', () => abrir(menu, !estaAbierto(menu)));

        lista.addEventListener('click', evento => {
            const boton = evento.target.closest('button[data-k]');
            if (!boton) return;
            abrir(menu, false);
            VENTANA_DE_CADA_MENU[lista.id](boton.dataset.k);
        });
    });

    // Tocar afuera cierra las listas abiertas. Con el dedo, dentro del panel del menú ☰ no se cierra ninguna: las listas se abren y se cierran solo con
    // su propio botón, y abrir una no cierra las otras. Así el botón que se toca nunca se corre de lugar (si al abrir una se cerrara otra que está más
    // arriba, los botones de abajo subirían), y el panel se puede desplazar con el dedo sin que apoyarlo en cualquier lugar cierre la lista que se
    // estaba mirando (el panel se desplaza cuando con una lista abierta no entra en la pantalla). El panel se cierra entero con ☰, tocando afuera o con Esc.
    document.addEventListener('pointerdown', evento => {
        if (evento.pointerType === 'touch' && evento.target.closest('#menu-movil')) return;
        menus.forEach(menu => {
            if (estaAbierto(menu) && !menu.contains(evento.target)) abrir(menu, false);
        });
    });

    document.addEventListener('keydown', evento => {
        if (evento.key !== 'Escape') return;
        menus.forEach(menu => {
            if (estaAbierto(menu)) {
                abrir(menu, false);
                menu.querySelector('.menu-desplegable').focus();
            }
        });
    });
}

// Pone en marcha las ventanas de información y los menús (lo llama main.js)
export function activarInfo() {
    document.addEventListener('click', alTocarUnaReferencia);
    document.addEventListener('idioma-cambiado', redibujarInfoAbierta);
    document.addEventListener('niveles-cambiados', redibujarInfoAbierta);
    document.addEventListener('idioma-cambiado', traducirVentanaDeAtaques);
    escribirMenus();
    activarMenusInfo();
    document.addEventListener('idioma-cambiado', escribirMenus);
    document.addEventListener('niveles-cambiados', escribirMenus); // la lista de niveles usa los nombres del sistema vigente
}
