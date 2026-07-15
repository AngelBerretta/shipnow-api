import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';

const router = Router();

router.get('/', orderController.getAll);
router.get('/:oid', orderController.getById);
router.post('/', orderController.create);
router.patch('/:oid/status', orderController.updateStatus);
router.delete('/:oid', orderController.remove);

export default router;
