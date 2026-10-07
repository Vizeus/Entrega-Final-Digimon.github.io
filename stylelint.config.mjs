// Configuración de Stylelint: revisa el SCSS buscando errores (propiedades que se pisan, valores inválidos, selectores repetidos...).
// Se corre con: npm run revisar:css
// Parte de las reglas estándar de SCSS, sin las que solo imponen un estilo de escritura distinto del que usa el proyecto
// (por ejemplo, rgba(0, 0, 0, 0.5) en vez de rgb(0 0 0 / 50%)): esas no encuentran errores, solo cambiarían cientos de líneas.
export default {
    extends: ['stylelint-config-standard-scss'],
    rules: {
        // Notación de colores y de media queries: el proyecto usa la clásica, que es igual de válida
        'alpha-value-notation': null,
        'color-function-notation': null,
        'color-function-alias-notation': null,
        'color-hex-length': null,
        'media-feature-range-notation': null,
        'selector-not-notation': null,
        'keyframe-selector-notation': null,
        // Líneas en blanco y reglas de una sola línea: es formato, no errores
        'declaration-empty-line-before': null,
        'rule-empty-line-before': null,
        'at-rule-empty-line-before': null,
        'custom-property-empty-line-before': null,
        'scss/dollar-variable-empty-line-before': null,
        'scss/double-slash-comment-empty-line-before': null,
        'declaration-block-single-line-max-declarations': null,
        // Los prefijos -webkit- que hay (backdrop-filter, mask...) todavía los necesita Safari
        'property-no-vendor-prefix': null,
        // Los "//" vacíos se usan para separar párrafos dentro de un mismo comentario largo
        'scss/comment-no-empty': null,
    },
};
