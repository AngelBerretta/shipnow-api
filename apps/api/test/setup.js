import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * test/setup.js
 *
 * Este archivo se carga con `--require` desde `.mocharc.json`, ANTES que
 * cualquier archivo de test. Eso es lo que permite que las variables de
 * entorno de testing (.env.test) queden fijadas antes de que ningun spec
 * importe `src/app.js` (y, con el, `src/config/env.config.js`, que valida
 * las variables apenas se importa).
 *
 * No hace falta que ningun archivo de test importe este archivo a mano:
 * Mocha lo carga solo por estar declarado en "require".
 */
process.env.NODE_ENV = 'test';
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true });
// JWT_SECRET de testing: si .env.test no lo define se usa este (solo para tests).
process.env.JWT_SECRET ||= 'test-only-jwt-secret-not-for-production-0123456789';
process.env.INTERNAL_API_SECRET ||= 'test-only-internal-secret-0123456789abcdef';

if (!process.env.MONGODB_URI || !process.env.MONGODB_URI.includes('test')) {
  // Red de seguridad: si falta .env.test o su MONGODB_URI no "parece" de
  // testing, se corta ACA, antes de conectar y (sobre todo) antes de que
  // el afterEach de mas abajo borre datos de una base que no deberia tocar.
  throw new Error(
    '[test/setup] MONGODB_URI de testing invalida o no configurada.\n' +
      'Copia .env.test.example como .env.test y verifica que apunte a una ' +
      'base de datos EXCLUSIVA para tests (por convencion, con "test" en el nombre).'
  );
}

/**
 * Root Hook Plugin de Mocha (https://mochajs.org/#root-hook-plugins).
 * Al exportarse desde un archivo cargado via "require", se aplica
 * automaticamente a TODA la suite: ningun archivo de test necesita
 * conectar o limpiar la base por su cuenta.
 */
export const mochaHooks = {
  async beforeAll() {
    await mongoose.connect(process.env.MONGODB_URI);
  },

  /**
   * Limpieza despues de CADA test individual (no solo al final de un
   * grupo): deja la base vacia para que ningun test dependa de datos
   * dejados por otro ni del orden en que Mocha decida correrlos. Cada
   * test es responsable de crear, dentro de si mismo o de un
   * beforeEach, los datos que necesita (ver test/helpers/fixtures.js).
   */

  /** Antes de cada test (la base queda vacía por el afterEach) se crea un admin y se lo loguea. */
  async beforeEach() {
    const { startAdminSession } = await import('./helpers/auth.js');
    await startAdminSession();
  },  
  
  async afterEach() {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  },

  async afterAll() {
    await mongoose.connection.close();
  },
};
