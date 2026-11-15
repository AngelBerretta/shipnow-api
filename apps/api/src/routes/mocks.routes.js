import { Router } from 'express';
import * as mockController from '../controllers/mock.controller.js';

const router = Router();

// Generan datos simulados en memoria: NO escriben en MongoDB.
router.get('/users', mockController.previewUsers);
router.get('/orders', mockController.previewOrders);
router.get('/deliveries', mockController.previewDeliveries);
router.get('/full', mockController.previewFull);

// Inserta registros de prueba reales en MongoDB de forma controlada.
router.post('/generate', mockController.seed);

export default router;
