import config from '../config/env.config.js';
import { NOTIFICATION_STATUS } from '../constants/index.js';
import { ChannelError, retryableStatus } from './ChannelError.js';
import { escapeHtml } from './templates.js';

/** Avisos al chat de administración (un bot de Telegram, gratis). */
export default {
  isEnabled: () => config.notifications.telegram.enabled,

  async send(notification) {
    const { botToken, adminChatId } = config.notifications.telegram;
    const link = notification.data?.url;
    const text = [
      `<b>${escapeHtml(notification.title)}</b>`,
      escapeHtml(notification.body),
      link && `<a href="${escapeHtml(link)}">Abrir en el panel</a>`,
    ]
      .filter(Boolean)
      .join('\n');

    let response;
    try {
      response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: adminChatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      // El mensaje de error no incluye la URL (lleva el token del bot).
      throw new ChannelError(`Telegram no respondió: ${error.message}`);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new ChannelError(`Telegram ${response.status}: ${detail.slice(0, 200)}`, { retryable: retryableStatus(response.status) });
    }
    return { status: NOTIFICATION_STATUS.SENT };
  },
};