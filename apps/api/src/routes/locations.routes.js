import { Router } from 'express';
import * as locationController from '../controllers/location.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.post('/me', authenticate, authorize(ROLES.DRIVER), locationController.postMine);
router.get('/live', authenticate, authorize(ROLES.ADMIN), locationController.live);
router.get('/deliveries/:did', authenticate, authorize(ROLES.ADMIN), locationController.trail);

export default router;