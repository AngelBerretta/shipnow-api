import { ORDER_STATUS, TRACKING_CODE } from '@ruvika/shared';
import type { OrderStatus } from './types';

/** Tolera espacios, minúsculas y el código sin el prefijo ("7k2m9qx4tb" -> "RV-7K2M9QX4TB"). */
export function normalizeCode(value: string) {
  const code = value.replace(/\s+/g, '').toUpperCase();
  return code.length === TRACKING_CODE.LENGTH ? `${TRACKING_CODE.PREFIX}-${code}` : code;
}

export const isValidCode = (value: string) => TRACKING_CODE.PATTERN.test(normalizeCode(value));

export const trackingPath = (code: string) => `/seguimiento/${code}`;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  created: 'Pedido recibido',
  assigned: 'Repartidor asignado',
  picked_up: 'Pedido retirado',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const SHORT_LABEL: Record<OrderStatus, string> = {
  created: 'Recibido',
  assigned: 'Asignado',
  picked_up: 'Retirado',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const STATUS_HINT: Record<OrderStatus, string> = {
  created: 'Recibimos tu pedido y estamos asignando un repartidor.',
  assigned: 'Un repartidor tiene tu pedido asignado y va a retirarlo.',
  picked_up: 'El repartidor ya retiró tu pedido.',
  in_transit: 'Tu pedido va en camino.',
  delivered: 'Tu pedido fue entregado.',
  cancelled: 'Este pedido fue cancelado.',
};

/** Pasos del progreso, en orden (cancelled no es un paso: se muestra aparte). */
export const STEPS: OrderStatus[] = [
  ORDER_STATUS.CREATED,
  ORDER_STATUS.ASSIGNED,
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.IN_TRANSIT,
  ORDER_STATUS.DELIVERED,
];

/** Con estado final no tiene sentido seguir consultando. */
export const isFinal = (status?: OrderStatus) => status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.CANCELLED;

export const whatsappUrl = (code: string, link: string) =>
  `https://wa.me/?text=${encodeURIComponent(`Seguí mi pedido ${code} acá: ${link}`)}`;