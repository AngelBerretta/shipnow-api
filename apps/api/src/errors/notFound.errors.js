import ApiError from './ApiError.js';
import { ERROR_CODES } from './errorCodes.js';

/**
 * Errores "recurso inexistente" (404), uno por entidad del dominio.
 * Reemplazan al genérico `new ApiError(404, '... no encontrado')` que
 * se repetía en cada Service.
 */

export class UserNotFoundError extends ApiError {
  constructor(message) {
    super(ERROR_CODES.USER_NOT_FOUND, message);
  }
}

export class OrderNotFoundError extends ApiError {
  constructor(message) {
    super(ERROR_CODES.ORDER_NOT_FOUND, message);
  }
}

export class DeliveryNotFoundError extends ApiError {
  constructor(message) {
    super(ERROR_CODES.DELIVERY_NOT_FOUND, message);
  }
}

export class ProductNotFoundError extends ApiError {
  constructor(message) {
    super(ERROR_CODES.PRODUCT_NOT_FOUND, message);
  }
}
