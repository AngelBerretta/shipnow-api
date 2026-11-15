import ApiError from './ApiError.js';
import { ERROR_CODES } from './errorCodes.js';

/**
 * La operación es válida en general, pero este actor/rol no tiene
 * permiso para realizarla (ej: un repartidor creando un pedido, un
 * alta pública de usuario admin).
 */
class ForbiddenActionError extends ApiError {
  constructor(message) {
    super(ERROR_CODES.FORBIDDEN_ACTION, message);
  }
}

export default ForbiddenActionError;
