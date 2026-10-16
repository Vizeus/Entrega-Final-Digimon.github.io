// Revisa cómo se deduce el elemento de cada digimon: compara el cálculo de ahora (solo con los ataques) con el nuevo (elementos.js: especie, ataques,
// descripción y grupos) y escribe un informe para revisarlo a mano. No cambia nada de la página.
//
// Necesita herramientas/elementos-datos.json (lo arma herramientas/elementos-datos.mjs). Se corre desde la carpeta del proyecto:
//   node herramientas/elementos-auditoria.mjs
//
// Escribe:
//   elementosPorId.js                      → el elemento de cada digimon (la página lo usa; se vuelve a generar con esta herramienta)
//   herramientas/elementos-auditoria.txt   → resumen, qué tan coherente es cada grupo y la lista de digimons que cambian (antes → después y por qué)

import { readFileSync, writeFileSync } from 'node:fs';
import { REGLAS_ELEMENTO, ELEMENTOS_MANUALES } from '../datos.js';
import { ESPECIES_CORREGIDAS, GRUPOS_CORREGIDOS } from '../especiesCorregidas.js';
import { deducirElementoPorPuntos, expresionDeNombres, MARGEN_DUDOSO, PUNTOS_MINIMOS } from '../elementos.js';

const archivoDatos = new URL(process.argv[2] ?? './elementos-datos.json', import.meta.url);
const archivoTabla = new URL('../elementosPorId.js', import.meta.url);
const archivoInforme = new URL('./elementos-auditoria.txt', import.meta.url);
const archivoControl = new URL('./elementos-control.json', import.meta.url);
// (con las especies y los grupos corregidos con Wikimon, igual que la página: ver especiesCorregidas.js)
const digimons = JSON.parse(readFileSync(archivoDatos, 'utf8')).map(digimon => ({
    ...digimon,
    especies: ESPECIES_CORREGIDAS[digimon.id] ?? digimon.especies,
    grupos: GRUPOS_CORREGIDOS[digimon.id] ?? digimon.grupos,
}));

// El cálculo de ahora (api.js, deducirElemento): solo los ataques; gana el que más palabras clave tiene y un empate es Neutro
function elementoDeAhora(digimon) {
    if (ELEMENTOS_MANUALES[digimon.id]) return ELEMENTOS_MANUALES[digimon.id];
    const texto = digimon.ataques
        .map(a => [a.ataque, a.traduccion, a.descripcion].filter(Boolean).join(' '))
        .join(' ')
        .toLowerCase();
    let ganador = 'Neutro';
    let maximo = 0;
    let empate = false;
    for (const [elemento, regla] of Object.entries(REGLAS_ELEMENTO)) {
        const n = (texto.match(regla) || []).length;
        if (n > maximo) {
            ganador = elemento;
            maximo = n;
            empate = false;
        } else if (n === maximo && n > 0) empate = true;
    }
    return empate ? 'Neutro' : ganador;
}

// Los nombres de todos los digimons, para que no cuenten como palabras clave cuando aparecen en las descripciones y los ataques
const nombresDeDigimons = expresionDeNombres(digimons.map(d => d.nombre));

const datosParaPuntuar = (digimon, conGrupos = true) => ({
    nombre: digimon.nombre,
    nombresDeDigimons,
    especies: digimon.especies,
    grupos: conGrupos ? digimon.grupos : [],
    descripcion: digimon.descripcion,
    habilidades: digimon.ataques.map(a => ({ nombre: a.ataque, traduccion: a.traduccion, descripcion: a.descripcion })),
});

const motivo = (puntos, heredado) => (heredado ? (typeof heredado === 'string' ? heredado : 'heredado de su línea evolutiva') : motivoDePuntos(puntos));
const motivoDePuntos = puntos =>
    Object.entries(puntos)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 3)
        .map(([elemento, p]) => `${elemento} ${p.total} (esp ${p.especie}, atq ${p.ataques}, desc ${p.descripcion}, grp ${p.grupo})`)
        .join(' · ');

const filas = digimons.map(digimon => {
    const antes = elementoDeAhora(digimon);
    const {
        elemento: despues,
        puntos,
        enRevision,
    } = ELEMENTOS_MANUALES[digimon.id] ? { elemento: ELEMENTOS_MANUALES[digimon.id], puntos: {} } : deducirElementoPorPuntos(datosParaPuntuar(digimon));
    return { digimon, antes, despues, puntos, enRevision };
});

// Segunda pasada: si las evoluciones vecinas (anteriores y siguientes) con elemento tienen todas el mismo, ese elemento lo hereda
//   - un digimon sin ninguna señal propia (Neutro sin puntos), o
//   - un digimon que quedó "en revisión" (ganó por 1 punto o menos solo con palabras sueltas) si el elemento de su línea es uno de los que casi ganaron.
// Se usa el resultado de la primera pasada (no se encadena: lo heredado no se vuelve a heredar).
const primeraPasada = new Map(filas.map(f => [f.digimon.id, f.despues]));
for (const fila of filas) {
    if (fila.despues !== 'Neutro' || ELEMENTOS_MANUALES[fila.digimon.id]) continue;
    const sinSenal = !Object.keys(fila.puntos).length;
    if (!sinSenal && !fila.enRevision) continue;
    const vecinos = [...(fila.digimon.previas ?? []), ...(fila.digimon.siguientes ?? [])].map(id => primeraPasada.get(id)).filter(e => e && e !== 'Neutro');
    if (vecinos.length < 2 || !vecinos.every(e => e === vecinos[0])) continue;
    const mejorPuntaje = Math.max(...Object.values(fila.puntos).map(p => p.total), 0);
    if (!sinSenal && !((fila.puntos[vecinos[0]]?.total ?? -Infinity) >= mejorPuntaje - MARGEN_DUDOSO)) continue;
    fila.despues = vecinos[0];
    fila.heredado = true;
}

// Las versiones X-Antibody son el mismo digimon con otro aspecto: tienen el elemento del original (si es que está en la lista y no tiene corrección a mano propia)
const porNombre = new Map(filas.map(f => [f.digimon.nombre.trim().toLowerCase(), f]));
for (const fila of filas) {
    const base = fila.digimon.nombre.match(/^(.*?)\s*\(X-Antibody\)$/i)?.[1];
    const original = base && porNombre.get(base.trim().toLowerCase());
    if (!original || ELEMENTOS_MANUALES[fila.digimon.id] || original.despues === fila.despues) continue;
    fila.despues = original.despues;
    fila.heredado = `versión X-Antibody de ${original.digimon.nombre}`;
}

const cuenta = lista => {
    const c = {};
    for (const e of lista) c[e] = (c[e] ?? 0) + 1;
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
};
const lineas = [];
lineas.push(`DIGIMONS: ${digimons.length}`, '');
lineas.push(
    'ELEMENTOS DE AHORA:',
    cuenta(filas.map(f => f.antes))
        .map(([e, n]) => `  ${e}: ${n}`)
        .join('\n'),
    '',
);
lineas.push(
    'ELEMENTOS NUEVOS:',
    cuenta(filas.map(f => f.despues))
        .map(([e, n]) => `  ${e}: ${n}`)
        .join('\n'),
    '',
);
const cambian = filas.filter(f => f.antes !== f.despues);
lineas.push(`CAMBIAN: ${cambian.length} de ${filas.length} (puntos mínimos para tener elemento: ${PUNTOS_MINIMOS})`, '');

// Qué tan coherente es cada grupo: el elemento de sus miembros calculado SIN contar los grupos (para no mezclar causa y efecto)
const porGrupo = new Map();
for (const digimon of digimons) {
    const { elemento } = deducirElementoPorPuntos(datosParaPuntuar(digimon, false));
    for (const grupo of new Set(digimon.grupos)) {
        if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
        porGrupo.get(grupo).push(elemento);
    }
}
lineas.push('GRUPOS (elemento de sus miembros sin contar los grupos; "pureza" = parte del elemento más común, sin contar Neutro):');
for (const [grupo, elementos] of [...porGrupo].sort((a, b) => b[1].length - a[1].length)) {
    const conElemento = elementos.filter(e => e !== 'Neutro');
    const c = cuenta(conElemento);
    const pureza = conElemento.length ? Math.round((c[0][1] / conElemento.length) * 100) : 0;
    lineas.push(
        `  ${grupo}: ${elementos.length} digimons, ${conElemento.length} con elemento, pureza ${pureza}% → ${c
            .slice(0, 4)
            .map(([e, n]) => `${e} ${n}`)
            .join(', ')}`,
    );
}
// Lista de control: unos 20 digimons muy conocidos con su elemento de siempre (herramientas/elementos-control.json, la revisó una persona). Sirve para
// medir cada cambio al criterio: cuántos acierta. `ELEMENTOS_MANUALES` no cuenta (se mide lo que deduce el cálculo).
const control = JSON.parse(readFileSync(archivoControl, 'utf8'));
const filaDe = nombre => filas.find(f => f.digimon.nombre === nombre);
const resultadoControl = Object.entries(control).map(([nombre, esperado]) => {
    const fila = filaDe(nombre);
    const calculado = fila ? fila.despues : '(no está)';
    return { nombre, esperado, calculado, antes: fila?.antes };
});
const aciertos = resultadoControl.filter(r => r.calculado === r.esperado).length;
lineas.push(`LISTA DE CONTROL: acierta ${aciertos} de ${resultadoControl.length}`);
for (const { nombre, esperado, calculado, antes } of resultadoControl) {
    lineas.push(
        `  ${calculado === esperado ? '✓' : '✗'} ${nombre}: esperado ${esperado}, calculado ${calculado}${antes === calculado ? '' : ` (antes ${antes})`}`,
    );
}
lineas.push('');
lineas.push('', 'DIGIMONS QUE CAMBIAN (id · nombre · antes → después · especies · grupos · puntos):');
const transiciones = cuenta(cambian.map(f => `${f.antes} → ${f.despues}`));
lineas.push('  Resumen: ' + transiciones.map(([t, n]) => `${t} (${n})`).join(', '), '');
for (const { digimon, antes, despues, puntos, heredado } of cambian) {
    lineas.push(
        `${digimon.id} · ${digimon.nombre} · ${antes} → ${despues} · [${digimon.especies}] · [${digimon.grupos}] · ${motivo(puntos, heredado) || 'sin puntos'}`,
    );
}

// Digimons que desentonan con su línea evolutiva: sus evoluciones vecinas (anteriores y siguientes) tienen todas el mismo elemento y el suyo es otro.
// No se corrigen solos (a veces es a propósito): se listan para decidir a mano, por ejemplo con ELEMENTOS_MANUALES.
const elementoPorId = new Map(filas.map(f => [f.digimon.id, f.despues]));
const desentonan = filas.filter(({ digimon, despues }) => {
    const vecinos = [...(digimon.previas ?? []), ...(digimon.siguientes ?? [])].map(id => elementoPorId.get(id)).filter(e => e && e !== 'Neutro');
    return vecinos.length >= 2 && vecinos.every(e => e === vecinos[0]) && vecinos[0] !== despues;
});
lineas.push('', `DESENTONAN CON SU LÍNEA EVOLUTIVA (${desentonan.length}): id · nombre · elemento · el de sus vecinos · vecinos`);
for (const { digimon, despues } of desentonan) {
    const vecinos = [...(digimon.previas ?? []), ...(digimon.siguientes ?? [])].filter(id => elementoPorId.get(id) !== 'Neutro' && elementoPorId.has(id));
    const nombres = vecinos.map(id => digimons.find(d => d.id === id)?.nombre).join(', ');
    lineas.push(`${digimon.id} · ${digimon.nombre} · ${despues} · ${elementoPorId.get(vecinos[0])} · ${nombres}`);
}

// Casos ambiguos: el segundo elemento queda a 1 punto o menos del primero (como Garurumon, con ataques de hielo y fuego azul). Se listan para decidir a mano.
const ambiguos = filas.filter(({ puntos, digimon }) => {
    if (ELEMENTOS_MANUALES[digimon.id]) return false;
    const orden = Object.values(puntos).sort((a, b) => b.total - a.total);
    return orden.length > 1 && orden[0].total >= PUNTOS_MINIMOS && orden[0].total - orden[1].total <= 1;
});
lineas.push('', `CASOS AMBIGUOS (${ambiguos.length}): el segundo elemento está a 1 punto o menos del primero`);
for (const { digimon, despues, puntos } of ambiguos) lineas.push(`${digimon.id} · ${digimon.nombre} · ${despues} · [${digimon.especies}] · ${motivo(puntos)}`);
const tabla = [
    '// Elemento de cada digimon de la API, calculado por herramientas/elementos-auditoria.mjs (especie, ataques, descripción, grupos y línea evolutiva).',
    '// No se edita a mano: se vuelve a generar con esa herramienta. Las correcciones a mano están en ELEMENTOS_MANUALES (datos.js) y mandan sobre esta tabla.',
    'export const ELEMENTO_POR_ID = {',
    ...filas.map(f => `    ${f.digimon.id}: '${f.despues}',`),
    '};',
    '',
].join('\n');
writeFileSync(archivoTabla, tabla);
writeFileSync(archivoInforme, lineas.join('\n') + '\n');
console.log(lineas.slice(0, 40).join('\n'));
console.log('\nInforme completo en herramientas/elementos-auditoria.txt y tabla en elementosPorId.js');
