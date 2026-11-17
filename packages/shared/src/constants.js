/**
 * Constantes de dominio de Ruvika, compartidas por la API y por los
 * frontends (admin, driver, tracking). Es codigo JavaScript puro, sin
 * dependencias de Node ni de Mongoose, para que tambien pueda
 * ejecutarse en el navegador.
 */

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
 * Espejan el ciclo del pedido (assigned -> picked_up -> in_transit ->
 * delivered): asi la app del repartidor avanza la entrega y el pedido
 * se actualiza en consecuencia.
 */
export const DELIVERY_STATUS = Object.freeze({
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
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

/**
 * Tipos de documento aceptados por el modulo de carga de archivos
 * (Multer). Se usan tanto para los documentos de un usuario
 * (DNI, licencia, comprobante de domicilio) como para los comprobantes
 * asociados a una entrega (DELIVERY_PROOF, que ademas es el valor por
 * defecto cuando no se especifica un tipo al subir un comprobante).
 */
export const DOCUMENT_TYPES = Object.freeze({
  DNI: 'dni',
  LICENSE: 'licencia',
  PROOF_OF_ADDRESS: 'comprobante_domicilio',
  DELIVERY_PROOF: 'comprobante_entrega',
  OTHER: 'otro',
});

/**
 * Tipos de evento del historial de un pedido (coleccion OrderEvent).
 * Todo evento con `toStatus` representa un cambio de estado del pedido;
 * el tipo indica QUE lo provoco.
 */
export const ORDER_EVENT_TYPES = Object.freeze({
  ORDER_CREATED: 'order_created',
  STATUS_CHANGED: 'status_changed',
  DELIVERY_ASSIGNED: 'delivery_assigned',
  DELIVERY_STATUS_CHANGED: 'delivery_status_changed',
  DELIVERY_REMOVED: 'delivery_removed',
});

/**
 * Formato del codigo de seguimiento publico de un pedido (ej:
 * "RV-7K2M9QX4TB"). El alfabeto excluye caracteres ambiguos (0/O, 1/I/L).
 * La generacion aleatoria vive en la API (usa crypto de Node); aca solo
 * esta el formato, para que los frontends puedan validar lo que escribe
 * el cliente.
 */
const TRACKING_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const TRACKING_PREFIX = 'RV';
const TRACKING_LENGTH = 10;

export const TRACKING_CODE = Object.freeze({
  PREFIX: TRACKING_PREFIX,
  ALPHABET: TRACKING_ALPHABET,
  LENGTH: TRACKING_LENGTH,
  PATTERN: new RegExp(`^${TRACKING_PREFIX}-[${TRACKING_ALPHABET}]{${TRACKING_LENGTH}}$`),
});

/** Canales y estados de las notificaciones (Etapa 5). */
export const NOTIFICATION_CHANNELS = Object.freeze({
  EMAIL: 'email',
  PUSH: 'push',
  TELEGRAM: 'telegram',
  IN_APP: 'in_app',
});

export const NOTIFICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  SKIPPED: 'skipped',
});
