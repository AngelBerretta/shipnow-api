import fs from 'fs/promises';
import logger from '../config/logger.config.js';

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
