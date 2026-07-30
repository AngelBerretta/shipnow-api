/**
 * Middleware central de manejo de errores.
 * Los Controllers delegan cualquier error con next(error) y este
 * middleware decide el status code y el formato de respuesta.
 * Debe registrarse SIEMPRE al final de la cadena de middlewares en app.js.
 */
export function errorHandler(error, req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Error interno del servidor';

  if (statusCode === 500) {
    console.error(error);
  }

  res.status(statusCode).json({ error: message });
}

/**
 * Middleware para rutas no encontradas (404).
 */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}
