import { build } from 'vite';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const outDir = resolve(rootDir, 'mapentity/static/mapentity/dist');
const isWatch = process.argv.includes('--watch');
const mode = isWatch ? 'development' : 'production';

function copyDatepickerLocales() {
  const src = resolve(rootDir, 'node_modules/bootstrap-datepicker/dist/locales');
  const dest = resolve(outDir, 'locales');
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

function copyMaplibreWorker() {
  const src = resolve(rootDir, 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs');
  const dest = resolve(outDir, 'maplibre-gl-worker.mjs');
  cpSync(src, dest);
}

const headConfig = {
  root: rootDir,
  base: './',
  mode,
  configFile: false,
  esbuild: {
    target: 'es2022',
  },
  build: {
    outDir,
    emptyOutDir: false,
    target: 'es2022',
    sourcemap: isWatch,
    minify: isWatch ? false : 'esbuild',
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'head.js'),
      name: 'MapEntityHead',
      formats: ['iife'],
      fileName: () => 'mapentity-head.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some((n) => n.endsWith('.css'))) {
            return 'mapentity.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    ...(isWatch ? { watch: {} } : {}),
  },
};

const appConfig = {
  root: rootDir,
  base: './',
  mode,
  configFile: false,
  esbuild: {
    target: 'es2022',
  },
  build: {
    outDir,
    emptyOutDir: false,
    target: 'es2022',
    sourcemap: isWatch,
    minify: isWatch ? false : 'esbuild',
    lib: {
      entry: resolve(__dirname, 'app.js'),
      name: 'MapEntityApp',
      formats: ['iife'],
      fileName: () => 'mapentity.js',
    },
    rollupOptions: {
      external: ['jquery', 'popper.js', 'maplibre-gl'],
      output: {
        globals: {
          jquery: 'jQuery',
          'popper.js': 'Popper',
          'maplibre-gl': 'maplibregl',
        },
      },
    },
    ...(isWatch ? { watch: {} } : {}),
  },
};

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyDatepickerLocales();
copyMaplibreWorker();

if (isWatch) {
  console.log('[mapentity] Watching frontend assets in development mode...');
  await Promise.all([build(headConfig), build(appConfig)]);
} else {
  await build(headConfig);
  await build(appConfig);
}
