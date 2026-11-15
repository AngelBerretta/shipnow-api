import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import { userDocumentUpload } from '../config/multer.config.js';
import { authenticate, authorize, authorizeSelfOr } from '../middlewares/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.get('/', authenticate, authorize(ROLES.ADMIN), userController.getAll);
router.get('/:uid', authenticate, authorizeSelfOr('uid', ROLES.ADMIN), userController.getById);
router.post('/', authenticate, authorize(ROLES.ADMIN), userController.create);
router.delete('/:uid', authenticate, authorize(ROLES.ADMIN), userController.remove);

// authenticate/authorize van ANTES de Multer: si no hay permiso, el archivo ni se escribe.
router.post('/:uid/documents', authenticate, authorizeSelfOr('uid', ROLES.ADMIN), userDocumentUpload, uploadController.uploadUserDocument);

export default router;
