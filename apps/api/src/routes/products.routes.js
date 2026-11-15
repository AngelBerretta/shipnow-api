import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.STORE, ROLES.CUSTOMER), productController.getAll);
router.get('/:pid', authenticate, authorize(ROLES.ADMIN, ROLES.STORE, ROLES.CUSTOMER), productController.getById);
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.STORE), productController.create);
router.put('/:pid', authenticate, authorize(ROLES.ADMIN, ROLES.STORE), productController.update);
router.delete('/:pid', authenticate, authorize(ROLES.ADMIN, ROLES.STORE), productController.remove);

export default router;
