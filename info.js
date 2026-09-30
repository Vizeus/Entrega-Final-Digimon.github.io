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

// "Vacuna 💉, Hielo ❄️" o, si no hay ninguno, "ninguno"
const enLista = (elementos, formato) => (elementos.length ? elementos.map(formato).join(', ') : t('info.ninguno'));

// Quiénes le ganan a "x" según una tabla de ventajas (ej.: TIPO_FUERTE_CONTRA)
const quienesLeGanan = (tabla, x) => Object.keys(tabla).filter(clave => tabla[clave].includes(x));

// Ventana común a los tres menús: descripción, lista de datos (con la etiqueta en negrita) y un pie con el peso en el combate
function mostrarInfo(titulo, descripcion, datos, pie) {
    const filas = datos.map(([etiqueta, valor]) => `<li><b>${etiqueta}:</b> ${valor}</li>`).join('');
    Swal.fire({
        title: titulo,
        html: `<p class="info-desc">${descripcion}</p><ul class="info-datos">${filas}</ul><p class="info-pie">${pie}</p>`,
        icon: 'info',
        confirmButtonText: t('aceptar'),
    });
}

function infoTipo(tipo) {
    const fuerte = TIPO_FUERTE_CONTRA[tipo] || [];
    const debil = quienesLeGanan(TIPO_FUERTE_CONTRA, tipo);
    const sinVentajas = fuerte.length === 0 && debil.length === 0; // Libre, Variable y Desconocido

    mostrarInfo(
        conEmojiTipo(tipo),
        t(`tipo.desc.${tipo}`),
        [
            [t('info.fuerte'), enLista(fuerte, conEmojiTipo)],
            [t('info.debil'), enLista(debil, conEmojiTipo)],
        ],
        sinVentajas ? t('tipo.pieSin') : t('tipo.pie', { p: porcentaje(PESO_TIPO) })
    );
}

function infoElemento(elemento) {
    const fuerte = ELEMENTO_FUERTE_CONTRA[elemento] || [];
    const debil = quienesLeGanan(ELEMENTO_FUERTE_CONTRA, elemento);
    const mutua = fuerte.filter(otro => debil.includes(otro)); // Luz y Oscuridad se ganan entre sí: se cancelan

    const datos = [
        [t('info.fuerte'), enLista(fuerte, conEmojiElemento)],
        [t('info.debil'), enLista(debil, conEmojiElemento)],
    ];
    if (mutua.length > 0) {
        datos.push([t('info.mutua'), `${enLista(mutua, conEmojiElemento)} ${t('info.seCancelan')}`]);
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
    const poder = numeracionNiveles[nivelApi]; // undefined si el nivel es desconocido
    const nombre = nombreNivel(nivelApi);

    const datos = [
        [t('info.poder'), poder ?? t('info.sinDato')],
        [t('info.clasificacion'), t(clasificacionAlternativa ? 'info.eeuu' : 'info.japon')],
    ];

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
        poder === undefined ? t('nivel.pieSin') : t('nivel.pie', { p: porcentaje(PESO_NIVEL) })
    );
}

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
        // Si hay una lista de información abierta, Esc primero cierra esa lista (lo hace activarMenusInfo)
        if (evento.key !== 'Escape' || !estaAbierto() || panel.querySelector('.menu-info.abierto')) return;
        abrir(false);
        boton.focus();
    }, true); // en captura: se decide antes de que Esc cierre la lista de información

    // Si la ventana se agranda hasta el diseño de computadora, el panel deja de existir: se cierra
    window.matchMedia('(max-width: 700px)').addEventListener('change', (cambio) => {
        if (!cambio.matches) abrir(false);
    });
}

escribirMenus();
activarMenusInfo();
activarMenuMovil();
document.addEventListener('idioma-cambiado', escribirMenus);
