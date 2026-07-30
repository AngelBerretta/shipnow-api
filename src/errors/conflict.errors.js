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
