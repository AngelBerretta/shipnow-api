import { ERROR_DICTIONARY } from './errorDictionary.js';

/**
 * Error base de la aplicación.
 *
 * Los Services son los únicos que detectan violaciones de reglas de
 * negocio, y lo hacen lanzando instancias de ApiError (o de alguna de
 * sus subclases en este mismo directorio). Los Controllers nunca la
 * inspeccionan: solo hacen `next(error)`. El único que la lee es el
 * middleware global `errorHandler`.
 *
 * A diferencia de la versión anterior (`new ApiError(statusCode,
 * message)`), ahora el `statusCode` y el mensaje por defecto salen del
 * `ERROR_DICTIONARY` a partir de un `code`. Esto evita que cada Service
 * tenga que "saber" qué status HTTP le corresponde a cada caso: solo
 * necesita elegir el código de error correcto (o, mejor, lanzar la
 * subclase de dominio correspondiente).
 */
class ApiError extends Error {
  /**
   * @param {string} code - Código del diccionario (ver `errorCodes.js`).
   * @param {string} [message] - Mensaje puntual para este caso. Si se
   *   omite, se usa el mensaje por defecto del diccionario.
   * @param {*} [details] - Información adicional para el cliente
   *   (ej: lista de campos inválidos). Opcional.
   */
  constructor(code, message, details = null) {
    const entry = ERROR_DICTIONARY[code];

    if (!entry) {
      // Un código que no está en el diccionario es un error de
      // programación (typo, código no registrado), no un error de
      // negocio: falla fuerte y rápido en vez de esconderlo detrás de
      // un 500 genérico silencioso.
      throw new Error(`[ApiError] Codigo de error desconocido: "${code}". Registralo en errorDictionary.js`);
    }

    super(message || entry.message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = entry.statusCode;
    this.details = details;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

export default ApiError;
