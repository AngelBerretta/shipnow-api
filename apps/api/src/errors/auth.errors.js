import ApiError from './ApiError.js';
import { ERROR_CODES } from './errorCodes.js';

/** Falta el token, es invalido, o la cuenta ya no existe / esta desactivada (401). */
export class UnauthorizedError extends ApiError {
  constructor(message) {
    super(ERROR_CODES.UNAUTHORIZED, message);
  }
}

/** El access token (o el refresh token) vencio (401). El cliente debe renovarlo. */
export class TokenExpiredError extends ApiError {
  constructor(message) {
    super(ERROR_CODES.TOKEN_EXPIRED, message);
  }
}

/** Email o contrasena incorrectos. Mismo error para ambos casos, a proposito (401). */
export class InvalidCredentialsError extends ApiError {
  constructor() {
    super(ERROR_CODES.INVALID_CREDENTIALS);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor() {
    super(ERROR_CODES.TOO_MANY_REQUESTS);
  }
}