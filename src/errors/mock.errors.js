import ApiError from './ApiError.js';
import { ERROR_CODES } from './errorCodes.js';

/**
 * Cantidad de datos de prueba inválida: no numérica, negativa, o mal
 * formada en general (`count`, `users`, `orders`, `deliveries`).
 */
export class InvalidMockQuantityError extends ApiError {
  constructor(message, details) {
    super(ERROR_CODES.INVALID_MOCK_QUANTITY, message, details);
  }
}

/**
 * Falla inesperada mientras se insertaban datos de prueba en MongoDB
 * (conexión caída, timeout, error de escritura no controlado, etc.).
 * `mock.service.js` la usa para envolver cualquier error que no sea ya
 * un ApiError durante el seeding, en vez de dejar que un error crudo de
 * Mongoose/MongoDB llegue sin traducir al cliente.
 */
export class MockGenerationError extends ApiError {
  constructor(message, details) {
    super(ERROR_CODES.MOCK_GENERATION_FAILED, message, details);
  }
}
