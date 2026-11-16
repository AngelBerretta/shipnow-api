import fs from 'fs/promises';
import logger from '../config/logger.config.js';
import path from 'path';
import { randomBytes } from 'node:crypto';
import config from '../config/env.config.js';
import { FileUploadError } from '../errors/file.errors.js';

/**
 * fileStorage.js
 *
 * Multer guarda el archivo en disco ANTES de que `upload.service.js`
 * pueda validar reglas de negocio (tipo de documento inválido, entidad
 * destino inexistente). Si esa validación posterior falla, el archivo
 * ya escrito quedaría "huérfano" en `uploads/` sin ningún metadato
 * asociado en Mongo — exactamente lo que las pautas del ticket piden
 * evitar. `removeUploadedFile` es lo que usa `upload.service.js` en
 * esos casos para deshacer la escritura en disco antes de propagar el
 * error al cliente.
 */
export async function removeUploadedFile(filePath) {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    // No relanza: si no se pudo borrar el archivo huerfano, el cliente
    // igual debe recibir el error de negocio original, no un 500 por un
    // problema de limpieza. Queda registrado para poder limpiarlo a mano.
    logger.error(`No se pudo eliminar el archivo huerfano "${filePath}": ${error.message}`, {
      stack: error.stack,
    });
  }
}

export const USER_DOCUMENTS_FOLDER = 'users';
export const DELIVERY_PROOFS_FOLDER = 'deliveries';

let s3Promise = null;

/** Cliente S3 apuntando a R2. Se carga recien al primer uso: en local ni se importa el SDK. */
function getS3() {
  s3Promise ??= import('@aws-sdk/client-s3').then((sdk) => ({
    sdk,
    client: new sdk.S3Client({
      region: 'auto',
      endpoint: `https://${config.storage.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.storage.r2.accessKeyId,
        secretAccessKey: config.storage.r2.secretAccessKey,
      },
      // R2 no soporta los checksums por defecto de las versiones nuevas del SDK.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    }),
  }));
  return s3Promise;
}

/**
 * Deja el archivo subido en su lugar definitivo y devuelve `{ storedName, path }`
 * para los metadatos. En local Multer ya lo guardo en disco; en R2 se sube
 * recien ahora (despues de validar), asi un rechazo de negocio no deja basura.
 */
export async function persistUpload(file, folder) {
  if (config.storage.driver === 'local') {
    return { storedName: file.filename, path: path.relative(process.cwd(), file.path) };
  }

  const extension = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const key = `${folder}/${Date.now()}-${randomBytes(6).toString('hex')}${extension}`;
  const { sdk, client } = await getS3();
  try {
    await client.send(
      new sdk.PutObjectCommand({
        Bucket: config.storage.r2.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );
  } catch (error) {
    logger.error(`No se pudo subir "${key}" a R2: ${error.message}`, { stack: error.stack });
    throw new FileUploadError('No se pudo guardar el archivo. Intenta nuevamente.');
  }
  return { storedName: path.basename(key), path: key };
}

/** Deshace una carga cuando falla algo despues de recibir el archivo (disco local o R2). */
export async function discardUpload(file, stored) {
  if (config.storage.driver === 'local') {
    return removeUploadedFile(file.path);
  }
  if (!stored) return undefined; // en R2 todavia no se habia subido nada

  try {
    const { sdk, client } = await getS3();
    await client.send(new sdk.DeleteObjectCommand({ Bucket: config.storage.r2.bucket, Key: stored.path }));
  } catch (error) {
    logger.error(`No se pudo eliminar "${stored.path}" de R2: ${error.message}`, { stack: error.stack });
  }
  return undefined;
}
