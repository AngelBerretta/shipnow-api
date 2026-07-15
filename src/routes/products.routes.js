import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';

const router = Router();

router.get('/', productController.getAll);
router.get('/:pid', productController.getById);
router.post('/', productController.create);
router.put('/:pid', productController.update);
router.delete('/:pid', productController.remove);

export default router;
