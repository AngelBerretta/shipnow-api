import ApiError from './ApiError.js';
import { ERROR_CODES } from './errorCodes.js';

/**
 * Rol recibido que no pertenece al enum ROLES.
 */
class InvalidRoleError extends ApiError {
  constructor(role, allowedValues = []) {
    const message = `Rol invalido: "${role}". Valores permitidos: ${allowedValues.join(', ')}`;
    super(ERROR_CODES.INVALID_ROLE, message, { received: role, allowed: allowedValues });
  }
}

export default InvalidRoleError;
