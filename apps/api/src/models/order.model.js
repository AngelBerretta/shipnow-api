import mongoose from 'mongoose';
import { ORDER_STATUS, PRIORITY } from '../constants/index.js';

const orderItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre del item es obligatorio']
  },
  quantity: {
    type: Number,
    required: [true, 'La cantidad es obligatoria'],
    min: [1, 'La cantidad minima es 1']
  },
  price: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // Codigo publico de seguimiento (ej: "RV-7K2M9QX4TB"), generado al crear
  // el pedido. `sparse` permite que convivan pedidos viejos sin codigo
  // hasta correr `npm run migrate:stage0`, que se los asigna.
  trackingCode: {
    type: String,
    unique: true,
    sparse: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El cliente es obligatorio']
  },
  // Tienda (usuario con rol `store`) a la que pertenece el pedido. Opcional.
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: (v) => v.length > 0,
      message: 'El pedido debe tener al menos un item'
    }
  },
  deliveryAddress: {
    type: String,
    required: [true, 'La direccion de entrega es obligatoria']
  },
  total: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.CREATED
  },
  priority: {
    type: String,
    enum: Object.values(PRIORITY),
    default: PRIORITY.NORMAL
  },
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    default: null
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
