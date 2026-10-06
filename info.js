// -----------------------------------------------------------------------------------------------------------------
// MENÚS DE INFORMACIÓN (tipos, elementos y niveles) y sus ventanas emergentes
//
// Los tres menús de la barra tienen el mismo formato: al elegir una opción se abre una ventana con su descripción,
// contra qué es fuerte o débil y cuánto pesa en el combate. Los números salen de las mismas tablas que usa el combate
// (main.js), así que lo que dice la ventana siempre coincide con lo que pasa en la pelea.
// Los textos vienen de i18n.js y se vuelven a escribir cuando cambia el idioma.
// -----------------------------------------------------------------------------------------------------------------

const ORDEN_TIPOS_MENU = ['Datos', 'Virus', 'Vacuna', 'Libre', 'Variable', 'Desconocido'];

const conEmojiTipo = tipo => `${nombreTipo(tipo)} ${EMOJIS_TIPO[tipo]}`;
const conEmojiElemento = elemento => `${nombreElemento(elemento)} ${EMOJIS_ELEMENTO[elemento]}`;
const porcentaje = peso => Math.round(peso * 100);

// Colores temáticos para los enlaces interactivos
const COLORES_TIPO = {
    'Vacuna': '#2563eb',
    'Virus': '#7c3aed',
    'Datos': '#16a34a',
    'Libre': '#0d9488',
    'Variable': '#ea580c',
    'Desconocido': '#4b5563',
};

const COLORES_ELEMENTO = {
    'Fuego': '#dc2626',
    'Agua': '#2563eb',
    'Planta': '#16a34a',
    'Hielo': '#0284c7',
    'Rayo': '#d97706',
    'Viento': '#059669',
    'Tierra': '#92400e',
    'Luz': '#ca8a04',
    'Oscuridad': '#6b21a8',
    'Metal': '#475569',
    'Veneno': '#9333ea',
    'Neutro': '#64748b',
};

// Genera un botón con enlace de referencia cruzada (línea punteada al pasar el puntero)
function linkTipo(tipo) {
    const texto = conEmojiTipo(tipo);
    const color = COLORES_TIPO[tipo] || 'currentColor';
    const ayuda = t('info.verInfoDe', { nombre: nombreTipo(tipo) });
    return `<button type="button" class="info-link info-link-tipo" data-info-tipo="${tipo}" style="--link-c: ${color};" title="${ayuda}" aria-label="${ayuda}">${texto}</button>`;
}

function linkElemento(elemento) {
    const texto = conEmojiElemento(elemento);
    const color = COLORES_ELEMENTO[elemento] || 'currentColor';
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

// Quiénes le ganan a "x" según una tabla de ventajas (ej.: TIPO_FUERTE_CONTRA)
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

const REGEX_NIVELES = /\b(Super Ultimate|Absolute|Baby II|Baby I|Child|Adult|Perfect|Ultimate|Mega)\b/g;

// Enlaza menciones de niveles, tipos o elementos que aparezcan en el texto de las descripciones
function enlazarTexto(texto) {
    if (!texto) return '';
    return texto.replace(REGEX_NIVELES, (match) => {
        const nivel = MENCIONES_NIVEL_MAP[match];
        const ayuda = t('info.verInfoDe', { nombre: match });
        return `<button type="button" class="info-link info-link-nivel" data-info-nivel="${nivel}" title="${ayuda}" aria-label="${ayuda}">${match}</button>`;
    });
}

let ultimaInfoAbierta = null;

// Ventana común a los tres menús: descripción, lista de datos (con la etiqueta en negrita) y un pie con el peso en el combate
function mostrarInfo(titulo, descripcion, datos, pie) {
    const filas = datos.map(([etiqueta, valor]) => `<li><b>${etiqueta}:</b> ${valor}</li>`).join('');
    const descHtml = enlazarTexto(descripcion);

    Swal.fire({
        title: titulo,
        html: `<p class="info-desc">${descHtml}</p><ul class="info-datos">${filas}</ul><p class="info-pie">${pie}</p>`,
        icon: 'info',
        width: 'min(94vw, 680px)',
        confirmButtonText: t('aceptar'),
        focusConfirm: false,
        customClass: { popup: 'popup-info' }, // para darle al título la fuente pixelada de la barra (ver styles.scss)
        didOpen: (popup) => {
            popup.querySelector('.swal2-confirm')?.blur();
        },
    });
}

function infoTipo(tipo) {
    ultimaInfoAbierta = { fn: infoTipo, args: [tipo] };
    const fuerte = TIPO_FUERTE_CONTRA[tipo] || [];
    const debil = quienesLeGanan(TIPO_FUERTE_CONTRA, tipo);
    const sinVentajas = fuerte.length === 0 && debil.length === 0; // Libre, Variable y Desconocido

    mostrarInfo(
        conEmojiTipo(tipo),
        t(`tipo.desc.${tipo}`),
        [
            [t('info.fuerte'), enLista(fuerte, linkTipo)],
            [t('info.debil'), enLista(debil, linkTipo)],
        ],
        sinVentajas ? t('tipo.pieSin') : t('tipo.pie', { p: porcentaje(PESO_TIPO) })
    );
}

function infoElemento(elemento) {
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
        elemento === 'Neutro' ? t('elemento.pieNeutro') : t('elemento.pie', { p: porcentaje(PESO_ELEMENTO) })
    );
}

// El nivel se pide con el nombre original de la API ('Adult'); el nombre que se muestra depende del sistema de clasificación
function infoNivel(nivelApi) {
    ultimaInfoAbierta = { fn: infoNivel, args: [nivelApi] };
    const poder = numeracionNiveles[nivelApi]; // undefined si el nivel es desconocido
    const nombre = nombreNivel(nivelApi);

    const datos = [
        [t('info.poder'), poder ?? t('info.sinDato')],
        [t('info.clasificacion'), t(clasificacionAlternativa ? 'info.eeuu' : 'info.japon')],
    ];

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
    if (poder !== undefined) {
        const otroNombre = (clasificacionAlternativa ? nivelApi : nivelesAlternativos[nivelApi] || nivelApi).trim();
        if (otroNombre !== nombre) {
            datos.push([t('info.otraClasificacion'), otroNombre]);
        }
    }

    mostrarInfo(
        poder === undefined ? nombre : t('info.nivelTitulo', { nombre, n: poder }),
        t(`nivel.desc.${nivelApi}`),
        datos,
        poder === undefined ? t('nivel.pieSin')
            : poderCombate !== undefined ? t('nivel.pieAlto', { n: poderCombate, p: porcentaje(PESO_NIVEL) })
            : t('nivel.pie', { p: porcentaje(PESO_NIVEL) })
    );
}

// Clics en referencias cruzadas (links)
document.addEventListener('click', (evento) => {
    const linkT = evento.target.closest('.info-link-tipo');
    if (linkT) {
        evento.preventDefault();
        evento.stopPropagation();
        const tipo = linkT.dataset.infoTipo;
        if (tipo && typeof infoTipo === 'function') {
            infoTipo(tipo);
        }
        return;
    }

    const linkE = evento.target.closest('.info-link-elemento');
    if (linkE) {
        evento.preventDefault();
        evento.stopPropagation();
        const elemento = linkE.dataset.infoElemento;
        if (elemento && typeof infoElemento === 'function') {
            infoElemento(elemento);
        }
        return;
    }

    const linkN = evento.target.closest('.info-link-nivel');
    if (linkN) {
        evento.preventDefault();
        evento.stopPropagation();
        const nivel = linkN.dataset.infoNivel;
        if (nivel && typeof infoNivel === 'function') {
            infoNivel(nivel);
        }
        return;
    }
});

// Redibujar la ventana si se cambia el idioma o el sistema de niveles
const redibujarInfoAbierta = () => {
    if (!ultimaInfoAbierta) return;
    const popup = document.querySelector('.popup-info:not(.popup-ataques)');
    if (popup && typeof Swal !== 'undefined' && Swal.isVisible()) {
        ultimaInfoAbierta.fn(...ultimaInfoAbierta.args);
    }
};

document.addEventListener('idioma-cambiado', redibujarInfoAbierta);
document.addEventListener('niveles-cambiados', redibujarInfoAbierta);

// ---- Ventana de ataques de una carta ---------------------------------------------------------------------------------
// El botón "⚔️ Ataques" del dorso (lo arma main.js al construir el dorso). Abre una lista con todos los ataques de la carta; al tocar
// uno se despliega qué hace (la descripción viene de la API, en inglés). Se abre de a uno, para que la lista no se alargue.
let cartaDeAtaques = null; // la carta cuya ventana de ataques está abierta (para reescribirla si se cambia el idioma)

function crearBotonAtaques(carta) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'c-ataques';
    boton.textContent = t('ataques.boton');
    boton.title = t('ataques.boton.ayuda');
    activarBotonDelDorso(boton, () => abrirAtaques(carta)); // toque rápido con el dedo y hundimiento (main.js)
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
        const nvA = (typeof numeracionNiveles !== 'undefined' && numeracionNiveles[a.dataset.nivelApi]) ?? 99;
        const nvB = (typeof numeracionNiveles !== 'undefined' && numeracionNiveles[b.dataset.nivelApi]) ?? 99;
        if (nvA !== nvB) return nvA - nvB;
        const nomA = typeof nombreCompleto === 'function' ? nombreCompleto(a) : (a.dataset.nombreApi || '');
        const nomB = typeof nombreCompleto === 'function' ? nombreCompleto(b) : (b.dataset.nombreApi || '');
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
    const nvNumero = typeof numeracionNiveles !== 'undefined' ? numeracionNiveles[nvOriginal] : undefined;
    const color = (typeof COLOR_NIVEL !== 'undefined' && COLOR_NIVEL[nvNumero])
        || carta.querySelector('.c-arte')?.style.getPropertyValue('--c')
        || (typeof COLOR_NIVEL_DESCONOCIDO !== 'undefined' ? COLOR_NIVEL_DESCONOCIDO : '#3a8dde');
    nodo.style.setProperty('--c', color);

    const nombreTexto = typeof nombreCompleto === 'function' ? nombreCompleto(carta) : (carta.dataset.nombreApi || '');
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
    nivel.textContent = typeof nombreNivel === 'function' ? nombreNivel(carta.dataset.nivelApi) : (nvOriginal || '');

    texto.append(nombre, nivel);
    nodo.append(imagen, texto);

    nodo.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.irALaCarta === 'function') {
            window.irALaCarta(id);
        }
    });

    return nodo;
}

function crearListaDeAtaques(habilidades) {
    const lista = document.createElement('ul');
    lista.className = 'ataques-lista';

    const cerrarTodos = (salvo) => {
        for (const otro of lista.querySelectorAll('.ataque-boton[aria-expanded="true"]')) {
            if (otro === salvo) continue;
            otro.setAttribute('aria-expanded', 'false');
            const detalle = otro.nextElementSibling;
            if (detalle) detalle.hidden = true;
        }
    };

    for (const habilidad of habilidades) {
        const item = document.createElement('li');
        item.className = 'ataque-item';

        const nombre = document.createElement('span');
        nombre.className = 'ataque-nombre';
        nombre.textContent = habilidad.nombre;
        if (habilidad.traduccion) {
            const traduccion = document.createElement('small');
            traduccion.textContent = `(${habilidad.traduccion})`;
            nombre.append(' ', traduccion);
        }

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

        const digimonsConAtaque = obtenerDigimonsConAtaque(habilidad.nombre);
        if (digimonsConAtaque.length > 0) {
            const seccion = document.createElement('div');
            seccion.className = 'ataque-digimons-seccion';

            const titulo = document.createElement('h6');
            titulo.className = 'ataque-digimons-titulo';
            titulo.textContent = t(digimonsConAtaque.length === 1 ? 'ataques.quienesUsan.uno' : 'ataques.quienesUsan', { n: digimonsConAtaque.length });

            const grid = document.createElement('div');
            grid.className = 'ataque-digimons-grid';

            for (const c of digimonsConAtaque) {
                grid.append(crearMiniNodoDigimon(c));
            }

            seccion.append(titulo, grid);
            detalle.append(seccion);
        }

        boton.addEventListener('click', () => {
            const abrir = boton.getAttribute('aria-expanded') !== 'true';
            cerrarTodos(boton);
            boton.setAttribute('aria-expanded', String(abrir));
            detalle.hidden = !abrir;
            if (abrir) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });

        item.append(boton, detalle);
        lista.append(item);
    }
    return lista;
}

function abrirAtaques(carta) {
    const habilidades = carta.datosDorso?.habilidades || [];
    if (!habilidades.length) return;
    cartaDeAtaques = carta;

    const cuerpo = document.createElement('div');
    const ayuda = document.createElement('p');
    ayuda.className = 'ataques-ayuda';
    ayuda.textContent = t('ataques.ayuda');
    cuerpo.append(ayuda, crearListaDeAtaques(habilidades));
    const pie = document.createElement('p');
    pie.className = 'info-pie ataques-pie';
    pie.textContent = t('carta.idiomaOriginal'); // las descripciones de la API vienen en inglés (en inglés no hace falta avisar)
    pie.hidden = !pie.textContent;
    cuerpo.append(pie);

    Swal.fire({
        titleText: t('ataques.titulo', { nombre: nombreCompleto(carta) }),
        html: cuerpo,
        confirmButtonText: t('aceptar'),
        focusConfirm: false,
        width: 'min(94vw, 680px)',
        customClass: { popup: 'popup-info popup-ataques' }, // el título con la fuente pixelada, como las otras ventanas de información
        didOpen: (popup) => {
            popup.querySelector('.swal2-confirm')?.blur();
        },
        willClose: () => { cartaDeAtaques = null; },
    });
}

window.abrirAtaques = abrirAtaques;
window.infoTipo = infoTipo;
window.infoElemento = infoElemento;
window.infoNivel = infoNivel;

// Si se cambia el idioma con la ventana abierta, el título, la ayuda y el aviso se vuelven a escribir en el idioma nuevo
document.addEventListener('idioma-cambiado', () => {
    if (!cartaDeAtaques) return;
    const titulo = Swal.getTitle();
    if (titulo) titulo.textContent = t('ataques.titulo', { nombre: nombreCompleto(cartaDeAtaques) });
    const ayuda = document.querySelector('.popup-ataques .ataques-ayuda');
    if (ayuda) ayuda.textContent = t('ataques.ayuda');
    const pie = document.querySelector('.popup-ataques .ataques-pie');
    if (pie) {
        pie.textContent = t('carta.idiomaOriginal');
        pie.hidden = !pie.textContent;
    }
    const confirmar = Swal.getConfirmButton();
    if (confirmar) confirmar.textContent = t('aceptar');
});

// Qué ventana abre cada menú (por el id de su lista)
const VENTANA_DE_CADA_MENU = {
    'lista-tipos': infoTipo,
    'lista-elementos': infoElemento,
    'lista-niveles': infoNivel,
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
    escribirOpciones('lista-tipos', ORDEN_TIPOS_MENU.map(tipo => [tipo, conEmojiTipo(tipo)]));
    escribirOpciones('lista-elementos', ORDEN_ELEMENTOS.map(elemento => [elemento, conEmojiElemento(elemento)]));
    escribirOpciones('lista-niveles', ORDEN_NIVELES.map(nivelApi => {
        const poder = numeracionNiveles[nivelApi];
        const nombre = nombreNivel(nivelApi);
        return [nivelApi, poder === undefined ? nombre : t('info.nivelItem', { nombre, n: poder })];
    }));
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

        lista.addEventListener('click', (evento) => {
            const boton = evento.target.closest('button[data-k]');
            if (!boton) return;
            abrir(menu, false);
            VENTANA_DE_CADA_MENU[lista.id](boton.dataset.k);
        });
    });

    document.addEventListener('pointerdown', (evento) => {
        menus.forEach(menu => {
            if (estaAbierto(menu) && !menu.contains(evento.target)) abrir(menu, false);
        });
    });

    document.addEventListener('keydown', (evento) => {
        if (evento.key !== 'Escape') return;
        menus.forEach(menu => {
            if (estaAbierto(menu)) {
                abrir(menu, false);
                menu.querySelector('.menu-desplegable').focus();
            }
        });
    });
}

// Menú ☰ del celular: abre y cierra el panel con la consigna, los ajustes y los menús de información.
// Se cierra con el mismo botón, al tocar afuera, con Esc o al elegir una opción de información.
function activarMenuMovil() {
    const barra = document.getElementById('navbar');
    const boton = document.getElementById('abrir-menu');
    const panel = document.getElementById('menu-movil');
    const estaAbierto = () => barra.classList.contains('menu-abierto');
    const abrir = (abierto) => {
        barra.classList.toggle('menu-abierto', abierto);
        boton.setAttribute('aria-expanded', String(abierto));
        // Al cerrar el panel también se recogen las listas de información y de filtros: al volver a abrirlo están cerradas
        if (!abierto) {
            panel.querySelectorAll('.menu-info.abierto, .f-grupo.abierto').forEach(menu => {
                menu.classList.remove('abierto');
                menu.querySelector('.menu-desplegable, .f-btn').setAttribute('aria-expanded', 'false');
            });
        }
    };

    boton.addEventListener('click', () => abrir(!estaAbierto()));

    // Al elegir una opción de información se abre su ventana: el panel se cierra
    panel.addEventListener('click', (evento) => {
        if (evento.target.closest('ul button[data-k]')) abrir(false);
    });

    document.addEventListener('pointerdown', (evento) => {
        if (estaAbierto() && !panel.contains(evento.target) && !boton.contains(evento.target)) abrir(false);
    });

    document.addEventListener('keydown', (evento) => {
        // Si hay una lista de información o de filtros abierta, Esc primero cierra esa lista (lo hacen activarMenusInfo y filtros.js)
        if (evento.key !== 'Escape' || !estaAbierto() || panel.querySelector('.menu-info.abierto, .f-grupo.abierto')) return;
        abrir(false);
        boton.focus();
    }, true); // en captura: se decide antes de que Esc cierre la lista de información

    // Si la ventana se agranda hasta el diseño de computadora, el panel deja de existir: se cierra
    window.matchMedia('(max-width: 700px)').addEventListener('change', (cambio) => {
        if (!cambio.matches) abrir(false);
    });
}

// Barra de arriba del celular (la que lleva el menú ☰ con los filtros): se esconde al bajar por la lista y vuelve a aparecer
// apenas se sube un poquito, y solo con ese gesto (así no tapa las cartas mientras se recorre la lista). Arriba de todo de la
// página y con el menú ☰ abierto siempre se ve. En computadora no hace nada: la barra queda fija como siempre.
// (El CSS hace el movimiento: la clase "barra-escondida" la desliza hacia arriba, fuera de la pantalla.)
function activarBarraQueSeEsconde() {
    const barra = document.getElementById('navbar');
    const celular = window.matchMedia('(max-width: 700px)');
    const SIEMPRE_VISIBLE_ARRIBA = 60; // px desde el borde de arriba de la página: ahí la barra siempre se ve
    const BAJADA_PARA_ESCONDER = 14;   // px seguidos hacia abajo para que se esconda (un temblor del dedo no alcanza)
    const SUBIDA_PARA_MOSTRAR = 8;     // px seguidos hacia arriba para que aparezca
    let ultimoY = window.scrollY;
    let recorrido = 0; // px que se lleva recorridos en la dirección actual (positivo: bajando, negativo: subiendo)

    const mostrar = () => barra.classList.remove('barra-escondida');

    window.addEventListener('scroll', () => {
        if (!celular.matches) {
            mostrar();
            return;
        }
        // El rebote de iPhone en los extremos pasa de los límites de la página: se recorta para que no cuente como un gesto
        const y = Math.max(0, Math.min(window.scrollY, document.documentElement.scrollHeight - window.innerHeight));
        const dy = y - ultimoY;
        ultimoY = y;
        if (dy === 0) return;
        recorrido = (dy > 0) === (recorrido > 0) && recorrido !== 0 ? recorrido + dy : dy;

        if (y <= SIEMPRE_VISIBLE_ARRIBA || barra.classList.contains('menu-abierto')) {
            mostrar();
        } else if (recorrido >= BAJADA_PARA_ESCONDER) {
            barra.classList.add('barra-escondida');
        } else if (recorrido <= -SUBIDA_PARA_MOSTRAR) {
            mostrar();
        }
    }, { passive: true });

    // Si la ventana pasa al diseño de computadora (o vuelve al celular), la barra arranca a la vista
    celular.addEventListener('change', () => {
        recorrido = 0;
        ultimoY = window.scrollY;
        mostrar();
    });
}

escribirMenus();
activarMenusInfo();
activarMenuMovil();
activarBarraQueSeEsconde();
document.addEventListener('idioma-cambiado', escribirMenus);
document.addEventListener('niveles-cambiados', escribirMenus); // la lista de niveles usa los nombres del sistema vigente
