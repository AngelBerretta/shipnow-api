import mongoose from 'mongoose';
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUS } from '../constants/index.js';

/**
 * Bandeja de salida (outbox) de avisos. Una fila por aviso y canal. Las de `in_app`
 * nacen `sent` (la fila ES el aviso: la campana del panel la lee); el resto nace
 * `pending` y la envía el servicio con reintentos.
 */
const notificationSchema = new mongoose.Schema(
  {
    // Destinatario. Null en los avisos al chat de Telegram de administración.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    channel: { type: String, enum: Object.values(NOTIFICATION_CHANNELS), required: true },
    // Ej: order_created, order_in_transit, order_delivered, weekly_report.
    type: { type: String, required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    // Datos de entrega del canal: { to, html } (email), { url, path } (enlaces).
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: Object.values(NOTIFICATION_STATUS), default: NOTIFICATION_STATUS.PENDING },
    attempts: { type: Number, default: 0 },
    // Cuándo se puede (re)intentar. Al tomar una fila se adelanta: funciona como "lease".
    nextAttemptAt: { type: Date, default: Date.now },
    lastError: { type: String, default: null },
    sentAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    // Evita avisos duplicados si un evento se procesa dos veces.
    dedupeKey: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
notificationSchema.index({ status: 1, nextAttemptAt: 1 });
notificationSchema.index({ user: 1, channel: 1, createdAt: -1 });
// Atlas M0 tiene 512 MB: los avisos se borran solos a los 30 días.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;