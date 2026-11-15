import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import { userDocumentUpload } from '../config/multer.config.js';

const router = Router();

router.get('/', userController.getAll);
router.get('/:uid', userController.getById);
router.post('/', userController.create);
router.delete('/:uid', userController.remove);

// Carga de documentos del usuario (DNI, licencia, etc). `userDocumentUpload`
// (src/config/multer.config.js) procesa el multipart/form-data ANTES del
// controller: si falla (tipo no permitido, tamaño excedido, campo
// incorrecto), nunca llega a uploadController.
router.post('/:uid/documents', userDocumentUpload, uploadController.uploadUserDocument);

export default router;
