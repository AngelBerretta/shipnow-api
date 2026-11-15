/**
 * seed-admin.js — crea el PRIMER usuario administrador.
 *
 * El alta publica (POST /api/users) rechaza el rol `admin` a proposito,
 * asi que esta es la unica forma de crear uno. Es idempotente: si ya
 * existe un admin con ese email, no hace nada.
 *
 * Uso (desde la raiz del monorepo o desde apps/api):
 *
 *   ADMIN_EMAIL=admin@ruvika.com ADMIN_PASSWORD='una-clave-larga' npm run seed:admin
 *
 * o definiendo ADMIN_EMAIL / ADMIN_PASSWORD (y opcionalmente
 * ADMIN_FIRST_NAME / ADMIN_LAST_NAME) en apps/api/.env. No hay
 * credenciales por defecto: sin ADMIN_EMAIL y ADMIN_PASSWORD el script
 * se niega a correr.
 */
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import userRepository from '../src/repositories/user.repository.js';
import userService from '../src/services/user.service.js';
import { ROLES } from '../src/constants/index.js';

const MIN_PASSWORD_LENGTH = 8;

function fail(message) {
  console.error(`[seed:admin] ${message}`);
  return 1;
}

async function run() {
  const { email, password, firstName, lastName } = config.seedAdmin;

  if (!email || !password) {
    return fail('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD (definilas en el entorno o en apps/api/.env).');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(`ADMIN_PASSWORD debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  await mongoose.connect(config.mongoUri);

  const existing = await userRepository.findByEmail(email.trim().toLowerCase());
  if (existing) {
    if (existing.role === ROLES.ADMIN) {
      console.log(`[seed:admin] Ya existe un admin con el email ${existing.email}. No se hizo nada.`);
      return 0;
    }
    return fail(`El email ${existing.email} ya esta usado por un usuario con rol "${existing.role}". Elegi otro ADMIN_EMAIL.`);
  }

  const admin = await userService.createAdminUser({ firstName, lastName, email, password });
  console.log(`[seed:admin] Administrador creado: ${admin.email} (id: ${admin._id}).`);
  return 0;
}

let exitCode = 1;
try {
  exitCode = await run();
} catch (error) {
  console.error(`[seed:admin] Error: ${error.message}`);
} finally {
  await mongoose.disconnect();
}
process.exit(exitCode);
