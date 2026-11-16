import { DELIVERY_TRANSITIONS, getAllowedTransitions } from '@ruvika/shared';
import type { QueuedAction } from '../offline/db';
import type { Delivery, DeliveryStatus, Priority } from './types';

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: 'Pendiente',
  assigned: 'Por retirar',
  picked_up: 'Retirada',
  in_transit: 'En camino',
  delivered: 'Entregada',
};

export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Baja', normal: 'Normal', high: 'Alta' };

/** Pasos que ve el repartidor, en orden. */
export const STEPS: DeliveryStatus[] = ['assigned', 'picked_up', 'in_transit', 'delivered'];

/** Texto del botón según el estado AL QUE se pasa. */
export const ACTION_LABEL: Partial<Record<DeliveryStatus, string>> = {
  picked_up: 'Ya retiré el pedido',
  in_transit: 'Salgo a entregar',
  delivered: 'Entregué el pedido',
};

const RANK: DeliveryStatus[] = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'];
const PRIORITY_RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

/** Siguiente estado válido según la máquina de estados compartida con la API. */
export const nextStatus = (status: DeliveryStatus) =>
  getAllowedTransitions(DELIVERY_TRANSITIONS, status)[0] as DeliveryStatus | undefined;

/**
 * Estado que se muestra: el del servidor + los cambios que todavía están en la cola
 * (así el botón responde al instante aunque no haya conexión). Un cambio en cola
 * nunca hace retroceder a un estado que el servidor ya superó.
 */
export function effectiveStatus(delivery: Pick<Delivery, '_id' | 'status'>, pending: QueuedAction[]): DeliveryStatus {
  let status = delivery.status;
  for (const action of pending) {
    if (
      action.type === 'status' &&
      action.deliveryId === delivery._id &&
      RANK.indexOf(action.status) > RANK.indexOf(status)
    ) {
      status = action.status;
    }
  }
  return status;
}

/** ¿Hay algo de esta entrega (estado o foto) esperando enviarse? */
export const hasPending = (deliveryId: string, pending: QueuedAction[]) =>
  pending.some((action) => action.type !== 'availability' && action.deliveryId === deliveryId);

/** Urgentes primero y, a igual prioridad, la asignada hace más tiempo. */
export const sortActive = (items: Delivery[]) =>
  [...items].sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.assignedAt ?? '').localeCompare(b.assignedAt ?? ''),
  );

export const googleMapsUrl = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;

export const wazeUrl = (address: string) => `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;