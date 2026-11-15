import { ROLES } from '../constants/index.js';
import { ForbiddenActionError } from '../errors/index.js';

/**
 * Reglas de "quien puede tocar que recurso". Funciones puras: reciben el
 * usuario autenticado (`actor`) y el recurso ya leido de la base.
 * Los Services las usan; los Controllers no las conocen.
 */

/** _id como string, tanto si la referencia viene populada como si es un ObjectId. */
export const idOf = (ref) => (ref === null || ref === undefined ? null : String(ref._id ?? ref));

const isAdmin = (actor) => actor.role === ROLES.ADMIN;
const isSame = (actor, ref) => idOf(ref) === String(actor._id);

export function assertAllowed(condition, message = 'No tenes acceso a este recurso') {
  if (!condition) {
    throw new ForbiddenActionError(message);
  }
}

export function canAccessOrder(actor, order) {
  if (isAdmin(actor)) return true;
  switch (actor.role) {
    case ROLES.CUSTOMER:
      return isSame(actor, order.customer);
    case ROLES.STORE:
      return isSame(actor, order.store);
    case ROLES.DRIVER:
      return isSame(actor, order.delivery?.driver);
    default:
      return false;
  }
}

export function canAccessDelivery(actor, delivery) {
  if (isAdmin(actor)) return true;
  switch (actor.role) {
    case ROLES.DRIVER:
      return isSame(actor, delivery.driver);
    case ROLES.CUSTOMER:
      return isSame(actor, delivery.order?.customer);
    case ROLES.STORE:
      return isSame(actor, delivery.order?.store);
    default:
      return false;
  }
}

/** Avanzar el estado / subir comprobante: admin, o el repartidor asignado. */
export function canModifyDelivery(actor, delivery) {
  return isAdmin(actor) || (actor.role === ROLES.DRIVER && isSame(actor, delivery.driver));
}

export function canReadProduct(actor, product) {
  if (isAdmin(actor) || actor.role === ROLES.CUSTOMER) return true;
  return actor.role === ROLES.STORE && isSame(actor, product.owner);
}

export function canManageProduct(actor, product) {
  return isAdmin(actor) || (actor.role === ROLES.STORE && isSame(actor, product.owner));
}