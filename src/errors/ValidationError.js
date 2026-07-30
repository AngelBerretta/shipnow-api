import ApiError from './ApiError.js';
import { ERROR_CODES } from './errorCodes.js';

/**
 * Datos de entrada faltantes o inválidos (campos obligatorios, valores
 * negativos, formato incorrecto, etc.). Es el error "general" de 400
 * para reglas que no ameritan una clase propia.
 */
class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(ERROR_CODES.VALIDATION_ERROR, message, details);
  }
}

export default ValidationError;
