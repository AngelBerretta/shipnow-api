import { ERROR_CODES } from './errorCodes.js';

/**
 * Diccionario de errores de la aplicación.
 *
 * Única fuente de verdad sobre "qué status HTTP y qué mensaje le
 * corresponde a cada código de error". `ApiError` lee de acá al
 * construirse, y el middleware global (`errorHandler`) también lo usa
 * para los pocos casos que resuelve directamente (404 de ruta, 500
 * genérico), sin duplicar los valores en otro lugar.
 *
 * Agregar un caso de error nuevo al dominio implica: (1) sumar la
 * constante en `errorCodes.js` y (2) sumar su entrada acá. El resto de
 * la app nunca vuelve a escribir un statusCode ni un mensaje a mano.
 */
export const ERROR_DICTIONARY = Object.freeze({
  [ERROR_CODES.VALIDATION_ERROR]: {
    statusCode: 400,
    message: 'Los datos enviados no son validos',
  },
  [ERROR_CODES.INVALID_STATUS]: {
    statusCode: 400,
    message: 'El estado indicado no es valido',
  },
  [ERROR_CODES.INVALID_ROLE]: {
    statusCode: 400,
    message: 'El rol indicado no es valido',
  },
  [ERROR_CODES.INVALID_ID]: {
    statusCode: 400,
    message: 'El identificador indicado no tiene un formato valido',
  },
  [ERROR_CODES.MALFORMED_JSON]: {
    statusCode: 400,
    message: 'El cuerpo de la peticion no es un JSON valido',
  },

  [ERROR_CODES.FORBIDDEN_ACTION]: {
    statusCode: 403,
    message: 'No tenes permisos para realizar esta accion',
  },

  [ERROR_CODES.USER_NOT_FOUND]: {
    statusCode: 404,
    message: 'Usuario no encontrado',
  },
  [ERROR_CODES.ORDER_NOT_FOUND]: {
    statusCode: 404,
    message: 'Pedido no encontrado',
  },
  [ERROR_CODES.DELIVERY_NOT_FOUND]: {
    statusCode: 404,
    message: 'Entrega no encontrada',
  },
  [ERROR_CODES.PRODUCT_NOT_FOUND]: {
    statusCode: 404,
    message: 'Producto no encontrado',
  },
  [ERROR_CODES.ROUTE_NOT_FOUND]: {
    statusCode: 404,
    message: 'Ruta no encontrada',
  },

  [ERROR_CODES.DUPLICATE_EMAIL]: {
    statusCode: 409,
    message: 'El email ya esta registrado',
  },
  [ERROR_CODES.DUPLICATE_KEY]: {
    statusCode: 409,
    message: 'El recurso ya existe',
  },
  [ERROR_CODES.ORDER_ALREADY_PROCESSED]: {
    statusCode: 409,
    message: 'El pedido ya fue asignado o procesado',
  },
  [ERROR_CODES.ORDER_ALREADY_DELIVERED]: {
    statusCode: 409,
    message: 'El pedido ya fue entregado',
  },
  [ERROR_CODES.DELIVERY_ALREADY_COMPLETED]: {
    statusCode: 409,
    message: 'La entrega ya fue completada',
  },

  [ERROR_CODES.INVALID_MOCK_QUANTITY]: {
    statusCode: 400,
    message: 'La cantidad de datos de prueba solicitada no es valida',
  },
  [ERROR_CODES.MOCK_GENERATION_FAILED]: {
    statusCode: 500,
    message: 'Ocurrio un error al cargar los datos de prueba en MongoDB',
  },

  [ERROR_CODES.INTERNAL_ERROR]: {
    statusCode: 500,
    message: 'Error interno del servidor',
  },
});
