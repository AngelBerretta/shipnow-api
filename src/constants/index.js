/**
 * Roles de usuario disponibles en la plataforma.
 * Reemplaza a los strings sueltos ('admin', 'driver', etc.) en todo el codigo.
 */
export const ROLES = Object.freeze({
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  DRIVER: 'driver',
  STORE: 'store',
});

/**
 * Estados posibles de un producto en el catalogo.
 */
export const PRODUCT_STATUS = Object.freeze({
  AVAILABLE: 'available',
  OUT_OF_STOCK: 'out_of_stock',
});

/**
 * Estados posibles del ciclo de vida de un pedido.
 */
export const ORDER_STATUS = Object.freeze({
  CREATED: 'created',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

/**
 * Estados posibles de una entrega asignada a un repartidor.
 */
export const DELIVERY_STATUS = Object.freeze({
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
});

/**
 * Niveles de prioridad compartidos entre pedidos y entregas.
 */
export const PRIORITY = Object.freeze({
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
});
