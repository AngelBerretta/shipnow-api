import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { InvalidFileTypeError } from '../errors/file.errors.js';
import logger from './logger.config.js';

/**
 * multer.config.js
 *
 * Única configuración de Multer de todo el proyecto. Vive en
 * `src/config/`, junto al resto de la configuración de la app (env,
 * logger, swagger). Ningún router ni controller instancia Multer por
 * su cuenta: todos importan los middlewares ya armados desde acá.
 *
 * Decisión de diseño — destino FIJO por recurso, no dinámico por
 * `documentType`: el `destination` de `multer.diskStorage` se evalúa
 * mientras el form-data todavía se está parseando (streaming), así que
 * depender ahí de otro campo del body (`req.body.documentType`) es
 * frágil: solo funciona si ese campo llegó ANTES que el archivo en el
 * form-data, algo que el cliente podría mandar en cualquier orden. Para
 * evitar ese acoplamiento al orden de los campos, cada recurso tiene una
 * carpeta fija (`uploads/users/`, `uploads/deliveries/`) y el
 * `documentType` viaja solo como metadato en Mongo (ver
 * `fileMetadata.schema.js`), validado en la capa de Service.
 */

const UPLOADS_ROOT = path.resolve('uploads');
const USER_DOCUMENTS_DIR = path.join(UPLOADS_ROOT, 'users');
const DELIVERY_PROOFS_DIR = path.join(UPLOADS_ROOT, 'deliveries');

// Al igual que LOGS_DIR en logger.config.js: crea la estructura de
// carpetas al arrancar si todavia no existe, para que el primer POST
// no falle por una carpeta faltante.
[UPLOADS_ROOT, USER_DOCUMENTS_DIR, DELIVERY_PROOFS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/** Tamaño máximo por archivo. */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/** Tipos MIME aceptados en cualquiera de los dos endpoints de carga. */
const ALLOWED_MIME_TYPES = Object.freeze(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

/** Config expuesta hacia afuera (Swagger, errorHandler, tests). */
export const UPLOAD_LIMITS = Object.freeze({
  maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
});

/**
 * Arma un storage engine de disco para una carpeta de destino fija.
 * El nombre generado nunca reutiliza el nombre original (evita
 * colisiones y problemas de path traversal): timestamp + sufijo
 * aleatorio + extensión original.
 */
function buildDiskStorage(destinationDir) {
  return multer.diskStorage({
    destination(req, file, cb) {
      cb(null, destinationDir);
    },
    filename(req, file, cb) {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const extension = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${extension}`);
    },
  });
}

/**
 * Valida el tipo MIME del archivo. Al rechazarlo con un `ApiError`
 * (en vez de `false`), Multer lo propaga tal cual a `next(error)`, y
 * `errorHandler.js` lo reconoce directamente como `instanceof ApiError`
 * sin necesitar ningún caso especial para este error puntual.
 */
function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    logger.warning(
      `Intento de subir un archivo con tipo no permitido: "${file.mimetype}" (${file.originalname})`
    );
    return cb(new InvalidFileTypeError(file.mimetype, ALLOWED_MIME_TYPES));
  }
  return cb(null, true);
}

const baseOptions = {
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter,
};

/**
 * Middleware de carga para documentos de usuario
 * (POST /api/users/:uid/documents). Espera el archivo en el campo
 * "file"; cualquier otro nombre de campo dispara `LIMIT_UNEXPECTED_FILE`
 * (traducido por errorHandler.js a `UnexpectedFileFieldError`).
 */
export const userDocumentUpload = multer({
  storage: buildDiskStorage(USER_DOCUMENTS_DIR),
  ...baseOptions,
}).single('file');

/**
 * Middleware de carga para comprobantes de entrega
 * (POST /api/deliveries/:did/proof). Misma convención de campo ("file").
 */
export const deliveryProofUpload = multer({
  storage: buildDiskStorage(DELIVERY_PROOFS_DIR),
  ...baseOptions,
}).single('file');

export { UPLOADS_ROOT, USER_DOCUMENTS_DIR, DELIVERY_PROOFS_DIR };
