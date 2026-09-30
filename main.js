// URL base de la API
const urlBase = 'https://digi-api.com/api/v1/digimon';

// Seleccionar el elemento <ul> (unordered list) donde agregaremos los digimons
const listaDigimons = document.getElementById('listado-digimons');

// Seleccionar la barra de progreso
const barraProgreso = document.getElementById('carga');

// Seleccionar el botón de cambiar niveles
const botonCambiarNiveles = document.getElementById('cambiar-niveles');

// Seleccionar el botón de iniciar combate
const botonIniciarCombate = document.getElementById('iniciar-combate');

// Seleccionar el contador de digimons elegidos (junto a la consigna, arriba)
const contadorSeleccion = document.getElementById('contador-seleccion');

// Número total de Digimons 
const totalDigimons = 1488; // todos los que tiene la API (digi-api.com)

// Número de páginas a recuperar
const totalPaginas = 298; // 5 digimons por página: 1488 digimons en total (la última página trae solo 3)

// Tipo (atributo) de cada Digimon: la API lo trae en inglés y por dentro lo guardamos con estos nombres en español.
// Lo que se ve en pantalla ("Datos" o "Data") lo decide i18n.js según el idioma, ver nombreTipo().
const tipoDeLaApi = {
    'Data': 'Datos',
    'Vaccine': 'Vacuna',
    'Virus': 'Virus',
    'Free': 'Libre',
    'Variable': 'Variable',
    'Unknown': 'Desconocido',
};

// Emoji de cada tipo para mostrar en la carta, en los filtros y en los menús
const EMOJIS_TIPO = {
    'Datos': '🔢',
    'Vacuna': '💉',
    'Virus': '👾',
    'Libre': '🕊️',
    'Variable': '🔀',
    'Desconocido': '❓',
};

// Mapeo de niveles para el cambio de sistema de clasificación de niveles
const nivelesAlternativos = {
    'Baby I': 'Fresh/Slime',
    'Baby II': 'In-Training',
    'Child': 'Rookie',
    'Adult': 'Champion',
    'Perfect': 'Ultimate ',
    'Ultimate': 'Mega',
    'Super Ultimate': 'Ultra' // ¿?
};

// Qué sistema de clasificación de niveles se está mostrando (lo guarda el botón de la banderita)
let clasificacionAlternativa = sessionStorage.getItem('clasificacionAlternativa') === 'true';

// Nombre de un nivel para mostrar, según el sistema de clasificación vigente.
// Recibe el nombre original de la API ('Adult'); si no tiene nivel, es 'Desconocido' y se traduce según el idioma.
function nombreNivel(nivelApi) {
    if (nivelApi === 'Desconocido') {
        return t('nivel.Desconocido');
    }
    return (clasificacionAlternativa ? nivelesAlternativos[nivelApi] || nivelApi : nivelApi).trim();
}

// -----------------------------------------------------------------------------------------------------------------
// SISTEMA DE COMBATE: la probabilidad de ganar combina TIPO + NIVEL + ELEMENTO
//
//   probabilidad = 50% + (ventaja de tipo × 20%) + (diferencia de nivel × 15%) + (ventaja de elemento × 10%)
//
// Con esto, una doble ventaja (tipo + elemento = +30%) compensa justo 2 niveles de diferencia (2 × 15%).
// -----------------------------------------------------------------------------------------------------------------

// Cuánto pesa cada factor
const PESO_TIPO = 0.20;
const PESO_NIVEL = 0.15;
const PESO_ELEMENTO = 0.10;

// Fuerza de cada nivel, usando el nombre original de la API (así no importa qué sistema de clasificación se muestre).
// Armor tiene el poder de un Adult (5). Hybrid queda en un punto medio (6): según la forma van de Adult a Ultimate.
const numeracionNiveles = {
    'Baby I': 1,
    'Baby II': 3,
    'Child': 4,
    'Adult': 5,
    'Armor': 5,
    'Perfect': 6,
    'Hybrid': 6,
    'Ultimate': 7,
};

// Orden en que se muestran los niveles en los menús y en los filtros (el último, 'Desconocido', es el que no tiene nivel)
const ORDEN_NIVELES = ['Baby I', 'Baby II', 'Child', 'Adult', 'Armor', 'Perfect', 'Hybrid', 'Ultimate', 'Desconocido'];

// Triángulo de tipos: cada tipo es fuerte contra el que tiene en su lista
const TIPO_FUERTE_CONTRA = {
    'Vacuna': ['Virus'],
    'Virus': ['Datos'],
    'Datos': ['Vacuna'],
};

// Elementos: cada elemento es fuerte contra los que tiene en su lista.
// Si dos elementos se tienen ventaja mutuamente (Luz y Oscuridad), se cancelan.
// Tipo Libre, Variable, Desconocido y elemento Neutro no dan ni quitan nada.
const ELEMENTO_FUERTE_CONTRA = {
    'Agua': ['Fuego', 'Tierra'],
    'Fuego': ['Planta', 'Hielo', 'Oscuridad'],
    'Hielo': ['Planta', 'Viento', 'Agua'],
    'Luz': ['Oscuridad', 'Veneno'],
    'Metal': ['Hielo', 'Luz'],
    'Oscuridad': ['Luz', 'Metal'],
    'Planta': ['Agua', 'Tierra'],
    'Rayo': ['Agua'],
    'Tierra': ['Rayo', 'Fuego', 'Veneno'],
    'Veneno': ['Agua'],
    'Viento': ['Tierra'],
};

// La API no trae el elemento, así que lo deducimos buscando palabras clave en las habilidades del Digimon.
// El elemento con más coincidencias gana; si hay empate o ninguna coincidencia, es Neutro.
const REGLAS_ELEMENTO = {
    'Fuego': /\b(fire|flame|flames|flaming|blaze|blazing|burn|burning|inferno|heat|lava|magma|scorch|ember)\b/g,
    'Agua': /\b(water|aqua|bubble|bubbles|wave|ocean|torrent|tide|splash|hydro|rain|sea)\b/g,
    'Planta': /\b(plant|leaf|leaves|vine|vines|thorn|thorns|flower|petal|petals|seed|seeds|tree|forest|pollen|rose|spore|spores)\b/g,
    'Hielo': /\b(ice|icy|frost|freeze|freezing|frozen|snow|blizzard|cold|glacier)\b/g,
    'Rayo': /\b(thunder|lightning|electric|electricity|bolt|shock|spark|volt|plasma)\b/g,
    'Viento': /\b(wind|tornado|gale|cyclone|hurricane|storm|tempest|whirlwind|air|breeze)\b/g,
    'Tierra': /\b(earth|rock|rocks|stone|sand|quake|earthquake|ground|mud|boulder)\b/g,
    'Luz': /\b(light|holy|sacred|heaven|heavenly|divine|shining|radiant|sun|solar)\b/g,
    'Oscuridad': /\b(dark|darkness|shadow|shadows|evil|nightmare|death|hell|abyss|curse|cursed)\b/g,
    'Metal': /\b(metal|steel|iron|chrome|gatling|missile|cannon|laser)\b/g,
    'Veneno': /\b(poison|toxic|venom|acid)\b/g,
};

// Correcciones a mano (id del Digimon → elemento) para los casos en que la deducción automática no acierta
const ELEMENTOS_MANUALES = {
    4: 'Rayo', // Betamon: sus habilidades empatan entre Rayo y Agua, pero es eléctrico
};

// Emoji de cada elemento para mostrar en la carta
const EMOJIS_ELEMENTO = {
    'Fuego': '🔥',
    'Agua': '💧',
    'Planta': '🌿',
    'Hielo': '❄️',
    'Rayo': '⚡',
    'Viento': '🌪️',
    'Tierra': '🪨',
    'Luz': '✨',
    'Oscuridad': '🌑',
    'Metal': '⚙️',
    'Veneno': '☠️',
    'Neutro': '⚪',
};

// Orden en que se muestran los elementos en los menús y en los filtros
const ORDEN_ELEMENTOS = Object.keys(EMOJIS_ELEMENTO);

// Deduce el elemento de un Digimon a partir de los detalles que devuelve la API
function deducirElemento(id, detalles) {
    if (ELEMENTOS_MANUALES[id]) {
        return ELEMENTOS_MANUALES[id];
    }

    // Juntamos el nombre, la traducción y la descripción de todas sus habilidades
    const texto = (detalles.skills || [])
        .map(habilidad => [habilidad.skill, habilidad.translation, habilidad.description].filter(Boolean).join(' '))
        .join(' ')
        .toLowerCase();

    let elementoGanador = 'Neutro';
    let maximo = 0;
    let empate = false;

    for (const [elemento, regla] of Object.entries(REGLAS_ELEMENTO)) {
        const coincidencias = (texto.match(regla) || []).length;
        if (coincidencias > maximo) {
            elementoGanador = elemento;
            maximo = coincidencias;
            empate = false;
        } else if (coincidencias === maximo && coincidencias > 0) {
            empate = true;
        }
    }

    return empate ? 'Neutro' : elementoGanador;
}

// Devuelve +1 si "a" tiene ventaja sobre "b", -1 si "b" tiene ventaja sobre "a", y 0 si están parejos
function calcularVentaja(tabla, a, b) {
    const aVenceAb = tabla[a]?.includes(b) ? 1 : 0;
    const bVenceAa = tabla[b]?.includes(a) ? 1 : 0;
    return aVenceAb - bVenceAa;
}

// Función para obtener los Digimons de una página
async function obtenerPagina(numeroPagina) {
    try {
        const respuesta = await fetch(`${urlBase}?page=${numeroPagina}`);
        const datos = await respuesta.json();
        return datos.content;
    } catch (error) {
        console.error('Error al obtener los Digimons de la página:', numeroPagina, error);
    }
}

// Función para obtener los detalles de un Digimon específico
async function obtenerDetallesDigimon(url) {
    try {
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        return datos;
    } catch (error) {
        console.error('Error al obtener detalles del Digimon:', error);
        return null;
    }
}

// Función para obtener los Digimons de todas las páginas
async function crearArrayDeDatos() {
    try {
        // Generar array de promesas para todas las páginas
        const promesasPaginas = [];
        for (let i = 0; i < totalPaginas; i++) {
            promesasPaginas.push(obtenerPagina(i));
        }

        // Esperar a que se resuelvan todas las promesas
        const paginas = await Promise.all(promesasPaginas);
        console.log("Páginas 👇")
        console.info(paginas)

        // Combinar todos los sub-arrays de cada página en un solo array
        const digimons = paginas.flat();
        console.log("Digimons 👇")
        console.info(digimons)
        console.log("----------------------------------------------------------------------")

        return digimons; // Devolvemos el array aplanado de Digimons
    } catch (error) {
        console.error('Error al obtener todos los Digimons:', error);
        return [];
    }
}

// Función para actualizar la barra de progreso
function actualizarBarraProgreso(contador) {
    barraProgreso.value = contador;
    barraProgreso.max = totalDigimons;
    // En celular la carga es una línea finita en la barra: cuando se completa, se apaga
    document.getElementById('navbar').classList.toggle('carga-completa', totalDigimons > 0 && contador >= totalDigimons);
}

// Selector de niveles: resalta el sistema vigente (Japón o EE.UU.) y escribe su ayuda (título y aria-label) en el idioma actual.
// El sistema vigente se recuperó de sessionStorage más arriba.
function mostrarSistemaDeNiveles() {
    const sistema = clasificacionAlternativa ? 'eeuu' : 'japon';
    botonCambiarNiveles.querySelectorAll('.sn-opcion').forEach(opcion => {
        opcion.classList.toggle('activo', opcion.dataset.sistema === sistema);
    });
    const ayuda = t(`niveles.ayuda.${sistema}`);
    botonCambiarNiveles.title = ayuda;
    botonCambiarNiveles.setAttribute('aria-label', ayuda);
}

document.addEventListener('DOMContentLoaded', () => {
    mostrarSistemaDeNiveles();
    // Llamar a la función para cargar los Digimons después de inicializar la configuración
    crearListaDeDigimons();
});

// Si se cambia el idioma, la ayuda del selector se vuelve a escribir en el idioma nuevo
document.addEventListener('idioma-cambiado', mostrarSistemaDeNiveles);

let contadorDigimons = 0; // Contador de Digimons cargados

// Array para almacenar los elementos seleccionados
const seleccionados = [];

// Función para manejar el boton de combate
function verificarSeleccion() {
    contadorSeleccion.textContent = `${seleccionados.length}/2`;
    contadorSeleccion.classList.toggle('completo', seleccionados.length === 2);
    if (seleccionados.length === 2) {
        botonIniciarCombate.classList.add("animate__animated", "animate__pulse");
        botonIniciarCombate.disabled = false;
    } else {
        botonIniciarCombate.classList.remove("animate__animated", "animate__pulse");
        botonIniciarCombate.disabled = true;
    }
    // El color del botón (verde si se puede pelear, gris si no) lo pone el CSS según :disabled
}

// -----------------------------------------------------------------------------------------------------------------
// DISEÑO DE LAS CARTAS: nombre ajustado al largo, dorso con la descripción, giro 3D, inclinación con reflejo y sonidos
// -----------------------------------------------------------------------------------------------------------------

// Si la persona pidió menos animaciones en su sistema, no giramos ni inclinamos las cartas
const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Nombre en la carta: lo que va entre paréntesis pasa a una segunda línea, más chica.
// El texto completo del <h4> no cambia (el combate lo lee con textContent).
function ponerNombre(elemento, nombre) {
    const posicion = nombre.indexOf('(');
    if (posicion <= 0) {
        elemento.textContent = nombre;
        return;
    }
    const aparte = document.createElement('span');
    aparte.className = 'c-aparte';
    aparte.textContent = nombre.slice(posicion);
    elemento.append(nombre.slice(0, posicion), aparte);
}

// Tamaño del nombre según su largo: los cortos se agrandan hasta llenar la placa y los largos quedan chicos
// (en dos líneas si no entran). Se mide con un canvas, usando la misma tipografía que el CSS.
const MAX_CRECIMIENTO = 1.5;        // un nombre corto puede crecer hasta 1,5 veces el tamaño base
const MAX_CRECIMIENTO_PAREN = 1.25; // si tiene paréntesis, la línea de arriba crece menos para que entren las dos líneas
const MIN_TAMANO_PAREN = 7.5;       // tamaño mínimo (en px) de la línea del paréntesis

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
function ajustarNombre(carta) {
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
        const k = anchoNombre < ancho ? Math.max(1, Math.min(MAX_CRECIMIENTO, ancho * 0.92 / anchoNombre)) : 1;
        carta.style.setProperty('--k', k.toFixed(3));
        return;
    }

    // Con paréntesis: arriba el nombre y abajo el paréntesis, más chico (los dos tienen que entrar en la placa)
    const principal = titulo.firstChild.textContent.trim();
    let tamanoPrincipal = base * Math.max(0.75, Math.min(MAX_CRECIMIENTO_PAREN, ancho * 0.94 / medir(principal)));
    const anchoPorPx = medir(aparte.textContent.trim()) / base;
    let tamanoAparte = Math.max(MIN_TAMANO_PAREN, Math.min(tamanoPrincipal * 0.8, ancho * 0.94 / anchoPorPx));
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
function esperarTipografias() {
    const cargas = ['800 12px "Orbitron"', '700 12px "Pixelify Sans"', '500 12px "Exo 2"', '12px "DotGothic16"']
        .map(fuente => document.fonts.load(fuente).catch(() => null));
    return Promise.race([Promise.all(cargas), new Promise(resolve => setTimeout(resolve, 3000))]);
}

// Dorso de la carta: se arma la primera vez que se gira, con los datos que ya trajimos de la API
function construirDorso(carta) {
    const datos = carta.datosDorso;
    const dorso = document.createElement('div');
    dorso.className = 'c-dorso';
    dorso.innerHTML = '<div class="c-cab"><div class="c-nombre"></div></div><div class="c-cuerpo"></div>';
    ponerNombre(dorso.querySelector('.c-nombre'), carta.querySelector('h4').textContent);

    const cuerpo = dorso.querySelector('.c-cuerpo');
    for (const [etiqueta, valor] of [['carta.especie', datos.especie], ['carta.estreno', datos.estreno], ['carta.ataques', datos.ataques]]) {
        const linea = document.createElement('p');
        linea.className = 'dato';
        const negrita = document.createElement('b');
        negrita.textContent = `${t(etiqueta)}:`;
        linea.append(negrita, ` ${valor}`);
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

    // Botón "🧬 Evolución" (evolucion.js): abre el árbol con de quién viene y a qué evoluciona
    dorso.append(crearBotonEvolucion(carta));

    return dorso;
}

// Escribe en el idioma actual los textos de una carta: "NV", el nivel, el tipo, el elemento y el botón de dar vuelta.
// Si el dorso ya se había armado, se rehace para que también quede traducido.
function traducirCarta(carta) {
    const { tipo, elemento, nivelApi } = carta.dataset;

    carta.querySelector('.c-gema small').textContent = t('carta.nv');
    carta.querySelector('.c-nivel').textContent = nombreNivel(nivelApi);
    carta.querySelector('.c-tipo').textContent = `${nombreTipo(tipo)} ${EMOJIS_TIPO[tipo]}`;
    carta.querySelector('.c-elem').textContent = `${nombreElemento(elemento)} ${EMOJIS_ELEMENTO[elemento]}`;

    const botonVoltear = carta.querySelector('.c-flip');
    botonVoltear.title = t('carta.voltear');
    botonVoltear.setAttribute('aria-label', t('carta.voltear'));

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
const PERSPECTIVA = 'perspective(800px) ';

async function voltearCarta(carta) {
    if (carta.girando) return;
    carta.girando = true;

    const frente = carta.querySelector('.c-frente');
    let dorso = carta.querySelector('.c-dorso');
    const estabaDeFrente = !carta.classList.contains('de-dorso');

    if (estabaDeFrente) {
        if (!dorso) {
            dorso = construirDorso(carta);
            carta.appendChild(dorso);
        }
        dorso.style.height = `${frente.offsetHeight}px`; // el dorso mide lo mismo que el frente
    }

    sonidoVuelta();

    if (reducirMovimiento) {
        carta.classList.toggle('de-dorso');
        carta.girando = false;
        return;
    }

    const primeraMitad = carta.animate(
        [{ transform: `${PERSPECTIVA}rotateY(0deg)`, scale: 1 }, { transform: `${PERSPECTIVA}rotateY(90deg)`, scale: 1.06 }],
        { duration: 230, easing: 'ease-in', fill: 'forwards' }
    );
    await primeraMitad.finished;

    carta.classList.toggle('de-dorso'); // de canto no se ve: cambiamos de cara
    const segundaMitad = carta.animate(
        [{ transform: `${PERSPECTIVA}rotateY(-90deg)`, scale: 1.06 }, { transform: `${PERSPECTIVA}rotateY(0deg)`, scale: 1 }],
        { duration: 230, easing: 'ease-out' }
    );
    primeraMitad.cancel();
    await segundaMitad.finished;

    carta.girando = false;
}

// Inclinación 3D: la carta se inclina hacia donde apunta el mouse (más en el frente que en el dorso, para poder leer)
// y el reflejo sigue al puntero (--mx y --my). Sin "reducir movimiento".
// Con el dedo: se mantiene apretada la carta un instante y, sin soltar, al mover el dedo se inclina (mientras tanto la
// página no se desplaza). Un toque corto sigue siendo un toque normal (elegir la carta para el combate).
function activarInclinacion() {
    const conMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const conDedo = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    if (reducirMovimiento || (!conMouse && !conDedo)) return;

    listaDigimons.classList.add('tilt-on');

    const INCLINACION_FRENTE = 10; // grados máximos
    const INCLINACION_DORSO = 3;
    let cartaActual = null;
    let caja = null;      // posición y tamaño de la carta cuando empezó a seguir al puntero
    let cuadro = 0;       // pedido de animationFrame pendiente
    let x = 0;
    let y = 0;            // posición del puntero dentro de la carta, de -1 a 1

    function aplicar() {
        cuadro = 0;
        if (!cartaActual || cartaActual.girando) return;
        const maximo = cartaActual.classList.contains('de-dorso') ? INCLINACION_DORSO : INCLINACION_FRENTE;
        cartaActual.style.transform = `${PERSPECTIVA}rotateX(${(-y * maximo).toFixed(2)}deg) rotateY(${(x * maximo).toFixed(2)}deg)`;
        cartaActual.style.setProperty('--mx', `${((x + 1) * 50).toFixed(1)}%`);
        cartaActual.style.setProperty('--my', `${((y + 1) * 50).toFixed(1)}%`);
    }

    function soltar(carta) {
        if (!carta) return;
        cancelAnimationFrame(cuadro);
        cuadro = 0;
        carta.classList.remove('tilt-activo');
        carta.style.transform = '';
        if (carta === cartaActual) {
            cartaActual = null;
            caja = null;
        }
    }

    // La carta empieza a seguir al puntero. Se usa la caja visible (getBoundingClientRect), que ya tiene en cuenta
    // el achicado de las cartas en celular
    function tomar(carta) {
        soltar(cartaActual);
        cartaActual = carta;
        const rect = carta.getBoundingClientRect();
        caja = { x: rect.left + scrollX, y: rect.top + scrollY, ancho: rect.width, alto: rect.height };
        carta.classList.add('tilt-activo');
    }

    function seguir(clienteX, clienteY) {
        const limitar = valor => Math.max(-1, Math.min(1, valor));
        x = limitar(((clienteX + scrollX) - caja.x) / caja.ancho * 2 - 1);
        y = limitar(((clienteY + scrollY) - caja.y) / caja.alto * 2 - 1);
        if (!cuadro) cuadro = requestAnimationFrame(aplicar);
    }

    if (conMouse) {
        listaDigimons.addEventListener('pointermove', (evento) => {
            if (evento.pointerType === 'touch') return;
            const carta = evento.target.closest('#listado-digimons > li');
            if (!carta) {
                soltar(cartaActual);
                return;
            }
            if (carta !== cartaActual) tomar(carta);
            seguir(evento.clientX, evento.clientY);
        });

        listaDigimons.addEventListener('pointerleave', (evento) => {
            if (evento.pointerType !== 'touch') soltar(cartaActual);
        });
    }

    if (conDedo) activarInclinacionConDedo({ tomar, seguir, soltar: () => soltar(cartaActual) });

    // Al tocar el botón de dar vuelta, la carta se endereza para poder girar
    listaDigimons.addEventListener('click', (evento) => {
        if (evento.target.closest('.c-flip')) soltar(cartaActual);
    }, true);
}

const ESPERA_DEDO = 220;     // ms que hay que mantener apretada la carta para que empiece a inclinarse
const TOLERANCIA_DEDO = 10;  // px que se puede mover el dedo antes de eso (si se mueve más, es que quiere desplazar la página)

function activarInclinacionConDedo({ tomar, seguir, soltar }) {
    let espera = 0;          // temporizador de "mantener apretado"
    let inicio = null;       // dónde y en qué carta apoyó el dedo
    let inclinando = false;
    let evitarClic = false;  // al soltar después de inclinar no se elige la carta

    function cancelar() {
        clearTimeout(espera);
        inicio = null;
        if (inclinando) {
            inclinando = false;
            soltar();
        }
    }

    listaDigimons.addEventListener('touchstart', (evento) => {
        if (evento.touches.length !== 1) {
            cancelar();
            return;
        }
        const carta = evento.target.closest('#listado-digimons > li');
        if (!carta || carta.girando || evento.target.closest('button')) return;
        const toque = evento.touches[0];
        inicio = { x: toque.clientX, y: toque.clientY };
        clearTimeout(espera);
        espera = setTimeout(() => {
            if (!inicio || carta.girando) return;
            inclinando = true;
            tomar(carta);
            seguir(inicio.x, inicio.y);
            vibrar(10);
        }, ESPERA_DEDO);
    }, { passive: true });

    // No es pasivo porque, mientras se inclina la carta, hay que frenar el desplazamiento de la página
    listaDigimons.addEventListener('touchmove', (evento) => {
        const toque = evento.touches[0];
        if (inclinando) {
            if (evento.cancelable) evento.preventDefault();
            seguir(toque.clientX, toque.clientY);
        } else if (inicio && Math.hypot(toque.clientX - inicio.x, toque.clientY - inicio.y) > TOLERANCIA_DEDO) {
            cancelar(); // está desplazando la página
        }
    }, { passive: false });

    const terminar = () => {
        const estabaInclinando = inclinando;
        cancelar();
        if (estabaInclinando) {
            evitarClic = true;
            setTimeout(() => { evitarClic = false; }, 450);
        }
    };
    listaDigimons.addEventListener('touchend', terminar);
    listaDigimons.addEventListener('touchcancel', terminar);

    listaDigimons.addEventListener('click', (evento) => {
        if (!evitarClic) return;
        evitarClic = false;
        evento.stopPropagation();
        evento.preventDefault();
    }, true);

    // Mantener apretada una carta no abre el menú del sistema (guardar imagen, copiar...)
    listaDigimons.addEventListener('contextmenu', (evento) => {
        if (evento.target.closest('#listado-digimons > li')) evento.preventDefault();
    });
}

// Vibración corta al tocar botones con el dedo, como una tecla física. Solo en los celulares que la permiten
// (Android; en iPhone el navegador no deja vibrar). El navegador solo la permite después del primer toque en la página.
function vibrar(duracion = 8) {
    if (!navigator.vibrate) return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try {
        navigator.vibrate(duracion);
    } catch (error) {
        // Si no se puede vibrar, no pasa nada
    }
}

function activarVibracion() {
    if (!navigator.vibrate) return;
    document.addEventListener('pointerdown', (evento) => {
        if (evento.pointerType !== 'touch') return;
        const boton = evento.target.closest('button');
        if (boton && !boton.disabled) vibrar(8);
    });
}

// -----------------------------------------------------------------------------------------------------------------
// SONIDOS SINTETIZADOS (Web Audio): no hace falta ningún archivo de audio
// -----------------------------------------------------------------------------------------------------------------
let contextoAudio;

function obtenerContextoAudio() {
    contextoAudio = contextoAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (contextoAudio.state === 'suspended') {
        contextoAudio.resume();
    }
    return contextoAudio;
}

// ---- Tecla de teclado mecánico ------------------------------------------------------------------------------------
// Una tecla real suena a tres cosas juntas: un "clic" agudo (el mecanismo), un golpe seco (la tecla llegando al fondo)
// y un "thock" grave que resuena en la carcasa. Al soltar hay otro clic, más suave y más agudo.
const ruidosPorContexto = new WeakMap();

// Un poco de ruido blanco (se reutiliza en cada pulsación)
function obtenerRuido(contexto) {
    if (!ruidosPorContexto.has(contexto)) {
        const largo = Math.floor(contexto.sampleRate * 0.15);
        const buffer = contexto.createBuffer(1, largo, contexto.sampleRate);
        const datos = buffer.getChannelData(0);
        for (let i = 0; i < largo; i++) {
            datos[i] = Math.random() * 2 - 1;
        }
        ruidosPorContexto.set(contexto, buffer);
    }
    return ruidosPorContexto.get(contexto);
}

// Volumen de las teclas: VOLUMEN_TECLAS (0 a 1) es el tope de sonido. GANANCIA_TECLAS empuja el sonido contra ese tope
// (más ganancia = suena más "lleno" y más fuerte, pero también más comprimido).
const VOLUMEN_TECLAS = 0.52; // era 0.8: se bajó un poco el volumen de los botones
const GANANCIA_TECLAS = 1.3;
let salidaTeclas;

// Salida común de las teclas. Cadena: compresor (suaviza los golpes fuertes) -> ganancia -> saturador suave (tanh) -> volumen.
// El saturador redondea los picos en vez de cortarlos, así se puede subir el volumen sin que suene rota.
function crearSalidaTeclas(contexto) {
    const compresor = contexto.createDynamicsCompressor();
    compresor.threshold.value = -18;
    compresor.knee.value = 10;
    compresor.ratio.value = 8;
    compresor.attack.value = 0.001;
    compresor.release.value = 0.08;

    const ganancia = contexto.createGain();
    ganancia.gain.value = GANANCIA_TECLAS;

    const saturador = contexto.createWaveShaper();
    const curva = new Float32Array(1024);
    for (let i = 0; i < curva.length; i++) {
        const x = (i / (curva.length - 1)) * 2 - 1;
        curva[i] = Math.tanh(2 * x) / Math.tanh(2);
    }
    saturador.curve = curva;
    saturador.oversample = '2x';

    const volumen = contexto.createGain();
    volumen.gain.value = VOLUMEN_TECLAS;

    compresor.connect(ganancia);
    ganancia.connect(saturador);
    saturador.connect(volumen);
    volumen.connect(contexto.destination);
    return compresor;
}

// Arma una pulsación (bajada = true) o el soltar la tecla (bajada = false) en el instante t
function armarTecla(contexto, destino, t, bajada) {
    const fuerza = bajada ? 1 : 0.45;
    // Cada pulsación suena apenas distinta, como pasa con una tecla de verdad
    const afinacion = 0.94 + Math.random() * 0.12;

    // Ráfaga corta de ruido filtrado: es el "clic"
    const chasquido = (retraso, frecuencia, q, pico, duracion) => {
        const inicio = t + retraso;
        const fuente = contexto.createBufferSource();
        fuente.buffer = obtenerRuido(contexto);
        const filtro = contexto.createBiquadFilter();
        filtro.type = 'bandpass';
        filtro.frequency.value = frecuencia * afinacion;
        filtro.Q.value = q;
        const volumen = contexto.createGain();
        volumen.gain.setValueAtTime(0.0001, inicio);
        volumen.gain.exponentialRampToValueAtTime(pico * fuerza, inicio + 0.001);
        volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
        fuente.connect(filtro);
        filtro.connect(volumen);
        volumen.connect(destino);
        fuente.start(inicio, Math.random() * 0.05);
        fuente.stop(inicio + duracion + 0.01);
    };

    // Tono que cae rápido: es el golpe y el "thock" grave
    const golpe = (retraso, tipo, desde, hasta, pico, duracion) => {
        const inicio = t + retraso;
        const oscilador = contexto.createOscillator();
        oscilador.type = tipo;
        oscilador.frequency.setValueAtTime(desde * afinacion, inicio);
        oscilador.frequency.exponentialRampToValueAtTime(hasta * afinacion, inicio + duracion * 0.6);
        const volumen = contexto.createGain();
        volumen.gain.setValueAtTime(0.0001, inicio);
        volumen.gain.exponentialRampToValueAtTime(pico * fuerza, inicio + 0.002);
        volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
        oscilador.connect(volumen);
        volumen.connect(destino);
        oscilador.start(inicio);
        oscilador.stop(inicio + duracion + 0.01);
    };

    if (bajada) {
        chasquido(0, 3000, 1.1, 5.4, 0.03);              // clic agudo del mecanismo
        chasquido(0.004, 1300, 0.8, 3.6, 0.055);         // la tecla llega al fondo
        golpe(0.002, 'triangle', 380, 170, 0.17, 0.12);  // "thock" de la carcasa
        golpe(0, 'sine', 2400, 2100, 0.085, 0.02);       // toque de plástico
    } else {
        chasquido(0, 4400, 1.5, 5.4, 0.025);             // clic suave y agudo del resorte al volver
        golpe(0, 'triangle', 420, 240, 0.3, 0.05);
    }
}

// Suena la tecla apretada (bajada = true) o soltada (bajada = false)
function sonidoTecla(bajada = true) {
    try {
        const contexto = obtenerContextoAudio();
        salidaTeclas = salidaTeclas || crearSalidaTeclas(contexto);
        armarTecla(contexto, salidaTeclas, contexto.currentTime, bajada);
    } catch (error) {
        // Si el navegador no permite audio, simplemente no suena
    }
}

// Carta que se da vuelta: un "fshh" de papel cortando el aire mientras gira y un "tac" suave al apoyarse
function sonidoVuelta() {
    try {
        const contexto = obtenerContextoAudio();
        const t = contexto.currentTime;

        // Ruido blanco filtrado: el filtro sube de tono durante la primera mitad del giro y baja en la segunda
        const largo = Math.floor(contexto.sampleRate * 0.6);
        const buffer = contexto.createBuffer(1, largo, contexto.sampleRate);
        const datos = buffer.getChannelData(0);
        for (let i = 0; i < largo; i++) {
            datos[i] = Math.random() * 2 - 1;
        }
        const ruido = contexto.createBufferSource();
        ruido.buffer = buffer;

        const banda = contexto.createBiquadFilter();
        banda.type = 'bandpass';
        banda.Q.value = 0.9;
        banda.frequency.setValueAtTime(700, t);
        banda.frequency.exponentialRampToValueAtTime(3200, t + 0.23);
        banda.frequency.exponentialRampToValueAtTime(900, t + 0.46);

        const agudos = contexto.createBiquadFilter();
        agudos.type = 'highpass';
        agudos.frequency.value = 400;

        const volumenRuido = contexto.createGain();
        volumenRuido.gain.setValueAtTime(0.0001, t);
        volumenRuido.gain.exponentialRampToValueAtTime(0.28, t + 0.11);
        volumenRuido.gain.exponentialRampToValueAtTime(0.06, t + 0.24);
        volumenRuido.gain.exponentialRampToValueAtTime(0.16, t + 0.34);
        volumenRuido.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

        ruido.connect(banda);
        banda.connect(agudos);
        agudos.connect(volumenRuido);
        volumenRuido.connect(contexto.destination);
        ruido.start(t);
        ruido.stop(t + 0.55);

        // "Tac" grave y breve cuando la carta termina de girar
        const golpe = contexto.createOscillator();
        const volumenGolpe = contexto.createGain();
        golpe.type = 'sine';
        golpe.frequency.setValueAtTime(240, t + 0.46);
        golpe.frequency.exponentialRampToValueAtTime(110, t + 0.53);
        volumenGolpe.gain.setValueAtTime(0.0001, t + 0.46);
        volumenGolpe.gain.exponentialRampToValueAtTime(0.14, t + 0.463);
        volumenGolpe.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        golpe.connect(volumenGolpe);
        volumenGolpe.connect(contexto.destination);
        golpe.start(t + 0.46);
        golpe.stop(t + 0.56);
    } catch (error) {
        // Si el navegador no permite audio, simplemente no suena
    }
}

// Sonido de tecla al tocar los botones de la barra de arriba, los menús de información y los filtros.
// Suena al apretar (se siente inmediato y no lo corta el reload del botón de niveles) y, si se llegó a apretar, también al soltar.
// El teclado dispara solo 'click': ahí suenan las dos cosas seguidas.
const ZONAS_CON_SONIDO = '#navbar, #filtros, #f-vacio';

function activarSonidoBotones() {
    let apretado = false;
    const sonar = (evento) => {
        const boton = evento.target.closest('button');
        return Boolean(boton && boton.closest(ZONAS_CON_SONIDO) && !boton.disabled);
    };
    document.addEventListener('pointerdown', (evento) => {
        if (evento.pointerType === 'mouse' && evento.button !== 0) return; // solo el botón izquierdo
        if (sonar(evento)) {
            apretado = true;
            sonidoTecla(true);
        }
    });
    // Se escucha en toda la página: se puede soltar el mouse fuera del botón
    document.addEventListener('pointerup', () => {
        if (apretado) {
            apretado = false;
            sonidoTecla(false);
        }
    });
    document.addEventListener('pointercancel', () => {
        apretado = false;
    });
    document.addEventListener('click', (evento) => {
        if (evento.detail === 0 && sonar(evento)) { // clic hecho con el teclado (Enter o Espacio)
            sonidoTecla(true);
            setTimeout(() => sonidoTecla(false), 80);
        }
    });
}

activarInclinacion();
activarSonidoBotones();
activarVibracion();

// Función para crear la lista de Digimons
async function crearListaDeDigimons() {
    try {
        // Obtenemos el array de Digimons
        const digimons = await crearArrayDeDatos();

        // Las cartas miden sus nombres con las tipografías nuevas: esperamos a que carguen
        await esperarTipografias();

        // Recorremos toda la lista de Digimons
        for (const digimon of digimons) {
            // Obtenemos los detalles de cada Digimon
            const detalles = await obtenerDetallesDigimon(digimon.href);

            // Extraemos el tipo (atributo) o, sino tiene, le ponemos "Desconocido"
            const tipo = tipoDeLaApi[detalles.attributes[0]?.attribute] || 'Desconocido';

            // Extraemos el nivel original de la API (sin traducir) o, sino tiene, le ponemos "Desconocido".
            // Un nivel "Unknown" de la API también es desconocido.
            const nivelApi = detalles.levels[0]?.level;
            const nivelOriginal = nivelApi && nivelApi !== 'Unknown' ? nivelApi : 'Desconocido';

            // Datos que usa el combate y el diseño de la carta
            const nivelNumerico = numeracionNiveles[nivelOriginal]; // undefined si el nivel es desconocido
            const elemento = deducirElemento(digimon.id, detalles);

            // ---Creación de la lista con el DOM---
            const elementoLista = document.createElement('li');

            // Guardamos los datos en la propia carta (data-tipo, data-nivel y data-elemento).
            // El tipo y el elemento van en español porque el combate y los filtros los usan como identificadores;
            // data-nivel-api es el nivel tal cual lo trae la API (no depende del idioma ni del sistema de clasificación).
            elementoLista.dataset.id = digimon.id;
            elementoLista.dataset.tipo = tipo;
            elementoLista.dataset.elemento = elemento;
            elementoLista.dataset.nivelApi = nivelOriginal;
            if (nivelNumerico !== undefined) {
                elementoLista.dataset.nivel = nivelNumerico;
                elementoLista.style.setProperty('--nivel', nivelNumerico); // el CSS lo usa para la intensidad del color
            }

            // Creamos la "carta" del digimon. Los textos que cambian con el idioma (nivel, tipo, elemento, "NV"...) los pone
            // traducirCarta(); el nombre lo pone ponerNombre para separar lo que va entre paréntesis.
            elementoLista.innerHTML = `
                <div class="c-frente">
                    <div class="c-cab"><h4></h4></div>
                    <div class="c-arte">
                        <img src="${digimon.image}" alt="${digimon.name}">
                        <span class="c-gema"><small></small>${nivelNumerico ?? '?'}</span>
                    </div>
                    <div class="c-sub"><span class="c-nivel"></span><span>#${String(digimon.id).padStart(3, '0')}</span></div>
                    <div class="c-chips">
                        <span class="chip c-tipo"></span>
                        <span class="chip c-elem"></span>
                    </div>
                </div>
                <button class="c-flip" type="button">↻</button>`;
            ponerNombre(elementoLista.querySelector('h4'), digimon.name);
            traducirCarta(elementoLista);

            // Datos para el dorso de la carta (ya los tenemos, no hace falta volver a pedirlos a la API)
            elementoLista.datosDorso = {
                especie: (detalles.types || []).map(especie => especie.type).join(', ') || '–',
                estreno: detalles.releaseDate || '–',
                ataques: (detalles.skills || []).slice(0, 4).map(habilidad => habilidad.skill).join(' - ') || '–',
                descripcion: (detalles.descriptions || []).find(texto => texto.language === 'en_us')?.description || '',
            };

            // El botón de dar vuelta la carta no la selecciona para el combate
            elementoLista.querySelector('.c-flip').addEventListener('click', (evento) => {
                evento.stopPropagation();
                voltearCarta(elementoLista);
            });

            // Agregamos el manejador de eventos al <li>
            elementoLista.addEventListener('click', () => {
                elementoLista.classList.toggle('seleccionado');

                if (elementoLista.classList.contains('seleccionado')) {
                    if (seleccionados.length < 2) {
                        seleccionados.push(elementoLista);
                    } else {
                        const elementoAntiguo = seleccionados.shift();
                        elementoAntiguo.classList.toggle('seleccionado');
                        seleccionados.push(elementoLista);
                    }
                } else {
                    const index = seleccionados.indexOf(elementoLista);
                    if (index > -1) {
                        seleccionados.splice(index, 1);
                    }
                }
                // Llamar a la función para verificar y actualizar el botón
                verificarSeleccion();
            });

            // Agregamos el <li> a la lista de Digimons (<ul>)
            listaDigimons.appendChild(elementoLista);
            ajustarNombre(elementoLista); // ya está en la página: ahora se puede medir su nombre

            // Avisamos que hay una carta nueva (los filtros la cuentan y, si corresponde, la esconden)
            document.dispatchEvent(new CustomEvent('carta-agregada', { detail: { carta: elementoLista } }));

            // Actualizamos el contador y la barra de progreso
            contadorDigimons++;
            actualizarBarraProgreso(contadorDigimons);

            // -----------------------------------------------------------------


        }

        // Ya están todas las cartas (y sus nombres medidos): en celular, el navegador puede dejar de dibujar las que no se ven
        listaDigimons.classList.add('lista-completa');
    } catch (error) {
        console.error('Error al crear la lista de Digimons:', error);
    }
}

// Cambiar de sistema de niveles NO recarga la página: se escribe de nuevo el nombre de cada nivel donde aparece.
// Las cartas lo hacen acá; los filtros (filtros.js), los menús (info.js) y la línea evolutiva (evolucion.js) escuchan el mismo aviso.
botonCambiarNiveles.addEventListener('click', () => {
    clasificacionAlternativa = !clasificacionAlternativa;
    try {
        sessionStorage.setItem('clasificacionAlternativa', String(clasificacionAlternativa));
    } catch (error) {
        // si no se puede guardar, igual cambia mientras la página esté abierta
    }
    mostrarSistemaDeNiveles();
    document.dispatchEvent(new CustomEvent('niveles-cambiados'));
});

document.addEventListener('niveles-cambiados', () => {
    listaDigimons.querySelectorAll(':scope > li').forEach(carta => {
        carta.querySelector('.c-nivel').textContent = nombreNivel(carta.dataset.nivelApi);
    });
});

// -----------------------------------------------------------------------------------------------------------------

// Función para iniciar el combate
async function iniciarCombate() {

    console.log("--- Variables de los digimons seleccionados para el combate 👇 ---")

    // Leemos los datos de cada carta seleccionada (nombre, tipo, nivel y elemento)
    const luchador1 = leerLuchador(seleccionados[0]);
    const luchador2 = leerLuchador(seleccionados[1]);
    console.log(luchador1)
    console.log(luchador2)
    console.log("----------------------------------------------------------------------")

    const ganador = determinarGanador(luchador1, luchador2);

    // Cuadros de animación
    try {
        reproducirSonido(audioMouse)
        reproducirPajita()
        await Swal.fire({
            title: t('combate.preparando'),
            imageUrl: `./img/Trabajando.gif`,
            imageWidth: 400,
            imageHeight: 200,
            imageAlt: t('combate.preparando'),
            confirmButtonText: t('aceptar')
        });
        detenerSonido(audioMouse); // Detiene el sonido después de que se cierra la primera ventana
        detenerSonidoPajita();
    } catch (error) {
        detenerSonido(audioMouse); // Asegura que el sonido se detenga en caso de error
        detenerSonidoPajita();
    }

    try {
        reproducirSonido(battleMusic)
        await Swal.fire({
            title: t('combate.peleando'),
            imageUrl: `./img/Peleando.gif`,
            imageWidth: 400,
            imageHeight: 200,
            imageAlt: t('combate.peleando'),
            confirmButtonText: t('aceptar')
        });
        detenerSonido(battleMusic);
    } catch (error) {
        detenerSonido(battleMusic);
    }

    try {
        reproducirSonido(winSound);
        reproducirConDelay(); // Llama a la función con delay para reproducir winMusic
        dialogoAbierto = true; // Marca que el diálogo está abierto
        await Swal.fire({
            title: t('combate.ganador', { nombre: ganador }),
            imageUrl: './img/Festejando.gif',
            imageWidth: 400,
            imageHeight: 200,
            imageAlt: t('combate.ganador', { nombre: ganador }),
            confirmButtonText: t('aceptar')
        });
        dialogoAbierto = false; // Marca que el diálogo está cerrado
        detenerSonido(winMusic);
    } catch (error) {
        dialogoAbierto = false; // Asegura que el diálogo esté cerrado en caso de error
        detenerSonido(winMusic);
    }
}

// Función para leer los datos de una carta (los guardamos en el data-tipo, data-nivel y data-elemento)
function leerLuchador(carta) {
    return {
        nombre: carta.querySelector('h4').textContent,
        tipo: carta.dataset.tipo,
        nivel: carta.dataset.nivel !== undefined ? Number(carta.dataset.nivel) : null, // null si el nivel es desconocido
        elemento: carta.dataset.elemento,
    };
}

// Función para determinar el ganador considerando tipo, nivel y elemento
function determinarGanador(luchador1, luchador2) {

    console.log("--- Cálculos del combate 👇 ---")

    // Punto de partida: pelea pareja
    const probabilidadBase = 0.5;
    console.log("Probabilidad base del primer digimon 👇")
    console.log(probabilidadBase)

    // Ajuste por tipo: +1 si el tipo 1 es fuerte contra el tipo 2, -1 si es débil, 0 si están parejos
    const ventajaTipo = calcularVentaja(TIPO_FUERTE_CONTRA, luchador1.tipo, luchador2.tipo);
    const ajusteTipo = ventajaTipo * PESO_TIPO;
    console.log("Ventaja de tipo (+1 a favor, -1 en contra) 👇")
    console.log(ventajaTipo)
    console.log("Ajuste por tipo 👇")
    console.log(ajusteTipo)

    // Ajuste por niveles (si a alguno le falta el nivel, no se ajusta nada)
    const hayNiveles = luchador1.nivel !== null && luchador2.nivel !== null;
    const diferenciaDeNivel = hayNiveles ? luchador1.nivel - luchador2.nivel : 0;
    const ajusteNivel = diferenciaDeNivel * PESO_NIVEL;
    console.log("Diferencia de nivel 👇")
    console.log(diferenciaDeNivel)
    console.log("Ajuste por nivel 👇")
    console.log(ajusteNivel)

    // Ajuste por elemento: +1 a favor, -1 en contra, 0 si están parejos (o alguno es Neutro)
    const ventajaElemento = calcularVentaja(ELEMENTO_FUERTE_CONTRA, luchador1.elemento, luchador2.elemento);
    const ajusteElemento = ventajaElemento * PESO_ELEMENTO;
    console.log("Ventaja de elemento (+1 a favor, -1 en contra) 👇")
    console.log(ventajaElemento)
    console.log("Ajuste por elemento 👇")
    console.log(ajusteElemento)

    // Sumamos todo y nos aseguramos de que la probabilidad esté entre 0 y 1 (redondeada a 2 decimales)
    const suma = probabilidadBase + ajusteTipo + ajusteNivel + ajusteElemento;
    const probabilidadAjustada = Math.min(1, Math.max(0, Number(suma.toFixed(2))));
    console.log("El N° aleatorio debe ser inferior a este 👇 para ganar")
    console.log(probabilidadAjustada)

    // Generación de resultado aleatorio
    const random = Math.random();
    console.log("Número aleatorio 👇")
    console.log(random)
    console.log("----------------------------------------------------------------------")

    if (random < probabilidadAjustada) {
        return luchador1.nombre;
    } else {
        return luchador2.nombre;
    }
}

// Agregar evento al botón de iniciar combate
botonIniciarCombate.addEventListener('click', iniciarCombate);

// ------------------------------------------------------------------------------------------------------

// Audios

const audioMouse = new Audio('audio/Mouse.mp3');
audioMouse.loop = true;

const winMusic = new Audio('audio/Digimon World 3 - Victory.mp3');
audioMouse.loop = true;

const battleMusic = new Audio('audio/Digimon World - Earlygame Battle.mp3');
audioMouse.loop = true;

const winSound = new Audio('audio/Digimon World - PSX Battle Win.mp3');

const audioPajita = new Audio('audio/Pajita.mp3');
let intervaloSonido;

function reproducirSonido(audio) {
    audio.play();
}

function detenerSonido(audio) {
    audio.pause();
    audio.currentTime = 0; 
}


function reproducirPajita() {
    intervaloSonido = setInterval(() => {
        audioPajita.play();
        setTimeout(() => {
            audioPajita.pause();
            audioPajita.currentTime = 0; 
        }, 650);
    }, 1500) 
}


function detenerSonidoPajita() {
    clearInterval(intervaloSonido);
    audioPajita.pause();
    audioPajita.currentTime = 0; 
}


function reproducirConDelay() {
    setTimeout(() => {
        if (dialogoAbierto) {
            winMusic.play();
        }
    }, 2450); 
}

// --------------------------------------------------------------------------------------------------------