// Configuración de ESLint: revisa el JavaScript buscando errores (variables sin declarar, código que no se usa, etc.).
// Se corre con: npm run revisar:js
import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['node_modules/', 'design/'] },
    js.configs.recommended,
    {
        // Los scripts de la página: son módulos, así que cada uno dice con "import" qué usa de los otros. Si un archivo usa algo de
        // otro sin importarlo, ESLint lo marca. (Si importa algo que el otro no exporta, la página no arranca: la consola lo dice.)
        files: ['*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                Swal: 'readonly', // SweetAlert2, que se carga desde el CDN en el index.html
            },
        },
        rules: {
            'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
            // Un catch vacío es a propósito en este proyecto (por ejemplo: si el navegador no deja guardar, no pasa nada)
            'no-empty': ['warn', { allowEmptyCatch: true }],
        },
    },
    {
        // La propia configuración corre en Node, no en el navegador
        files: ['*.config.mjs', 'herramientas/**/*.mjs'],
        languageOptions: { globals: globals.node },
    },
];
