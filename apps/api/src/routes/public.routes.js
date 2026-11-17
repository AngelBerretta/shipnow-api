import { Router } from 'express';
import * as publicController from '../controllers/public.controller.js';
import { trackingLimiter, trackingMissLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Sin autenticación a propósito: es el portal de clientes.
router.get('/tracking/:code', trackingMissLimiter, trackingLimiter, publicController.getTracking);

export default router;