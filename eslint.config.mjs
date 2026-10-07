// Configuración de ESLint: revisa el JavaScript buscando errores (variables sin declarar, código que no se usa, etc.).
// Se corre con: npm run revisar:js
import js from '@eslint/js';
import globals from 'globals';
import { readFileSync } from 'node:fs';

// Los scripts de la página (en el orden en que los carga el index.html)
const SCRIPTS = ['util.js', 'datos.js', 'i18n.js', 'nombres.js', 'main.js', 'filtros.js', 'info.js', 'barra.js', 'evolucion.js', 'baile.js'];

// Hoy los scripts son "clásicos" (no módulos): lo que uno declara arriba de todo (funciones, const, let) lo pueden usar los demás.
// ESLint revisa cada archivo por separado y no lo sabe, así que se le avisa cuáles son esos nombres compartidos: se leen de los
// propios archivos: a cada archivo se le pasan los que declaran LOS OTROS. (Cuando el proyecto pase a módulos con import/export,
// esto se borra.) Una variable que no está declarada en NINGÚN archivo (como era "dialogoAbierto") igual se marca como error.
const declaradosEn = archivo => {
    const codigo = readFileSync(new URL(archivo, import.meta.url), 'utf8');
    return [...codigo.matchAll(/^(?:async\s+)?(?:function\s*\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)].map(([, nombre]) => nombre);
};
const declarados = Object.fromEntries(SCRIPTS.map(archivo => [archivo, declaradosEn(archivo)]));
const globalesDeLosOtros = archivo =>
    Object.fromEntries(
        SCRIPTS.filter(otro => otro !== archivo)
            .flatMap(otro => declarados[otro])
            .map(nombre => [nombre, 'writable']),
    );

export default [
    { ignores: ['node_modules/', 'design/'] },
    js.configs.recommended,
    {
        files: SCRIPTS,
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: {
                ...globals.browser,
                Swal: 'readonly', // SweetAlert2, que se carga desde el CDN en el index.html
            },
        },
        rules: {
            // Los nombres que comparten los scripts aparecen como "sin usar" en el archivo que los declara: eso no es un error
            'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }],
            // Un catch vacío es a propósito en este proyecto (por ejemplo: si el navegador no deja guardar, no pasa nada)
            'no-empty': ['warn', { allowEmptyCatch: true }],
        },
    },
    // Los nombres compartidos que cada archivo puede usar (los que declaran los demás scripts)
    ...SCRIPTS.map(archivo => ({ files: [archivo], languageOptions: { globals: globalesDeLosOtros(archivo) } })),
    {
        // La propia configuración corre en Node, no en el navegador
        files: ['*.config.mjs', 'herramientas/**/*.mjs'],
        languageOptions: { globals: globals.node },
    },
];
