import ApiError from './ApiError.js';
import { ERROR_CODES } from './errorCodes.js';

/**
 * Errores del módulo de carga de archivos (Multer).
 *
 * Cubren dos capas distintas a propósito:
 * - Fallas "mecánicas" del archivo en sí (falta, tipo no permitido,
 *   demasiado grande, campo del form-data equivocado): las detecta
 *   Multer (`multer.config.js`) antes de que la petición llegue a
 *   ningún Controller.
 * - Validación de negocio (tipo de documento inválido, entidad
 *   destino inexistente): la detecta `upload.service.js`, igual que
 *   cualquier otra regla de negocio del resto de la app.
 *
 * Ambas terminan como subclases de `ApiError` para que la respuesta al
 * cliente sea siempre la misma forma, sin importar en qué capa se
 * originó el problema.
 */

/**
 * No se recibió ningún archivo en el campo esperado del form-data.
 * A diferencia del resto de estos errores, Multer no la detecta por sí
 * solo (un archivo "faltante" simplemente no llena `req.file`): la
 * lanza `upload.service.js` explícitamente.
 */
export class FileRequiredError extends ApiError {
  constructor(message) {
    super(ERROR_CODES.FILE_REQUIRED, message);
  }
}

/**
 * El archivo recibido no tiene un tipo MIME permitido. La lanza el
 * `fileFilter` de Multer, antes de que el archivo termine de guardarse
 * en disco.
 */
export class InvalidFileTypeError extends ApiError {
  constructor(receivedMimeType, allowedMimeTypes = []) {
    const message = `Tipo de archivo no permitido: "${receivedMimeType}". Tipos permitidos: ${allowedMimeTypes.join(', ')}`;
    super(ERROR_CODES.INVALID_FILE_TYPE, message, { received: receivedMimeType, allowed: allowedMimeTypes });
  }
}

/**
 * El archivo supera el tamaño máximo configurado en Multer
 * (`UPLOAD_LIMITS.maxFileSizeBytes`). Traducida en `errorHandler.js` a
 * partir del `MulterError` crudo (código `LIMIT_FILE_SIZE`).
 */
export class FileTooLargeError extends ApiError {
  constructor(maxSizeBytes) {
    const maxSizeMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    super(ERROR_CODES.FILE_TOO_LARGE, `El archivo supera el tamaño maximo permitido (${maxSizeMb}MB)`, {
      maxSizeBytes,
    });
  }
}

/**
 * El `documentType` recibido no pertenece a `DOCUMENT_TYPES`. La lanza
 * `upload.service.js` (es una regla de negocio, no algo que Multer
 * pueda validar).
 */
export class InvalidDocumentTypeError extends ApiError {
  constructor(received, allowedValues = []) {
    const message = `Tipo de documento invalido: "${received}". Valores permitidos: ${allowedValues.join(', ')}`;
    super(ERROR_CODES.INVALID_DOCUMENT_TYPE, message, { received, allowed: allowedValues });
  }
}

/**
 * El archivo llegó en un campo del form-data distinto al que espera el
 * endpoint (ej. `foto` en vez de `file`). Traducida en `errorHandler.js`
 * a partir del `MulterError` crudo (código `LIMIT_UNEXPECTED_FILE`).
 */
export class UnexpectedFileFieldError extends ApiError {
  constructor(expectedField = 'file') {
    super(ERROR_CODES.UNEXPECTED_FILE_FIELD, `El archivo debe enviarse en el campo "${expectedField}"`, {
      expectedField,
    });
  }
}

/**
 * Fallback para cualquier otro `MulterError` no traducido a un caso
 * específico de arriba (ej. límites de cantidad de partes del
 * form-data), o para una falla inesperada al escribir el archivo en
 * disco.
 */
export class FileUploadError extends ApiError {
  constructor(message, details) {
    super(ERROR_CODES.FILE_UPLOAD_FAILED, message, details);
  }
}
