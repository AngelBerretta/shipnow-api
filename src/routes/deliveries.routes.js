import { Router } from 'express';
import * as deliveryController from '../controllers/delivery.controller.js';

const router = Router();

router.get('/', deliveryController.getAll);
router.get('/:did', deliveryController.getById);
router.post('/', deliveryController.create);
router.patch('/:did/status', deliveryController.updateStatus);
router.delete('/:did', deliveryController.remove);

export default router;
