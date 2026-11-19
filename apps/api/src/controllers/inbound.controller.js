import inboundService from '../services/inbound.service.js';
import integrationService from '../services/integration.service.js';
import config from '../config/env.config.js';

const publicOrder = (order) => ({
  trackingCode: order.trackingCode,
  status: order.status,
  externalId: order.source?.externalId ?? null,
  trackingUrl: config.notifications.trackingUrl ? `${config.notifications.trackingUrl}/seguimiento/${order.trackingCode}` : null,
});

export async function createOrder(req, res, next) {
  try {
    const { order, created } = await inboundService.createOrder(req.integration, req.body);
    res.status(created ? 201 : 200).json({ created, order: publicOrder(order) });
  } catch (error) {
    next(error);
  }
}

export async function woocommerce(req, res, next) {
  try {
    const integration = await integrationService.authenticateWooCommerce(
      req.params.integrationId,
      req.rawBody,
      req.get('x-wc-webhook-signature')
    );
    const result = await inboundService.createFromWooCommerce(integration, req.body);
    if (result.ignored) return res.json({ ignored: true });
    return res.status(result.created ? 201 : 200).json({ created: result.created, order: publicOrder(result.order) });
  } catch (error) {
    return next(error);
  }
}