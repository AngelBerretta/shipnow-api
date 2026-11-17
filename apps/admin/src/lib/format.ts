import { DELIVERY_TRANSITIONS, ORDER_TRANSITIONS, getAllowedTransitions } from '@ruvika/shared';
import type { DeliveryStatus, OrderEventType, OrderStatus, Priority, Role } from './types';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  created: 'Creado',
  assigned: 'Asignado',
  picked_up: 'Retirado',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: 'Pendiente',
  assigned: 'Asignada',
  picked_up: 'Retirada',
  in_transit: 'En camino',
  delivered: 'Entregada',
};

export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Baja', normal: 'Normal', high: 'Alta' };

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  customer: 'Cliente',
  driver: 'Repartidor',
  store: 'Tienda',
};

export const EVENT_LABEL: Record<OrderEventType, string> = {
  order_created: 'Pedido creado',
  status_changed: 'Estado cambiado',
  delivery_assigned: 'Repartidor asignado',
  delivery_status_changed: 'Avance del repartidor',
  delivery_removed: 'Entrega eliminada',
};

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const formatMoney = (value: number) => money.format(value);

const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });
export const formatDateTime = (iso?: string | null) => (iso ? dateTime.format(new Date(iso)) : '—');

/** "2026-11-15" -> "15/11" (sin pasar por Date: evita corrimientos de zona horaria). */
export const formatDayKey = (key: string) => key.slice(8, 10) + '/' + key.slice(5, 7);

export const fullName = (user?: { firstName: string; lastName: string } | null) =>
  user ? `${user.firstName} ${user.lastName}` : '—';

/** Siguiente paso "normal" de una entrega para el boton "Avanzar" (null si ya es final). */
export const nextDeliveryStatus = (status: DeliveryStatus): DeliveryStatus | null =>
  (getAllowedTransitions(DELIVERY_TRANSITIONS, status)[0] as DeliveryStatus | undefined) ?? null;

/** Estados a los que un admin puede mover un pedido SIN entrega (solo cancelarlo es util). */
export const canCancelOrder = (status: OrderStatus) => getAllowedTransitions(ORDER_TRANSITIONS, status).includes('cancelled');

/** Las referencias vienen populadas (objeto) o como id (string): devuelve el objeto o null. */
export const populated = <T extends object>(value: T | string | null | undefined): T | null =>
  value && typeof value === 'object' ? value : null;

/** Nombre del repartidor para los selectores, avisando si se marcó como no disponible. */
export const driverLabel = (user: { firstName: string; lastName: string; isAvailable?: boolean }) =>
  `${fullName(user)}${user.isAvailable === false ? ' · no disponible' : ''}`;

const TRACKING_BASE = (import.meta.env.VITE_TRACKING_URL ?? '').replace(/\/$/, '');

/** Enlace público de seguimiento del pedido (null si no hay código o no se configuró VITE_TRACKING_URL). */
export const trackingUrl = (code?: string) => (code && TRACKING_BASE ? `${TRACKING_BASE}/seguimiento/${code}` : null);

export const whatsappShareUrl = (code: string, url: string) =>
  `https://wa.me/?text=${encodeURIComponent(`Seguí tu pedido ${code} acá: ${url}`)}`;

export const formatMinutes = (minutes: number | null) =>
  minutes === null ? '—' : minutes < 60 ? `${Math.round(minutes)} min` : `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min`;
