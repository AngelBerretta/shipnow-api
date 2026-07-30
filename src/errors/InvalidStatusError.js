import ApiError from './ApiError.js';
import { ERROR_CODES } from './errorCodes.js';

/**
 * Estado recibido (de un pedido, una entrega, etc.) que no pertenece al
 * enum de estados válidos para esa entidad. Guarda el valor recibido y
 * los valores permitidos en `details`, para que el cliente sepa
 * exactamente qué mandar.
 */
class InvalidStatusError extends ApiError {
  constructor(status, allowedValues = []) {
    const message = `Estado invalido: "${status}". Valores permitidos: ${allowedValues.join(', ')}`;
    super(ERROR_CODES.INVALID_STATUS, message, { received: status, allowed: allowedValues });
  }
}

export default InvalidStatusError;
