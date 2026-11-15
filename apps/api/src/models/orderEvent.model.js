import mongoose from 'mongoose';
import { ORDER_STATUS, ORDER_EVENT_TYPES } from '../constants/index.js';

/**
 * Historial de un pedido: una fila por cada hecho relevante de su vida
 * (creacion, cambios de estado, entrega asignada o removida). Alimenta
 * la linea de tiempo del dashboard y del portal del cliente, las
 * notificaciones automaticas y los reportes (Etapas 2, 4 y 5).
 *
 * Es de solo agregado: los eventos nunca se editan. Un evento con
 * `toStatus` es un cambio de estado del pedido; `type` indica que lo
 * provoco.
 */
const orderEventSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'El pedido es obligatorio']
  },
  type: {
    type: String,
    enum: Object.values(ORDER_EVENT_TYPES),
    required: [true, 'El tipo de evento es obligatorio']
  },
  fromStatus: {
    type: String,
    enum: [...Object.values(ORDER_STATUS), null],
    default: null
  },
  toStatus: {
    type: String,
    enum: [...Object.values(ORDER_STATUS), null],
    default: null
  },
  // Entrega que origino el evento (si la hubo).
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    default: null
  },
  // Quien hizo el cambio. Queda en null hasta que exista autenticacion (Etapa 1).
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  occurredAt: {
    type: Date,
    default: Date.now
  }
}, {
  versionKey: false
});

orderEventSchema.index({ order: 1, occurredAt: 1 });

const OrderEvent = mongoose.model('OrderEvent', orderEventSchema);

export default OrderEvent;
