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
        customClass: { popup: 'popup-info' }, // para darle al título la fuente pixelada de la barra (ver styles.scss)
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

    // Los niveles que rompen la escala (8 y 9) pesan más en el combate de lo que dice su número
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
    boton.addEventListener('click', evento => {
        evento.stopPropagation(); // que no cuente como elegir la carta para el combate
        abrirAtaques(carta);
    });
    return boton;
}

function crearListaDeAtaques(habilidades) {
    const lista = document.createElement('ul');
    lista.className = 'ataques-lista';

    const cerrarTodos = (salvo) => {
        for (const otro of lista.querySelectorAll('.ataque-boton[aria-expanded="true"]')) {
            if (otro === salvo) continue;
            otro.setAttribute('aria-expanded', 'false');
            otro.nextElementSibling.hidden = true;
        }
    };

    for (const habilidad of habilidades) {
        const item = document.createElement('li');
        const nombre = document.createElement('span');
        nombre.className = 'ataque-nombre';
        nombre.textContent = habilidad.nombre;
        if (habilidad.traduccion) {
            const traduccion = document.createElement('small');
            traduccion.textContent = `(${habilidad.traduccion})`;
            nombre.append(' ', traduccion);
        }

        if (!habilidad.descripcion) { // sin nada que contar: queda como un renglón, sin desplegar
            item.className = 'sin-descripcion';
            item.append(nombre);
            lista.append(item);
            continue;
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

        const descripcion = document.createElement('p');
        descripcion.className = 'ataque-desc';
        descripcion.hidden = true;
        descripcion.textContent = habilidad.descripcion;

        boton.addEventListener('click', () => {
            const abrir = boton.getAttribute('aria-expanded') !== 'true';
            cerrarTodos(boton);
            boton.setAttribute('aria-expanded', String(abrir));
            descripcion.hidden = !abrir;
            if (abrir) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        item.append(boton, descripcion);
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
        width: 'min(94vw, 480px)',
        customClass: { popup: 'popup-info popup-ataques' }, // el título con la fuente pixelada, como las otras ventanas de información
        willClose: () => { cartaDeAtaques = null; },
    });
}

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
