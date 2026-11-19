import { createHmac } from 'node:crypto';
import config from '../config/env.config.js';
import { NOTIFICATION_STATUS } from '../constants/index.js';
import integrationRepository from '../repositories/integration.repository.js';
import { ChannelError, retryableStatus } from './ChannelError.js';

/**
 * Webhook saliente firmado. Firma = HMAC-SHA256(secreto, `${t}.${cuerpo}`) en hexa, header
 * `X-Ruvika-Signature: t=<unix>,v1=<firma>`. El receptor debe validar la firma y rechazar `t` viejos.
 * Se lee la integración al enviar: así una rotación de secreto aplica también a los reintentos.
 */
export default {
  isEnabled: () => config.integrations.webhooksEnabled,

  async send(notification) {
    const { integration: integrationId, event, payload } = notification.data ?? {};
    const integration = integrationId ? await integrationRepository.findByIdWithSecret(integrationId) : null;
    if (!integration || !integration.isActive || !integration.webhookUrl) {
      return { status: NOTIFICATION_STATUS.SKIPPED, reason: 'integración inactiva o sin URL' };
    }

    const body = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', integration.webhookSecret).update(`${timestamp}.${body}`).digest('hex');

    let response;
    try {
      response = await fetch(integration.webhookUrl, {
        method: 'POST',
        redirect: 'manual', // no seguir redirecciones (evita saltar hacia la red interna)
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Ruvika-Webhooks/1.0',
          'X-Ruvika-Event': event,
          'X-Ruvika-Delivery': String(notification._id),
          'X-Ruvika-Signature': `t=${timestamp},v1=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(config.integrations.webhookTimeoutMs),
      });
    } catch (error) {
      throw new ChannelError(`Webhook no respondió: ${error.message}`);
    }

    if (!response.ok) {
      throw new ChannelError(`Webhook ${response.status}`, { retryable: response.status === 408 || retryableStatus(response.status) });
    }
    return { status: NOTIFICATION_STATUS.SENT };
  },
};