/**
 * Error de aplicacion con codigo HTTP asociado.
 * Los Services lanzan instancias de esta clase cuando detectan
 * una violacion de regla de negocio (no encontrado, conflicto, etc.).
 * Los Controllers solo necesitan leer `statusCode` y `message`.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export default ApiError;
