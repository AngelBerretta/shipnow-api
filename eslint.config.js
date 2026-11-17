import js from '@eslint/js';

export default [
  {
    // Contenido generado o de terceros: no se lintea.
    ignores: ['**/node_modules/**', '**/logs/**', '**/uploads/**', '**/coverage/**', '**/functions/**', '**/dist/**' ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        setImmediate: 'readonly',
        Buffer: 'readonly',        
      },
    },
    rules: {
      // Los servicios de seeding (mock.service.js) insertan de forma
      // secuencial a propósito: cada iteración puede depender de datos
      // creados en la anterior, y no queremos concurrencia descontrolada
      // contra la base en un flujo de mocking. Es un patrón intencional
      // en este proyecto, no una excepción puntual.
      'no-await-in-loop': 'off',

      'no-unused-vars': ['error', {
        // Parámetros obligatorios por firma pero no usados en el cuerpo
        // (ej. `next` en un error handler de Express, reconocido por
        // tener 4 argumentos). Se marcan explícitamente con prefijo "_".
        argsIgnorePattern: '^_',

        // Permite el patrón `const { campoSensible, ...resto } = obj`
        // cuando el objetivo es EXCLUIR un campo antes de devolver el
        // resto (ej. sacar `password` en UserRepository.create()).
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    // Globals propios de Mocha (describe/it/hooks) y de Node (Buffer, para
    // armar archivos en memoria en los tests de carga de archivos), usados
    // solo dentro de los tests de la API. El resto de las reglas sigue aplicando.
    files: ['apps/api/test/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    // Tests del paquete shared: usan node:test (sin globals).
    files: ['packages/**/test/**/*.js'],
    languageOptions: {
      globals: { Buffer: 'readonly' },
    },
  },
];
