import { Router } from 'express';
import * as deliveryController from '../controllers/delivery.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import { deliveryProofUpload } from '../config/multer.config.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.get('/', authenticate, deliveryController.getAll);
router.get('/:did', authenticate, deliveryController.getById);
router.post('/', authenticate, authorize(ROLES.ADMIN), deliveryController.create);
router.patch('/:did/status', authenticate, authorize(ROLES.ADMIN, ROLES.DRIVER), deliveryController.updateStatus);
router.delete('/:did', authenticate, authorize(ROLES.ADMIN), deliveryController.remove);
router.post('/:did/proof', authenticate, authorize(ROLES.ADMIN, ROLES.DRIVER), deliveryProofUpload, uploadController.uploadDeliveryProof);

export default router;
