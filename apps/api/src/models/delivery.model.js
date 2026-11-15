import mongoose from 'mongoose';
import fileMetadataSchema from './fileMetadata.schema.js';
import { DELIVERY_STATUS, PRIORITY } from '../constants/index.js';

const deliverySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'El pedido es obligatorio']
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: Object.values(DELIVERY_STATUS),
    default: DELIVERY_STATUS.PENDING
  },
  priority: {
    type: String,
    enum: Object.values(PRIORITY),
    default: PRIORITY.NORMAL
  },
  assignedAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  documents: {
    type: [fileMetadataSchema],
    default: []
  }
}, {
  timestamps: true
});

// Para el borrado en cascada pedido -> entrega (busca por `order`).
deliverySchema.index({ order: 1 });

const Delivery = mongoose.model('Delivery', deliverySchema);

export default Delivery;
