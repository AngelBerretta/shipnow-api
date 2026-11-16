import userRepository from '../repositories/user.repository.js';
import deliveryRepository from '../repositories/delivery.repository.js';
import { persistUpload, discardUpload, USER_DOCUMENTS_FOLDER, DELIVERY_PROOFS_FOLDER } from '../utils/fileStorage.js';
import { DOCUMENT_TYPES } from '../constants/index.js';
import logger from '../config/logger.config.js';
import {
  FileRequiredError,
  ValidationError,
  InvalidDocumentTypeError,
  UserNotFoundError,
  DeliveryNotFoundError,
} from '../errors/index.js';
import { assertAllowed, canModifyDelivery } from '../policies/access.policy.js';

/**
 * Arma el subdocumento de metadatos. `stored` es lo que devolvio persistUpload:
 * en local la ruta relativa en disco, en R2 la clave del objeto en el bucket.
 */
function buildFileMetadata(file, documentType, stored) {
  return {
    originalName: file.originalname,
    storedName: stored.storedName,
    path: stored.path,
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

    let stored = null;
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

      stored = await persistUpload(file, USER_DOCUMENTS_FOLDER);
      const metadata = buildFileMetadata(file, documentType, stored);
      const updatedUser = await userRepository.addDocument(userId, metadata);

      logger.info(`Documento "${metadata.originalName}" (${documentType}) cargado para el usuario ${userId}`);

      return updatedUser;
    } catch (error) {
      await discardUpload(file, stored);
      logger.warning(`Carga de documento descartada para el usuario ${userId}: ${error.message}`);
      throw error;
    }
  }

  async uploadDeliveryProof(deliveryId, file, documentType, actor) {
    if (!file) {
      throw new FileRequiredError('El archivo es obligatorio (campo "file")');
    }

    const resolvedType = documentType || DOCUMENT_TYPES.DELIVERY_PROOF;
    let stored = null;

    try {
      if (!Object.values(DOCUMENT_TYPES).includes(resolvedType)) {
        throw new InvalidDocumentTypeError(resolvedType, Object.values(DOCUMENT_TYPES));
      }

      const delivery = await deliveryRepository.findById(deliveryId);
      if (!delivery) {
        throw new DeliveryNotFoundError();
      }
      assertAllowed(!actor || canModifyDelivery(actor, delivery), 'Solo podes subir comprobantes de tus propias entregas');

      stored = await persistUpload(file, DELIVERY_PROOFS_FOLDER);
      const metadata = buildFileMetadata(file, resolvedType, stored);
      const updatedDelivery = await deliveryRepository.addDocument(deliveryId, metadata);

      logger.info(`Comprobante "${metadata.originalName}" asociado a la entrega ${deliveryId}`);

      return updatedDelivery;
    } catch (error) {
      await discardUpload(file, stored);
      logger.warning(`Carga de comprobante descartada para la entrega ${deliveryId}: ${error.message}`);
      throw error;
    }
  }
}  

export default new UploadService();
