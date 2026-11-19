import type { ORDER_STATUS } from '@ruvika/shared';

type ValueOf<T> = T[keyof T];
export type OrderStatus = ValueOf<typeof ORDER_STATUS>;

export interface TrackingEvent {
  status: OrderStatus;
  occurredAt: string;
}

/** Respuesta de GET /api/public/tracking/:code (datos ya sanitizados por la API). */
export interface Tracking {
  trackingCode: string;
  status: OrderStatus;
  createdAt: string;
  address: string;
  driver: { firstName: string; lastInitial: string } | null;
  events: TrackingEvent[];
  /** Solo viene mientras el pedido va en camino y la posición es reciente. */
  location?: { lat: number; lng: number; updatedAt: string };
  eta?: { minutes: number };  
}