import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
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
        // La variable descartada nunca se usa a propósito — esa es
        // justamente su función.
        ignoreRestSiblings: true,
      }],
    },
  },
];