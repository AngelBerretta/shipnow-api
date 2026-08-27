import { Router } from 'express';
import * as deliveryController from '../controllers/delivery.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import { deliveryProofUpload } from '../config/multer.config.js';

const router = Router();

router.get('/', deliveryController.getAll);
router.get('/:did', deliveryController.getById);
router.post('/', deliveryController.create);
router.patch('/:did/status', deliveryController.updateStatus);
router.delete('/:did', deliveryController.remove);

// Comprobante asociado a la entrega (foto, firma del cliente, etc).
// `deliveryProofUpload` (src/config/multer.config.js) procesa el
// multipart/form-data antes del controller.
router.post('/:did/proof', deliveryProofUpload, uploadController.uploadDeliveryProof);

export default router;
