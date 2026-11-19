import { Router } from 'express';
import * as integrationsController from '../controllers/integrations.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));
router.get('/', integrationsController.list);
router.post('/', integrationsController.create);
router.patch('/:iid', integrationsController.update);
router.post('/:iid/rotate-key', integrationsController.rotateKey);
router.post('/:iid/rotate-secret', integrationsController.rotateSecret);
router.delete('/:iid', integrationsController.remove);

export default router;