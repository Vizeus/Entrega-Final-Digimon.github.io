// -----------------------------------------------------------------------------------------------------------------
// LAS CARTAS
//
// Cómo se arma cada carta (nombre ajustado al largo, dorso, textos según el idioma, giro 3D), cómo entran a la lista (de a
// tandas) y las ventanas que se abren desde sus chips y botones (atributo, elemento, nivel, ataques y evolución).
// -----------------------------------------------------------------------------------------------------------------

import { emitir, ponerAyuda } from './util.js';
import { EMOJIS_ELEMENTO, EMOJIS_ATRIBUTO, MARCAS_DE_NIVEL, SIN_DATO, esXrosWars, numeracionNiveles } from './datos.js';
import { nombreElemento, nombreAtributo, t } from './i18n.js';
import { claveDeNombre, inicioDeLoAparte, nombreOccidental, nombreParaMostrar } from './nombres.js';
import { cartasPorId, listaDigimons, nombreNivel } from './pagina.js';
import { actualizarBarraProgreso, contadorDigimons } from './api.js';
import { seleccionados, verificarSeleccion } from './combate.js';
import { cartaEnZoom, volverAlZoomNormal, zoomExtra, zoomOcupado } from './zoom.js';
import { vibrar } from './audio.js';
import { sonidoSeleccion, sonidoVuelta } from './sonidos.js';
import { abrirAtaques, crearBotonAtaques, infoElemento, infoNivel, infoAtributo, infoMisc } from './info.js';
import { abrirEvolucion, crearBotonEvolucion } from './evolucion.js';

// -----------------------------------------------------------------------------------------------------------------
// DISEÑO DE LAS CARTAS: nombre ajustado al largo, dorso con la descripción y giro 3D
// -----------------------------------------------------------------------------------------------------------------

// Si la persona pidió menos animaciones en su sistema, no giramos ni inclinamos las cartas
export const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// El "(X-Antibody)" no va en el nombre de la carta: se muestra aparte, como una gema con una X (.c-x).
// separarXAntibody('Omegamon (X-Antibody)') → { nombre: 'Omegamon', xAntibody: true }
export function separarXAntibody(nombre) {
    const limpio = nombre.replace(/\s*\(\s*x-antibody\s*\)/i, '').trim();
    return { nombre: limpio, xAntibody: limpio !== nombre.trim() };
}

// Nombre completo de una carta, con su "(X-Antibody)" si lo tiene. Lo usan el combate, la evolución y el dorso,
// para que no se confunda con la versión normal del mismo digimon. Es el que se ve, o sea, el del idioma actual (ver nombres.js).
const conXAntibody = (carta, nombre) => (carta.dataset.xAntibody ? `${nombre} (X-Antibody)` : nombre);

export function nombreCompleto(carta) {
    return conXAntibody(carta, carta.querySelector('h4').textContent.trim());
}

// Los dos nombres de un digimon, también con su "(X-Antibody)": el original (el que trae la API) y el occidental.
// El buscador usa los dos, así se lo encuentra por cualquiera.
export const nombreApiCompleto = carta => conXAntibody(carta, carta.dataset.nombreApi);
export const nombreOccidentalCompleto = carta => conXAntibody(carta, nombreOccidental(carta.dataset.nombreApi));

// El otro nombre del digimon, el que NO se ve en la carta, si tiene uno distinto. Se cuenta en el dorso. En español y en inglés la carta muestra
// el occidental, así que el otro es el original japonés (el de la API); con el japonés sería al revés. Si los dos nombres son iguales (casi
// todos los digimon), devuelve null. Tampoco cuenta como otro nombre el que solo se diferencia en los espacios, los guiones, las mayúsculas o las
// tildes ('MetalSeadramon' y 'Metal Seadramon'): contarlo en el dorso sería repetir lo mismo.
// nombreAlternativo(carta de Omnimon) → { etiqueta: 'carta.nombreOriginal', nombre: 'Omegamon' }
function nombreAlternativo(carta) {
    const original = nombreApiCompleto(carta);
    const occidental = nombreOccidentalCompleto(carta);
    if (claveDeNombre(original) === claveDeNombre(occidental)) return null; // (claveDeNombre: ver nombres.js)
    const visible = conXAntibody(carta, nombreParaMostrar(carta.dataset.nombreApi));
    return visible === original ? { etiqueta: 'carta.nombreOccidental', nombre: occidental } : { etiqueta: 'carta.nombreOriginal', nombre: original };
}

// Nombre en la carta: lo que va entre paréntesis o entre guiones ("Gabumon -Yujo no Kizuna-") pasa a una segunda línea, más chica.
// El texto completo del <h4> no cambia (el combate lo lee con textContent).
function ponerNombre(elemento, nombre) {
    const posicion = inicioDeLoAparte(nombre);
    if (posicion <= 0) {
        elemento.textContent = nombre;
        return;
    }
    const aparte = document.createElement('span');
    aparte.className = 'c-aparte';
    aparte.textContent = nombre.slice(posicion);
    elemento.append(nombre.slice(0, posicion), aparte);
}

// Escribe el nombre de la carta (en el idioma actual) en el frente, en el dorso si ya se armó y en el texto de su imagen
export function escribirNombre(carta) {
    const titulo = carta.querySelector('h4');
    titulo.textContent = '';
    ponerNombre(titulo, nombreParaMostrar(carta.dataset.nombreApi));
    carta.querySelector('.c-arte img').alt = nombreCompleto(carta);

    const nombreDorso = carta.querySelector('.c-dorso .c-nombre');
    if (nombreDorso) {
        nombreDorso.textContent = '';
        ponerNombre(nombreDorso, nombreCompleto(carta));
    }
}

// Tamaño del nombre según su largo: los cortos se agrandan hasta llenar la placa y los largos quedan chicos
// (en dos líneas si no entran). Se mide con un canvas, usando la misma tipografía que el CSS.
const MAX_CRECIMIENTO = 1.5; // un nombre corto puede crecer hasta 1,5 veces el tamaño base
const MAX_CRECIMIENTO_PAREN = 1.25; // si tiene paréntesis, la línea de arriba crece menos para que entren las dos líneas
const MIN_TAMANO_PAREN = 7.5; // tamaño mínimo (en px) de la línea del paréntesis

let medidasNombre = null; // se calculan una sola vez, con la primera carta

function medirPlaca(carta) {
    const raiz = getComputedStyle(document.documentElement);
    const cabecera = carta.querySelector('.c-cab');
    const estilo = getComputedStyle(cabecera);
    const base = parseFloat(raiz.getPropertyValue('--t-nombre'));
    const contexto = document.createElement('canvas').getContext('2d');
    contexto.font = `${raiz.getPropertyValue('--p-titulo').trim()} ${base}px ${raiz.getPropertyValue('--f-titulo').trim()}, sans-serif`;
    const altoUtil = cabecera.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
    return {
        base,
        contexto,
        espaciado: parseFloat(raiz.getPropertyValue('--ls-titulo')) || 0,
        ancho: cabecera.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight),
        limiteSuma: altoUtil / 1.15, // suma máxima de los tamaños de las dos líneas
    };
}

// La carta tiene que estar ya agregada a la página para poder medir su placa
export function ajustarNombre(carta) {
    if (!medidasNombre) {
        medidasNombre = medirPlaca(carta);
    }
    const { base, contexto, espaciado, ancho, limiteSuma } = medidasNombre;
    const medir = texto => contexto.measureText(texto).width + espaciado * texto.length;

    const titulo = carta.querySelector('.c-cab h4');
    const aparte = titulo.querySelector('.c-aparte');

    if (!aparte) {
        // Si entra en una línea al tamaño base, lo agrandamos hasta llenar ~92% de la placa; si no, queda en dos líneas
        const anchoNombre = medir(titulo.textContent.trim());
        const k = anchoNombre < ancho ? Math.max(1, Math.min(MAX_CRECIMIENTO, (ancho * 0.92) / anchoNombre)) : 1;
        carta.style.setProperty('--k', k.toFixed(3));
        return;
    }

    // Con paréntesis: arriba el nombre y abajo el paréntesis, más chico (los dos tienen que entrar en la placa)
    const principal = titulo.firstChild.textContent.trim();
    let tamanoPrincipal = base * Math.max(0.75, Math.min(MAX_CRECIMIENTO_PAREN, (ancho * 0.94) / medir(principal)));
    const anchoPorPx = medir(aparte.textContent.trim()) / base;
    let tamanoAparte = Math.max(MIN_TAMANO_PAREN, Math.min(tamanoPrincipal * 0.8, (ancho * 0.94) / anchoPorPx));
    if (tamanoPrincipal + tamanoAparte > limiteSuma) {
        tamanoAparte = Math.max(MIN_TAMANO_PAREN, limiteSuma - tamanoPrincipal);
        if (tamanoPrincipal + tamanoAparte > limiteSuma) {
            tamanoPrincipal = limiteSuma - tamanoAparte;
        }
    }
    carta.style.setProperty('--k', (tamanoPrincipal / base).toFixed(3));
    carta.style.setProperty('--sp', `${tamanoAparte.toFixed(1)}px`);
}

// Espera a que carguen las tipografías de las cartas (si tardan más de 3 segundos, sigue igual)
export function esperarTipografias() {
    const cargas = ['800 12px "Orbitron"', '700 12px "Pixelify Sans"', '500 12px "Exo 2"', '12px "DotGothic16"'].map(fuente =>
        document.fonts.load(fuente).catch(() => null),
    );
    return Promise.race([Promise.all(cargas), new Promise(resolve => setTimeout(resolve, 3000))]);
}

// Dorso de la carta: se arma la primera vez que se gira, con los datos que ya trajimos de la API
function construirDorso(carta) {
    const datos = carta.datosDorso;
    const dorso = document.createElement('div');
    dorso.className = 'c-dorso';
    dorso.innerHTML = '<div class="c-cab"><div class="c-nombre"></div></div><div class="c-cuerpo"></div>';
    ponerNombre(dorso.querySelector('.c-nombre'), nombreCompleto(carta));

    const cuerpo = dorso.querySelector('.c-cuerpo');
    for (const [etiqueta, valor] of [
        ['carta.especie', datos.especies?.length ? datos.especies.join(', ') : '–'],
        ['carta.campos', datos.campos?.length ? datos.campos.join(', ') : '–'],
        ['carta.estreno', datos.estreno],
    ]) {
        const linea = document.createElement('p');
        linea.className = 'dato';
        const negrita = document.createElement('b');
        negrita.textContent = `${t(etiqueta)}:`;
        linea.append(negrita, ` ${valor}`);
        cuerpo.append(linea);
    }

    // Si el digimon tiene otro nombre (el original japonés, que la carta no muestra), se cuenta justo antes de la descripción
    const alternativo = nombreAlternativo(carta);
    if (alternativo) {
        const linea = document.createElement('p');
        linea.className = 'dato c-alias';
        const negrita = document.createElement('b');
        negrita.textContent = `${t(alternativo.etiqueta)}:`;
        linea.append(negrita, ` ${alternativo.nombre}`);
        cuerpo.append(linea);
    }

    const descripcion = document.createElement('p');
    descripcion.className = 'c-desc';
    descripcion.textContent = datos.descripcion || t('carta.sinDescripcion');
    cuerpo.append(descripcion);

    // La descripción de la API siempre viene en inglés: para quien lee en español se avisa; en inglés no hace falta
    const aviso = t('carta.idiomaOriginal');
    if (aviso) {
        const nota = document.createElement('p');
        nota.className = 'c-idioma';
        nota.textContent = aviso;
        cuerpo.append(nota);
    }

    // Botones del pie: "⚔️ Ataques" (info.js; solo si tiene ataques), con todos sus ataques y qué hace cada uno, y
    // "🧬 Evolución" (evolucion.js), con el árbol de de quién viene y a qué evoluciona
    const botones = document.createElement('div');
    botones.className = 'c-botones';
    if (datos.habilidades?.length) botones.append(crearBotonAtaques(carta));
    botones.append(crearBotonEvolucion(carta));
    dorso.append(botones);

    return dorso;
}

// Escribe el nombre del nivel de una carta según el sistema de clasificación vigente (Japón o EE.UU.): el rótulo de abajo y la ayuda
// (el cartelito que sale al dejar el puntero encima y el texto para lectores de pantalla) de la gema y del rótulo. Se vuelve a llamar
// al cambiar de sistema (main.js), así la ayuda no se queda con el nombre del sistema anterior.
export function escribirNivel(carta) {
    const textoNivel = nombreNivel(carta.dataset.nivelApi);
    const ayudaNivel = t('carta.infoNivel', { nivel: textoNivel });
    const gema = carta.querySelector('.c-gema');
    const nivel = carta.querySelector('.c-nivel');
    if (gema) ponerAyuda(gema, ayudaNivel);
    if (nivel) {
        nivel.textContent = textoNivel;
        ponerAyuda(nivel, ayudaNivel);
    }
}

// Escribe en el idioma actual los textos de una carta: "NV", el nivel, el atributo, el elemento y el botón de dar vuelta.
// Si el dorso ya se había armado, se rehace para que también quede traducido.
function traducirCarta(carta) {
    const { atributo, elemento } = carta.dataset;

    const gema = carta.querySelector('.c-gema');
    const chipAtributo = carta.querySelector('.c-atributo');
    const chipElem = carta.querySelector('.c-elem');

    const textoAtributo = nombreAtributo(atributo);
    const textoElem = nombreElemento(elemento);

    if (gema) gema.querySelector('small').textContent = t('carta.nv');
    escribirNivel(carta);
    if (chipAtributo) {
        chipAtributo.textContent = `${textoAtributo} ${EMOJIS_ATRIBUTO[atributo]}`;
        const ayudaAtributo = t('carta.infoAtributo', { atributo: textoAtributo });
        ponerAyuda(chipAtributo, ayudaAtributo);
    }
    if (chipElem) {
        chipElem.textContent = `${textoElem} ${EMOJIS_ELEMENTO[elemento]}`;
        const ayudaElem = t('carta.infoElemento', { elemento: textoElem });
        ponerAyuda(chipElem, ayudaElem);
    }

    const botonVoltear = carta.querySelector('.c-flip');
    if (botonVoltear) {
        ponerAyuda(botonVoltear, t('carta.voltear'));
    }

    const dorsoViejo = carta.querySelector('.c-dorso');
    if (dorsoViejo) {
        const dorsoNuevo = construirDorso(carta);
        dorsoNuevo.style.height = dorsoViejo.style.height; // mide lo mismo que antes
        dorsoViejo.replaceWith(dorsoNuevo);
    }
}

// Al cambiar de idioma se traducen todas las cartas que ya están en la página
document.addEventListener('idioma-cambiado', () => {
    listaDigimons.querySelectorAll(':scope > li').forEach(traducirCarta);
});

// Da vuelta la carta entera en 3D: gira hasta 90° (de canto), cambia de cara y termina de girar
export const PERSPECTIVA = 'perspective(800px) ';

// direccion: 1 gira hacia un lado y -1 hacia el otro (con el barrido del dedo, la carta gira hacia donde va el dedo)
export async function voltearCarta(carta, direccion = 1) {
    if (carta.girando || (zoomOcupado && carta === cartaEnZoom)) return;
    emitir('click-chip-carta', { accion: 'voltear' });
    carta.girando = true;
    if (carta === cartaEnZoom && zoomExtra) await volverAlZoomNormal(carta); // el zoom extra es solo del frente

    const frente = carta.querySelector('.c-frente');
    let dorso = carta.querySelector('.c-dorso');
    const estabaDeFrente = !carta.classList.contains('de-dorso');

    if (estabaDeFrente) {
        if (!dorso) {
            dorso = construirDorso(carta);
            carta.appendChild(dorso);
            carta.classList.add('con-dorso'); // desde ahora el frente de esta carta se dibuja siempre (ver "content-visibility" en _cartas.scss)
        }
        dorso.style.height = `${frente.offsetHeight}px`; // el dorso mide lo mismo que el frente
    }

    void sonidoVuelta(carta === cartaEnZoom); // el desbloqueo del audio móvil no debe retrasar el giro visual (con la carta ampliada suena más fuerte)

    if (reducirMovimiento) {
        carta.classList.toggle('de-dorso');
        carta.girando = false;
        return;
    }

    const primeraMitad = carta.animate(
        [
            { transform: `${PERSPECTIVA}rotateY(0deg)`, scale: 1 },
            { transform: `${PERSPECTIVA}rotateY(${90 * direccion}deg)`, scale: 1.06 },
        ],
        { duration: 230, easing: 'ease-in', fill: 'forwards' },
    );
    await primeraMitad.finished;

    carta.classList.toggle('de-dorso'); // de canto no se ve: cambiamos de cara
    const segundaMitad = carta.animate(
        [
            { transform: `${PERSPECTIVA}rotateY(${-90 * direccion}deg)`, scale: 1.06 },
            { transform: `${PERSPECTIVA}rotateY(0deg)`, scale: 1 },
        ],
        { duration: 230, easing: 'ease-out' },
    );
    primeraMitad.cancel();
    await segundaMitad.finished;

    carta.girando = false;
    emitir('giro-terminado', carta); // la inclinación retoma si el mouse sigue encima
}

// Las ventanas que se abren desde los botones de una carta (info.js y evolucion.js). Los del frente (atributo, elemento y nivel)
// necesitan un dato de la carta y avisan con "click-chip-carta"; los del dorso (ataques y evolución) reciben la carta entera.
// (Los del frente, además de atributo, elemento y nivel, son las marcas de la esquina: X-Antibody, Armor, Hybrid y Xros Wars.)
const VENTANAS_DE_LA_CARTA = [
    { boton: '.c-atributo', dato: 'atributo', aviso: 'atributo', abrir: infoAtributo },
    { boton: '.c-elem', dato: 'elemento', aviso: 'elemento', abrir: infoElemento },
    { boton: '.c-gema, .c-nivel', dato: 'nivelApi', aviso: 'nivel', abrir: infoNivel },
    // Las marcas de la esquina de arriba a la izquierda (X-Antibody, Armor o Hybrid, Xros Wars): cada una abre la ventana que explica qué es y cómo buscarla
    { boton: '.c-x', dato: 'xAntibody', aviso: 'misc', abrir: () => infoMisc('xantibody') },
    { boton: '.c-marca', dato: 'marca', aviso: 'misc', abrir: marca => infoMisc(marca.toLowerCase()) },
    { boton: '.c-xw', dato: 'xrosWars', aviso: 'misc', abrir: () => infoMisc('xroswars') },
    { boton: '.c-ataques', abrir: abrirAtaques },
    { boton: '.c-evo', abrir: abrirEvolucion },
];
const dentroDeUnaCarta = botones => `#listado-digimons li :is(${botones})`;

// Al hacer clic en el nivel (la gema o el nombre), atributo, elemento o marca (X-Antibody, Armor, Hybrid, Xros Wars) de una carta, se abre su ventana de información (info.js)
// sin seleccionar la carta para el combate ni cerrarla si está en modo zoom. Lo mismo con los botones del dorso.
export function activarCartelesDeInfoEnCartas() {
    document.addEventListener(
        'click',
        evento => {
            for (const { boton, dato, aviso, abrir } of VENTANAS_DE_LA_CARTA) {
                const carta = evento.target.closest?.(dentroDeUnaCarta(boton))?.closest('#listado-digimons li');
                if (!carta || (dato && !carta.dataset[dato])) continue;
                evento.stopPropagation();
                if (dato) {
                    emitir('click-chip-carta', { [aviso]: carta.dataset[dato] });
                    abrir(carta.dataset[dato]);
                } else {
                    abrir(carta);
                }
                return;
            }
        },
        true,
    );

    // Accesibilidad por teclado: Enter o Espacio sobre la gema, el nivel, los chips o los botones del dorso activa el clic
    const TODOS_LOS_BOTONES = dentroDeUnaCarta(VENTANAS_DE_LA_CARTA.map(({ boton }) => boton).join(', '));
    document.addEventListener('keydown', evento => {
        if (evento.key !== 'Enter' && evento.key !== ' ') return;
        const boton = evento.target.closest?.(TODOS_LOS_BOTONES);
        if (!boton) return;
        evento.preventDefault();
        boton.click();
    });
}

// Las cartas de nivel 7 y 8 tienen un marco que gira. Si giran todas a la vez (hasta las que están lejos), la página se
// pone lenta: por eso solo giran las que están en pantalla. Esto les pone o les saca la clase "en-pantalla" (la usa el CSS).
const observadorDeMarcos =
    'IntersectionObserver' in window
        ? new IntersectionObserver(
              entradas => {
                  entradas.forEach(entrada => entrada.target.classList.toggle('en-pantalla', entrada.isIntersecting));
              },
              { rootMargin: '150px' },
          )
        : null;

export let seleccionAntesDelClic = { carta: null, estado: [] }; // cómo estaba la selección antes del primer clic de un doble clic (zoom.js la usa)

// Crea una carta, la agrega a la lista y avisa a los filtros. La usan los digimons de la API y las cartas propias.
export function agregarCarta({ id, etiquetaId, despuesDelId, nombre, imagen, atributo, nivelOriginal, marca, elemento, datosDorso: datosDeLaCarta }) {
    // Sin especie o sin grupo = "Unknown" (ver SIN_DATO en datos.js): así el dorso y los filtros ven siempre al menos uno
    const conDato = lista => (lista?.length ? lista : [SIN_DATO]);
    const datosDorso = { ...datosDeLaCarta, especies: conDato(datosDeLaCarta?.especies), campos: conDato(datosDeLaCarta?.campos) };

    // Datos que usa el combate y el diseño de la carta
    const nivelNumerico = numeracionNiveles[nivelOriginal]; // undefined si el nivel es desconocido
    const { nombre: nombreEnCarta, xAntibody } = separarXAntibody(nombre); // el X-Antibody va en su propia gema

    // ---Creación de la lista con el DOM---
    const elementoLista = document.createElement('li');

    // Guardamos los datos en la propia carta (data-atributo, data-nivel y data-elemento).
    // El atributo y el elemento van en español porque el combate y los filtros los usan como identificadores;
    // data-nivel-api es el nivel tal cual lo trae la API (no depende del idioma ni del sistema de clasificación).
    elementoLista.dataset.id = id;
    // Dónde va en el orden "por ID": las cartas propias (que no están en la API) van después de un ID de la API; el resto, en su propio lugar
    if (despuesDelId !== undefined) elementoLista.dataset.lugarEnElOrden = String(despuesDelId + 0.5);
    elementoLista.dataset.atributo = atributo;
    elementoLista.dataset.elemento = elemento;
    elementoLista.dataset.nivelApi = nivelOriginal;
    elementoLista.dataset.nombreApi = nombreEnCarta; // el nombre original; el que se ve sale de acá según el idioma (escribirNombre)
    if (xAntibody) {
        elementoLista.dataset.xAntibody = 'true';
    }
    const datosMarca = MARCAS_DE_NIVEL[marca]; // undefined si no es Armor ni Hybrid
    if (datosMarca) {
        elementoLista.dataset.marca = datosMarca.nombre;
    }
    const xrosWars = esXrosWars(datosDorso.estreno); // estrenado en 2010-2012 (los de Digimon Xros Wars): lleva su propia marca (XW)
    if (xrosWars) {
        elementoLista.dataset.xrosWars = 'true';
    }
    if (nivelNumerico !== undefined) {
        elementoLista.dataset.nivel = nivelNumerico;
        elementoLista.style.setProperty('--nivel', nivelNumerico); // el CSS lo usa para la intensidad del color
    }

    // Creamos la "carta" del digimon. Los textos que cambian con el idioma (nivel, atributo, elemento, "NV"...) los pone
    // traducirCarta(); el nombre lo pone ponerNombre para separar lo que va entre paréntesis.
    elementoLista.innerHTML = `
        ${nivelNumerico >= 7 ? '<span class="c-marco" aria-hidden="true"></span>' : ''}
        <span class="c-puente" aria-hidden="true"></span>
        <div class="c-frente">
            <div class="c-cab"><h4></h4></div>
            <div class="c-arte">
                <img alt="" loading="lazy" decoding="async" draggable="false">
                ${xAntibody ? '<span class="c-x" title="X-Antibody" role="button" tabindex="0" aria-label="X-Antibody">X</span>' : ''}
                ${datosMarca ? `<span class="c-marca" title="${datosMarca.nombre}" role="button" tabindex="0" aria-label="${datosMarca.nombre}">${datosMarca.letra}</span>` : ''}
                ${xrosWars ? '<span class="c-xw" title="Xros Wars" role="button" tabindex="0" aria-label="Xros Wars">XW</span>' : ''}
                <span class="c-gema" role="button" tabindex="0"><small></small>${nivelNumerico ?? '?'}</span>
            </div>
            <div class="c-sub"><span class="c-nivel" role="button" tabindex="0"></span><span>#${etiquetaId ?? String(id).padStart(3, '0')}</span></div>
            <div class="c-chips">
                <span class="chip c-atributo" role="button" tabindex="0"></span>
                <span class="chip c-elem" role="button" tabindex="0"></span>
            </div>
        </div>
        <button class="c-flip" type="button">↻</button>`;
    elementoLista.querySelector('.c-arte img').src = imagen; // la dirección de la imagen (viene de la API) va aparte, no dentro del HTML
    escribirNombre(elementoLista);
    traducirCarta(elementoLista);

    // Datos para el dorso de la carta (ya los tenemos, no hace falta volver a pedirlos a la API)
    elementoLista.datosDorso = datosDorso;

    // El botón de dar vuelta la carta no la selecciona para el combate
    // Con el mouse el botón no toma el foco: si no, al hacer clic (sobre todo con Shift apretada: el navegador lo toma como un clic "de teclado")
    // quedaba resaltado con el aro de foco y a la vista hasta hacer clic en otro lado. Con el teclado (Tab y Enter o Espacio) sigue andando igual.
    const botonVoltear = elementoLista.querySelector('.c-flip');
    botonVoltear.addEventListener('mousedown', evento => evento.preventDefault());
    botonVoltear.addEventListener('click', evento => {
        evento.stopPropagation();
        if (evento.detail > 0) botonVoltear.blur(); // (clic de mouse o de dedo; el de teclado trae detail 0)
        voltearCarta(elementoLista);
    });

    // Agregamos el manejador de eventos al <li>
    elementoLista.addEventListener('click', evento => {
        if (cartaEnZoom) return; // con la carta en grande, un clic no la elige para el combate
        if (evento.target.closest('button, [role="button"]')) return; // botones y chips de la carta no la seleccionan para el combate
        // Si este clic es el primero de un doble clic, el zoom deshace lo que haga (ver activarZoom)
        if (evento.detail <= 1) seleccionAntesDelClic = { carta: elementoLista, estado: seleccionados.slice() };
        elementoLista.classList.toggle('seleccionado');

        // Al elegirla suena un "tuc" y al sacarla de la selección un "tic" más suave; en el celular también vibra un instante, menos al sacarla
        // (con el mouse no vibra). El segundo clic de un doble clic no suena: ese doble clic abre el zoom y la selección se deshace (ver activarZoom).
        const sonar = evento.detail <= 1;
        if (elementoLista.classList.contains('seleccionado')) {
            if (sonar) {
                sonidoSeleccion(true);
                if (evento.pointerType !== 'mouse') vibrar(10);
            }
            if (seleccionados.length < 2) {
                seleccionados.push(elementoLista);
            } else {
                const elementoAntiguo = seleccionados.shift();
                elementoAntiguo.classList.toggle('seleccionado');
                seleccionados.push(elementoLista);
            }
        } else {
            if (sonar) {
                sonidoSeleccion(false);
                if (evento.pointerType !== 'mouse') vibrar(5); // al sacarla vibra todavía menos que al elegirla
            }
            const index = seleccionados.indexOf(elementoLista);
            if (index > -1) {
                seleccionados.splice(index, 1);
            }
        }
        // Llamar a la función para verificar y actualizar el botón
        verificarSeleccion();
    });

    // La carta espera un ratito y entra a la lista junto con las que lleguen mientras tanto (ver colocarCartas)
    cartasEnEspera.push({ carta: elementoLista, conMarco: nivelNumerico >= 7 });
    if (!colocacionPendiente) colocacionPendiente = setTimeout(colocarCartas, COLOCAR_CADA);
}

// Mientras carga la página, las cartas no entran a la lista de a una: cada carta nueva obligaba a redibujar la lista,
// los filtros y la barra de progreso, y en el celular eso tenía el procesador siempre ocupado (los botones tardaban en
// responder o se perdían toques). Ahora se juntan y entran todas juntas unas pocas veces por segundo.
const COLOCAR_CADA = 300; // ms entre tandas
export const cartasEnEspera = [];
let colocacionPendiente = 0;

export function colocarCartas() {
    clearTimeout(colocacionPendiente);
    colocacionPendiente = 0;
    if (!cartasEnEspera.length) return;
    const tanda = cartasEnEspera.splice(0);

    // Agregamos los <li> a la lista de digimons (<ul>), todos de una vez
    listaDigimons.append(...tanda.map(({ carta }) => carta));
    for (const { carta, conMarco } of tanda) {
        if (!cartasPorId.has(carta.dataset.id)) cartasPorId.set(carta.dataset.id, carta);
        ajustarNombre(carta); // ya está en la página: ahora se puede medir su nombre
        if (conMarco) observadorDeMarcos?.observe(carta); // su marco gira solo mientras se ve

        // Avisamos que hay una carta nueva (los filtros la cuentan y, si corresponde, la esconden)
        emitir('carta-agregada', { carta });
    }
    actualizarBarraProgreso(contadorDigimons);
}
