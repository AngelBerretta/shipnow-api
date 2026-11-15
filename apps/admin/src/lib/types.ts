import type { ORDER_STATUS, DELIVERY_STATUS, PRIORITY, ROLES, PRODUCT_STATUS, ORDER_EVENT_TYPES } from '@ruvika/shared';

type ValueOf<T> = T[keyof T];
export type Role = ValueOf<typeof ROLES>;
export type OrderStatus = ValueOf<typeof ORDER_STATUS>;
export type DeliveryStatus = ValueOf<typeof DELIVERY_STATUS>;
export type Priority = ValueOf<typeof PRIORITY>;
export type ProductStatus = ValueOf<typeof PRODUCT_STATUS>;
export type OrderEventType = ValueOf<typeof ORDER_EVENT_TYPES>;

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
  createdAt: string;
}

export type UserSummary = Pick<User, '_id' | 'firstName' | 'lastName' | 'email' | 'role'>;

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface FileMetadata {
  _id: string;
  originalName: string;
  documentType: string | null;
  path: string;
  uploadedAt: string;
}

/** Entrega tal como la devuelve la API (populate segun el endpoint). */
export interface Delivery {
  _id: string;
  order: Order | string | null;
  driver: UserSummary | string | null;
  status: DeliveryStatus;
  priority: Priority;
  assignedAt: string | null;
  deliveredAt: string | null;
  documents: FileMetadata[];
  createdAt: string;
}

export interface Order {
  _id: string;
  trackingCode?: string;
  customer: UserSummary | null;
  store: string | null;
  items: OrderItem[];
  deliveryAddress: string;
  total: number;
  status: OrderStatus;
  priority: Priority;
  delivery: Delivery | null;
  createdAt: string;
}

export interface OrderEvent {
  _id: string;
  type: OrderEventType;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  delivery: string | null;
  occurredAt: string;
}

export interface OrderTimeline {
  order: string;
  trackingCode: string | null;
  events: OrderEvent[];
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  owner: string | null;
  status: ProductStatus;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface StatsOverview {
  generatedAt: string;
  timezone: string;
  days: number;
  kpis: {
    ordersToday: number;
    inTransit: number;
    delivered: number;
    cancelled: number;
    totalOrders: number;
    deliveryRate: number;
  };
  byStatus: { status: OrderStatus; count: number }[];
  perDay: { date: string; created: number; delivered: number }[];
}

export interface MockSeedResult {
  persisted: boolean;
  summary: {
    users: { requested: number; created: number };
    orders: { requested: number; created: number };
    deliveries: { requested: number; created: number };
    warnings: string[];
  };
}
