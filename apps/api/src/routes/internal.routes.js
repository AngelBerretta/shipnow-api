import { Router } from 'express';
import * as internalController from '../controllers/internal.controller.js';
import { requireInternalSecret } from '../middlewares/internalAuth.js';

const router = Router();

// Sin JWT: los llama GitHub Actions con el secreto compartido.
router.use(requireInternalSecret);
router.post('/notifications/process', internalController.processNotifications);
router.post('/reports/weekly', internalController.weeklyReport);

export default router;