import path from 'path';
import userRepository from '../repositories/user.repository.js';
import deliveryRepository from '../repositories/delivery.repository.js';
import { removeUploadedFile } from '../utils/fileStorage.js';
import { DOCUMENT_TYPES } from '../constants/index.js';
import logger from '../config/logger.config.js';
import {
  FileRequiredError,
  ValidationError,
  InvalidDocumentTypeError,
  UserNotFoundError,
  DeliveryNotFoundError,
} from '../errors/index.js';

/**
 * Arma el subdocumento de metadatos a partir del objeto `file` que
 * Multer deja en `req.file`. Nunca se persiste el archivo en sí: solo
 * esta informacion (ver `fileMetadata.schema.js`).
 */
function buildFileMetadata(file, documentType) {
  return {
    originalName: file.originalname,
    storedName: file.filename,
    // Ruta relativa a la raiz del proyecto (no la ruta absoluta del
    // filesystem del servidor, que no le sirve de nada al cliente).
    path: path.relative(process.cwd(), file.path),
    mimeType: file.mimetype,
    size: file.size,
    documentType,
    uploadedAt: new Date(),
  };
}

class UploadService {
  /**
   * Documento de un usuario (DNI, licencia, comprobante de domicilio,
   * etc). A diferencia del comprobante de entrega, `documentType` es
   * obligatorio: es uno de los tres datos que el ticket pide recibir
   * (id de usuario, archivo, tipo de documento).
   */
  async uploadUserDocument(userId, file, documentType) {
    if (!file) {
      throw new FileRequiredError('El archivo es obligatorio (campo "file")');
    }

    try {
      if (!documentType) {
        throw new ValidationError('El tipo de documento es obligatorio');
      }
      if (!Object.values(DOCUMENT_TYPES).includes(documentType)) {
        throw new InvalidDocumentTypeError(documentType, Object.values(DOCUMENT_TYPES));
      }

      const user = await userRepository.findById(userId);
      if (!user) {
        throw new UserNotFoundError();
      }

      const metadata = buildFileMetadata(file, documentType);
      const updatedUser = await userRepository.addDocument(userId, metadata);

      logger.info(`Documento "${metadata.originalName}" (${documentType}) cargado para el usuario ${userId}`);

      return updatedUser;
    } catch (error) {
      // El archivo ya quedo escrito en disco por Multer antes de llegar
      // aca: si la validacion de negocio falla, se descarta para no
      // dejarlo aislado sin ninguna entidad asociada.
      await removeUploadedFile(file.path);
      logger.warning(`Carga de documento descartada para el usuario ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Comprobante asociado a una entrega (foto, firma del cliente, etc).
   * `documentType` es opcional: si no se envia, se asume
   * `DOCUMENT_TYPES.DELIVERY_PROOF`. Si se envia, igual debe pertenecer
   * al enum.
   */
  async uploadDeliveryProof(deliveryId, file, documentType) {
    if (!file) {
      throw new FileRequiredError('El archivo es obligatorio (campo "file")');
    }

    const resolvedType = documentType || DOCUMENT_TYPES.DELIVERY_PROOF;

    try {
      if (!Object.values(DOCUMENT_TYPES).includes(resolvedType)) {
        throw new InvalidDocumentTypeError(resolvedType, Object.values(DOCUMENT_TYPES));
      }

      const delivery = await deliveryRepository.findById(deliveryId);
      if (!delivery) {
        throw new DeliveryNotFoundError();
      }

      const metadata = buildFileMetadata(file, resolvedType);
      const updatedDelivery = await deliveryRepository.addDocument(deliveryId, metadata);

      logger.info(`Comprobante "${metadata.originalName}" asociado a la entrega ${deliveryId}`);

      return updatedDelivery;
    } catch (error) {
      await removeUploadedFile(file.path);
      logger.warning(`Carga de comprobante descartada para la entrega ${deliveryId}: ${error.message}`);
      throw error;
    }
  }
}

export default new UploadService();
