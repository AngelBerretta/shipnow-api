import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Todos los roles autenticados: el Service limita que ve cada uno.
router.get('/', authenticate, orderController.getAll);
router.get('/:oid', authenticate, orderController.getById);
router.get('/:oid/events', authenticate, orderController.getEvents);
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.STORE, ROLES.CUSTOMER), orderController.create);
router.patch('/:oid/status', authenticate, authorize(ROLES.ADMIN), orderController.updateStatus);
router.delete('/:oid', authenticate, authorize(ROLES.ADMIN), orderController.remove);

export default router;
