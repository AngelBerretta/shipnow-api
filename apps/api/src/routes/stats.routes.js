import { Router } from 'express';
import * as statsController from '../controllers/stats.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// Metricas de toda la operacion: solo administradores.
router.get('/overview', authenticate, authorize(ROLES.ADMIN), statsController.overview);

export default router;
