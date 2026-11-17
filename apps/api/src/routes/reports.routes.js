import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));
router.get('/overview', reportController.overview);
router.get('/export.csv', reportController.exportCsv);
router.get('/export.pdf', reportController.exportPdf);

export default router;