import js from '@eslint/js';
import globals from 'globals';

const mapentityGlobals = {
  $: 'readonly',
  jQuery: 'readonly',
  maplibregl: 'readonly',
  Geoman: 'readonly',
  turf: 'readonly',
  DataTable: 'readonly',
  toGeoJSON: 'readonly',
  gettext: 'readonly',
  ngettext: 'readonly',
  interpolate: 'readonly',
  MapEntity: 'writable',
  GeometryDataManager: 'writable',
  MaplibreDrawControlManager: 'writable',
  MaplibreFieldStore: 'writable',
  MaplibreFileLayerControl: 'writable',
  MaplibreLayerControl: 'writable',
  MaplibreLayerManager: 'writable',
  MaplibreMap: 'writable',
  MaplibreMapListSync: 'writable',
  MaplibreMapentityContext: 'writable',
  MaplibreMapentityHistory: 'writable',
  MaplibreMapentityTogglableFilter: 'writable',
  MaplibreMeasureControl: 'writable',
  MaplibreObjectsLayer: 'writable',
  MaplibreRectangle: 'writable',
  MaplibreResetViewControl: 'writable',
  MaplibreScreenshotController: 'writable',
  calculateBounds: 'writable',
  enableExternalLayerSnapping: 'writable',
  expandDatatableHeight: 'writable',
  generateUniqueId: 'writable',
  getURLParameter: 'writable',
  getWKT: 'writable',
  parseColor: 'writable',
  tr: 'writable',
};

export default [
  {
    ignores: [
      'node_modules/**',
      'mapentity/static/mapentity/dist/**',
      'mapentity/static/mapentity/jquery.*.js',
      'mapentity/static/mapentity/js/RelatedObjectLookups.js',
      'cypress/**',
      'cypress.config.js',
      'docs/**',
      'test_project/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['frontend/build.mjs', 'eslint.config.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['frontend/app.js', 'frontend/head.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['mapentity/static/mapentity/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...mapentityGlobals,
      },
    },
    rules: {
      'no-redeclare': ['error', { builtinGlobals: false }],
      'no-unused-vars': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-assignment': 'warn',
      'no-sparse-arrays': 'warn',
      'preserve-caught-error': 'off',
    },
  },
];
