import ApiError from '../errors/ApiError.js';
import { ERROR_CODES } from '../errors/errorCodes.js';
import { ERROR_DICTIONARY } from '../errors/errorDictionary.js';
import { FileTooLargeError, UnexpectedFileFieldError, FileUploadError } from '../errors/file.errors.js';
import { UPLOAD_LIMITS } from '../config/multer.config.js';
import logger from '../config/logger.config.js';

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

  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    return new ApiError(
      ERROR_CODES.INVALID_ID,
      `El identificador "${error.value}" no tiene un formato valido`,
      { field: error.path }
    );
  }

  if (error.name === 'ValidationError' && error.errors) {
    const details = Object.values(error.errors).map((fieldError) => fieldError.message);
    return new ApiError(ERROR_CODES.VALIDATION_ERROR, 'Los datos enviados no son validos', details);
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0];
    if (field === 'email') {
      return new ApiError(ERROR_CODES.DUPLICATE_EMAIL, undefined, { email: error.keyValue.email });
    }
    return new ApiError(ERROR_CODES.DUPLICATE_KEY, `El valor de "${field}" ya existe`, { field });
  }

  if (error.type === 'entity.parse.failed') {
    return new ApiError(ERROR_CODES.MALFORMED_JSON);
  }

  // Errores crudos de Multer (src/config/multer.config.js): igual que el
  // CastError de Mongoose de mas arriba, nunca llegan a evaluarse en un
  // Service porque el middleware de Multer falla antes, en la propia
  // ruta. `fileFilter` (tipo de archivo no permitido) ya lanza un
  // ApiError propio y no pasa por aca; esto cubre los limites que
  // Multer valida por su cuenta mientras parsea el form-data.
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new FileTooLargeError(UPLOAD_LIMITS.maxFileSizeBytes);
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return new UnexpectedFileFieldError(error.field);
    }
    return new FileUploadError(`Error al procesar el archivo subido: ${error.message}`, { multerCode: error.code });
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
 * Ademas de responder al cliente, registra cada error con Winston segun
 * su severidad real (ver logger.config.js):
 * - Errores de negocio (4xx): nivel "warning".
 * - Errores de servidor (5xx), reconocidos o no: nivel "error".
 * El logger complementa este manejo de errores, no lo reemplaza: la
 * respuesta al cliente nunca depende de si el log se pudo escribir o no.
 *
 * Debe registrarse SIEMPRE al final de la cadena de middlewares en app.js.
 */
export function errorHandler(error, req, res, _next) {
  const normalized = normalizeError(error);
  const context = `${req.method} ${req.originalUrl}`;

  if (!normalized) {
    // Error no reconocido: no se expone al cliente (podria filtrar
    // detalles internos), pero se loguea completo -incluido el stack-
    // para poder debuggear. Nivel "error": es un bug no anticipado,
    // pero el servidor sigue funcionando y ya esta respondiendo.
    logger.error(`Error no controlado en ${context}: ${error.message}`, {
      stack: error.stack,
    });
    const { statusCode, message } = ERROR_DICTIONARY[ERROR_CODES.INTERNAL_ERROR];
    return res.status(statusCode).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message },
    });
  }

  // Los errores 5xx se loguean como "error" (con stack), aunque el
  // cliente reciba el mensaje uniforme del diccionario. Los errores de
  // negocio (4xx) se loguean como "warning": son parte del uso normal
  // de la API, no fallas del servidor, pero igual vale la pena dejar
  // rastro para poder investigar patrones (ej: muchos 404 seguidos a
  // una misma ruta, muchos intentos de crear el mismo email duplicado).
  const logMessage = `${context} -> ${normalized.statusCode} ${normalized.code}: ${normalized.message}`;

  if (normalized.statusCode >= 500) {
    logger.error(logMessage, { stack: normalized.stack });
  } else {
    logger.warning(logMessage);
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
  logger.warning(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(statusCode).json({
    success: false,
    error: {
      code: ERROR_CODES.ROUTE_NOT_FOUND,
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
}