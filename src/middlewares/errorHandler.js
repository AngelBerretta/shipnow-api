import ApiError from '../errors/ApiError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';
import { ERROR_DICTIONARY } from '../errors/errorDictionary.js';

/**
 * Traduce errores "externos" que todavia no son un ApiError (errores
 * crudos de Mongoose, de body-parser, etc.) a un ApiError equivalente.
 *
 * Esto es lo que permite que la respuesta final sea SIEMPRE uniforme,
 * incluso para fallas que ningun Service detecto explicitamente (por
 * ejemplo, un ID con formato invalido en la URL nunca llega a evaluarse
 * en el Service: Mongoose tira el CastError antes).
 *
 * Devuelve `null` si no reconoce el error, para que el caller lo trate
 * como un 500 generico.
 */
function normalizeError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  // ID con formato invalido en un parametro de ruta (ej: /api/orders/123)
  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    return new ApiError(
      ERROR_CODES.INVALID_ID,
      `El identificador "${error.value}" no tiene un formato valido`,
      { field: error.path }
    );
  }

  // Validaciones de esquema de Mongoose (required, min, enum, etc.)
  // que no llegaron a chequearse antes en el Service.
  if (error.name === 'ValidationError' && error.errors) {
    const details = Object.values(error.errors).map((fieldError) => fieldError.message);
    return new ApiError(ERROR_CODES.VALIDATION_ERROR, 'Los datos enviados no son validos', details);
  }

  // Clave duplicada a nivel de base de datos (ej: email unico). Es una
  // red de seguridad: el Service ya valida esto antes de escribir, pero
  // una condicion de carrera podria dejar pasar dos altas simultaneas.
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0];
    if (field === 'email') {
      return new ApiError(ERROR_CODES.DUPLICATE_EMAIL, undefined, { email: error.keyValue.email });
    }
    return new ApiError(ERROR_CODES.DUPLICATE_KEY, `El valor de "${field}" ya existe`, { field });
  }

  // JSON malformado en el body de la peticion (lo detecta express.json()
  // antes de que la request llegue a ningun Router).
  if (error.type === 'entity.parse.failed') {
    return new ApiError(ERROR_CODES.MALFORMED_JSON);
  }

  return null;
}

/**
 * Middleware central de manejo de errores.
 *
 * Los Controllers delegan cualquier error con next(error) y los Services
 * son quienes deciden, lanzando un ApiError (o una subclase de dominio
 * de `src/errors/`), que fallo ocurrio. Esta es la UNICA funcion de todo
 * el proyecto que arma la respuesta HTTP de error: ninguna ruta ni
 * controller debe hacer `res.status(...).json({ error: ... })` a mano.
 *
 * Debe registrarse SIEMPRE al final de la cadena de middlewares en app.js.
 */
export function errorHandler(error, req, res, _next) {
  const normalized = normalizeError(error);

  if (!normalized) {
    // Error no reconocido: no se expone al cliente (podria filtrar
    // detalles internos), pero se loguea completo para poder debuggear.
    console.error('[errorHandler] Error no controlado:', error);
    const { statusCode, message } = ERROR_DICTIONARY[ERROR_CODES.INTERNAL_ERROR];
    return res.status(statusCode).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message },
    });
  }

  // Los errores 5xx tambien se loguean server-side (con stack), aunque
  // el cliente reciba el mensaje uniforme del diccionario.
  if (normalized.statusCode >= 500) {
    console.error('[errorHandler]', normalized);
  }

  const body = {
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
    },
  };
  if (normalized.details !== null && normalized.details !== undefined) {
    body.error.details = normalized.details;
  }

  res.status(normalized.statusCode).json(body);
}

/**
 * Middleware para rutas no encontradas (404). Usa la misma estructura
 * de respuesta que errorHandler para que TODOS los errores de la API
 * -incluido este- respondan con el mismo formato.
 */
export function notFoundHandler(req, res) {
  const { statusCode } = ERROR_DICTIONARY[ERROR_CODES.ROUTE_NOT_FOUND];
  res.status(statusCode).json({
    success: false,
    error: {
      code: ERROR_CODES.ROUTE_NOT_FOUND,
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
}
