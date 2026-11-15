/**
 * migrate-stage0.js — migra los datos YA EXISTENTES en MongoDB a lo que
 * la Etapa 0 espera. Es idempotente (se puede correr varias veces) y
 * admite `--dry-run` para ver que haria sin escribir nada.
 *
 *   npm run migrate:stage0              # aplica los cambios
 *   npm run migrate:stage0 -- --dry-run # solo informa
 *
 * Que hace:
 *  1. Hashea las contrasenas que todavia estan en texto plano.
 *  2. Marca `isActive: true` en los usuarios que no tienen el campo.
 *  3. Asigna `trackingCode` a los pedidos que no tienen.
 *  4. Crea el evento `order_created` en el historial de los pedidos que
 *     no tienen ningun evento (con la fecha de creacion del pedido).
 *
 * Una base nueva (sin datos previos) no necesita correrlo.
 */
import mongoose from 'mongoose';
import config from '../src/config/index.js';
import User from '../src/models/user.model.js';
import Order from '../src/models/order.model.js';
import OrderEvent from '../src/models/orderEvent.model.js';
import { hashPassword, isBcryptHash } from '../src/utils/password.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { ORDER_EVENT_TYPES, ORDER_STATUS } from '../src/constants/index.js';

const dryRun = process.argv.includes('--dry-run');
const MAX_TRACKING_CODE_ATTEMPTS = 5;

async function hashPlainTextPasswords() {
  let migrated = 0;
  for await (const user of User.find({}, 'password').lean().cursor()) {
    if (isBcryptHash(user.password)) continue;
    migrated += 1;
    if (!dryRun) {
      await User.updateOne({ _id: user._id }, { $set: { password: await hashPassword(user.password) } });
    }
  }
  return migrated;
}

async function markUsersActive() {
  const filter = { isActive: { $exists: false } };
  if (dryRun) return User.countDocuments(filter);
  const result = await User.updateMany(filter, { $set: { isActive: true } });
  return result.modifiedCount;
}

async function assignTrackingCodes() {
  let assigned = 0;
  for await (const order of Order.find({ trackingCode: { $exists: false } }, '_id').lean().cursor()) {
    assigned += 1;
    if (dryRun) continue;
    for (let attempt = 1; attempt <= MAX_TRACKING_CODE_ATTEMPTS; attempt += 1) {
      try {
        await Order.updateOne({ _id: order._id }, { $set: { trackingCode: generateTrackingCode() } });
        break;
      } catch (error) {
        const isCollision = error.code === 11000 && attempt < MAX_TRACKING_CODE_ATTEMPTS;
        if (!isCollision) throw error;
      }
    }
  }
  return assigned;
}

async function backfillOrderCreatedEvents() {
  const orderIdsWithEvents = new Set((await OrderEvent.distinct('order')).map(String));
  let created = 0;
  for await (const order of Order.find({}, '_id createdAt').lean().cursor()) {
    if (orderIdsWithEvents.has(String(order._id))) continue;
    created += 1;
    if (!dryRun) {
      await OrderEvent.create({
        order: order._id,
        type: ORDER_EVENT_TYPES.ORDER_CREATED,
        toStatus: ORDER_STATUS.CREATED,
        occurredAt: order.createdAt || new Date(),
      });
    }
  }
  return created;
}

let exitCode = 0;
try {
  await mongoose.connect(config.mongoUri);
  console.log(`[migrate:stage0] ${dryRun ? 'SIMULACRO (--dry-run): no se escribe nada' : 'Aplicando cambios'}...`);

  // Los indices (ej. el unico de trackingCode) tienen que existir antes de asignar codigos.
  if (!dryRun) await Promise.all([User.init(), Order.init(), OrderEvent.init()]);

  const hashed = await hashPlainTextPasswords();
  const activated = await markUsersActive();
  const codes = await assignTrackingCodes();
  const events = await backfillOrderCreatedEvents();

  console.log(`[migrate:stage0] Contrasenas ${dryRun ? 'a hashear' : 'hasheadas'}: ${hashed}`);
  console.log(`[migrate:stage0] Usuarios ${dryRun ? 'a marcar' : 'marcados'} como activos: ${activated}`);
  console.log(`[migrate:stage0] Pedidos ${dryRun ? 'a los que se asignaria' : 'con'} trackingCode: ${codes}`);
  console.log(`[migrate:stage0] Eventos order_created ${dryRun ? 'a crear' : 'creados'}: ${events}`);
} catch (error) {
  console.error(`[migrate:stage0] Error: ${error.message}`);
  exitCode = 1;
} finally {
  await mongoose.disconnect();
}
process.exit(exitCode);
