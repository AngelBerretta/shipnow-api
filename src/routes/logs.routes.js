import { Router } from 'express';
import * as logController from '../controllers/log.controller.js';

const router = Router();

// Endpoint de testing interno: dispara los 6 niveles de log definidos
// (debug, http, info, warning, error, fatal) para verificar la
// configuracion de Winston. No representa una funcionalidad de negocio.
router.get('/test', logController.testLogger);

export default router;