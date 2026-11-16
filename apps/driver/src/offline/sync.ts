import { api, ApiError } from '../lib/api';
import type { QueuedAction } from './db';
import { listPending, removeAction } from './queue';

// El servidor respondió y la acción ya no aplica (la entrega cambió, ya no existe, etc.):
// reintentar no sirve. Se descarta y se avisa al repartidor.
const DISCARD_STATUSES = new Set([400, 403, 404, 409]);

async function runAction(action: QueuedAction) {
  switch (action.type) {
    case 'status':
      await api(`/api/deliveries/${action.deliveryId}/status`, { method: 'PATCH', body: { status: action.status } });
      break;
    case 'proof': {
      const form = new FormData();
      form.append('file', action.blob, action.filename);
      await api(`/api/deliveries/${action.deliveryId}/proof`, { method: 'POST', form });
      break;
    }
    case 'availability':
      await api('/api/users/me/availability', { method: 'PATCH', body: { isAvailable: action.isAvailable } });
      break;
  }
}

export interface SyncResult {
  sent: number;
  dropped: number;
  /** Se cortó por falta de red, error del servidor o sesión vencida: quedan acciones para reintentar. */
  blocked: boolean;
}

let running: Promise<SyncResult> | null = null;

/** Envía la cola en orden. Si ya hay un envío en curso, comparte esa misma promesa. */
export function syncQueue(userId: string): Promise<SyncResult> {
  running ??= doSync(userId).finally(() => {
    running = null;
  });
  return running;
}

async function doSync(userId: string): Promise<SyncResult> {
  const result: SyncResult = { sent: 0, dropped: 0, blocked: false };

  for (const action of await listPending(userId)) {
    try {
      await runAction(action);
      result.sent += 1;
    } catch (error) {
      if (error instanceof ApiError && DISCARD_STATUSES.has(error.status)) {
        result.dropped += 1;
      } else {
        result.blocked = true;
        break; // el orden importa: no se salta una acción para enviar las siguientes
      }
    }
    await removeAction(action.id!);
  }
  return result;
}