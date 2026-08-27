/**
 * Punto de entrada único de la capa de errores.
 * El resto de la app (Services, middlewares) importa todo desde acá:
 *
 *   import { UserNotFoundError, ValidationError } from '../errors/index.js';
 *
 * en vez de conocer la ubicación de cada archivo individual.
 */
export { default as ApiError } from './ApiError.js';
export { ERROR_CODES } from './errorCodes.js';
export { ERROR_DICTIONARY } from './errorDictionary.js';

export {
  UserNotFoundError,
  OrderNotFoundError,
  DeliveryNotFoundError,
  ProductNotFoundError,
} from './notFound.errors.js';

export { default as ValidationError } from './ValidationError.js';
export { default as InvalidStatusError } from './InvalidStatusError.js';
export { default as InvalidRoleError } from './InvalidRoleError.js';
export { default as ForbiddenActionError } from './ForbiddenActionError.js';

export {
  DuplicateEmailError,
  OrderAlreadyProcessedError,
  OrderAlreadyDeliveredError,
  DeliveryAlreadyCompletedError,
} from './conflict.errors.js';

export { InvalidMockQuantityError, MockGenerationError } from './mock.errors.js';

export {
  FileRequiredError,
  InvalidFileTypeError,
  FileTooLargeError,
  InvalidDocumentTypeError,
  UnexpectedFileFieldError,
  FileUploadError,
} from './file.errors.js';
