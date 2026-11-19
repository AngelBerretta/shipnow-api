import { Router } from 'express';
import * as inboundController from '../controllers/inbound.controller.js';
import { requireApiKey } from '../middlewares/apiKey.js';
import { inboundLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.use(inboundLimiter);
router.post('/orders', requireApiKey, inboundController.createOrder);
// WooCommerce no permite headers propios: se autentica con su firma HMAC (secreto = webhookSecret).
router.post('/woocommerce/:integrationId', inboundController.woocommerce);

export default router;