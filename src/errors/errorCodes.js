/**
 * Códigos de error del dominio de ShipNow.
 *
 * Son la "clave" que conecta un ApiError con su entrada en
 * `errorDictionary.js` (status code + mensaje por defecto). Ningún otro
 * archivo debería escribir un string de error a mano: siempre se usa una
 * de estas constantes, igual que ya se hace con ROLES/ORDER_STATUS/etc.
 * en `constants/index.js`.
 */
export const ERROR_CODES = Object.freeze({
  // Errores genéricos de validación / entrada del cliente (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_STATUS: 'INVALID_STATUS',
  INVALID_ROLE: 'INVALID_ROLE',
  INVALID_ID: 'INVALID_ID',
  MALFORMED_JSON: 'MALFORMED_JSON',

  // Permisos (403)
  FORBIDDEN_ACTION: 'FORBIDDEN_ACTION',

  // Recurso inexistente (404)
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  DELIVERY_NOT_FOUND: 'DELIVERY_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',

  // Conflictos de estado / unicidad (409)
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  DUPLICATE_KEY: 'DUPLICATE_KEY',
  ORDER_ALREADY_PROCESSED: 'ORDER_ALREADY_PROCESSED',
  ORDER_ALREADY_DELIVERED: 'ORDER_ALREADY_DELIVERED',
  DELIVERY_ALREADY_COMPLETED: 'DELIVERY_ALREADY_COMPLETED',

  // Módulo de mocks
  INVALID_MOCK_QUANTITY: 'INVALID_MOCK_QUANTITY',
  MOCK_GENERATION_FAILED: 'MOCK_GENERATION_FAILED',

  // Módulo de carga de archivos (Multer) (400)
  FILE_REQUIRED: 'FILE_REQUIRED',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_DOCUMENT_TYPE: 'INVALID_DOCUMENT_TYPE',
  UNEXPECTED_FILE_FIELD: 'UNEXPECTED_FILE_FIELD',

  // Fallback (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
});
