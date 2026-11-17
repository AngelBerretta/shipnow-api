import config from '../config/env.config.js';
import { NOTIFICATION_STATUS } from '../constants/index.js';
import { ChannelError, retryableStatus } from './ChannelError.js';

/** Email transaccional con Resend (API REST, sin SDK). Plan gratis: 100 emails por día. */
export default {
  isEnabled: () => config.notifications.email.enabled,

  async send(notification) {
    const { to, html } = notification.data ?? {};
    if (!to) return { status: NOTIFICATION_STATUS.SKIPPED, reason: 'sin destinatario' };

    let response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.notifications.email.apiKey}`,
          'Content-Type': 'application/json',
          // Un reintento tras un timeout no duplica el email.
          'Idempotency-Key': String(notification._id),
        },
        body: JSON.stringify({ from: config.notifications.email.from, to: [to], subject: notification.title, text: notification.body, html }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new ChannelError(`Resend no respondió: ${error.message}`);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new ChannelError(`Resend ${response.status}: ${detail.slice(0, 200)}`, { retryable: retryableStatus(response.status) });
    }
    return { status: NOTIFICATION_STATUS.SENT };
  },
};