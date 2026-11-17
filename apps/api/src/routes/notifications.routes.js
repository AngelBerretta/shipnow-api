import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Cualquier rol autenticado: cada uno solo ve y modifica lo suyo.
router.use(authenticate);
router.get('/', notificationController.list);
router.get('/unread-count', notificationController.unreadCount);
router.post('/read', notificationController.markRead);
router.get('/push/public-key', notificationController.pushPublicKey);
router.post('/push/subscribe', notificationController.pushSubscribe);
router.delete('/push/subscribe', notificationController.pushUnsubscribe);

export default router;