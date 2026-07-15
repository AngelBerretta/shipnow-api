import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';

const router = Router();

router.get('/', userController.getAll);
router.get('/:uid', userController.getById);
router.post('/', userController.create);
router.delete('/:uid', userController.remove);

export default router;
