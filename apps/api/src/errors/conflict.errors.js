import ApiError from './ApiError.js';
import { ERROR_CODES } from './errorCodes.js';

/**
 * Errores de conflicto (409): el recurso existe y la petición es
 * válida en sí misma, pero choca con el estado actual de los datos.
 */

export class DuplicateEmailError extends ApiError {
  constructor(email) {
    super(ERROR_CODES.DUPLICATE_EMAIL, undefined, email ? { email } : null);
  }
}

export class OrderAlreadyProcessedError extends ApiError {
  constructor(currentStatus) {
    const message = `El pedido ya fue asignado o procesado (estado actual: ${currentStatus})`;
    super(ERROR_CODES.ORDER_ALREADY_PROCESSED, message, { currentStatus });
  }
}

export class OrderAlreadyDeliveredError extends ApiError {
  constructor() {
    super(ERROR_CODES.ORDER_ALREADY_DELIVERED);
  }
}

export class DeliveryAlreadyCompletedError extends ApiError {
  constructor() {
    super(ERROR_CODES.DELIVERY_ALREADY_COMPLETED);
  }
}

/**
 * El cambio de estado pedido no esta permitido por la maquina de
 * estados (ver `ORDER_TRANSITIONS` / `DELIVERY_TRANSITIONS` en
 * `@ruvika/shared`): un salto (created -> delivered), un retroceso, o
 * repetir el estado actual. `details` lleva `from`, `to` y `allowed`
 * para que el cliente sepa que puede hacer desde donde esta.
 */
export class InvalidStatusTransitionError extends ApiError {
  constructor(entity, from, to, allowedValues = []) {
    const allowedText = allowedValues.length > 0 ? allowedValues.join(', ') : 'ninguna (estado final)';
    const message = `Transicion de estado invalida para ${entity}: "${from}" -> "${to}". Permitidas desde "${from}": ${allowedText}`;
    super(ERROR_CODES.INVALID_STATUS_TRANSITION, message, { from, to, allowed: allowedValues });
  }
}

/**
 * Se intento cancelar un pedido que todavia tiene una entrega asociada.
 * Hay que eliminar la entrega primero (lo que devuelve el pedido a
 * `created`), para no dejar a un repartidor con una entrega de un
 * pedido cancelado.
 */
export class OrderHasActiveDeliveryError extends ApiError {
  constructor() {
    super(ERROR_CODES.ORDER_HAS_ACTIVE_DELIVERY);
  }
}
