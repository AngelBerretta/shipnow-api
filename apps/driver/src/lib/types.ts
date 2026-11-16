import type { DELIVERY_STATUS, ORDER_STATUS, PRIORITY, ROLES } from '@ruvika/shared';

type ValueOf<T> = T[keyof T];
export type Role = ValueOf<typeof ROLES>;
export type OrderStatus = ValueOf<typeof ORDER_STATUS>;
export type DeliveryStatus = ValueOf<typeof DELIVERY_STATUS>;
export type Priority = ValueOf<typeof PRIORITY>;

export interface Page<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  isActive: boolean;
  isAvailable?: boolean;
}

export interface CustomerRef {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

/** Pedido tal como viene populado dentro de una entrega (el cliente solo trae nombre). */
export interface DeliveryOrder {
  _id: string;
  trackingCode?: string;
  customer: CustomerRef | null;
  items: OrderItem[];
  deliveryAddress: string;
  total: number;
  status: OrderStatus;
  priority: Priority;
}

export interface FileMetadata {
  _id: string;
  originalName: string;
  documentType: string | null;
  uploadedAt: string;
}

export interface Delivery {
  _id: string;
  order: DeliveryOrder | null;
  status: DeliveryStatus;
  priority: Priority;
  assignedAt: string | null;
  deliveredAt: string | null;
  documents: FileMetadata[];
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}