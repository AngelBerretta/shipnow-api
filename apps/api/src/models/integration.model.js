import mongoose from 'mongoose';
import { WEBHOOK_EVENTS } from '../constants/index.js';

const integrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Tienda dueña: los pedidos que entran por esta integración quedan a su nombre.
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    keyPrefix: { type: String, required: true, unique: true },
    keyHash: { type: String, required: true, select: false }, // sha256 de la API key: la key no se guarda
    webhookUrl: { type: String, default: null },
    // Hace falta en claro para firmar (HMAC). No se devuelve en ninguna consulta por defecto.
    webhookSecret: { type: String, required: true, select: false },
    events: { type: [{ type: String, enum: WEBHOOK_EVENTS }], default: () => [...WEBHOOK_EVENTS] },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Integration', integrationSchema);