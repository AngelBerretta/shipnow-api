import { NOTIFICATION_CHANNELS as CH, NOTIFICATION_STATUS } from '../constants/index.js';
import email from './email.channel.js';
import push from './push.channel.js';
import telegram from './telegram.channel.js';

/**
 * Registro de canales. Cada uno expone `isEnabled()` y `send(notification)`, que devuelve
 * `{ status: 'sent' | 'skipped' }` o lanza un ChannelError. Los tests reemplazan estos
 * métodos para no salir a internet.
 */
export const channels = {
  [CH.EMAIL]: email,
  [CH.PUSH]: push,
  [CH.TELEGRAM]: telegram,
  // La fila ya es el aviso: la lee la campana del panel.
  [CH.IN_APP]: { isEnabled: () => true, send: async () => ({ status: NOTIFICATION_STATUS.SENT }) },
};