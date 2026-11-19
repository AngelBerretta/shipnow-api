import mongoose from 'mongoose';
import pointSchema from './point.schema.js';

const TTL_SECONDS = 48 * 60 * 60; // Atlas M0 = 512 MB: las posiciones se borran solas a las 48 h.

const locationSchema = new mongoose.Schema(
  {
    delivery: { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    point: { type: pointSchema, required: true },
    accuracy: Number,
    heading: Number,
    speed: Number,
    // Hora del servidor: el reloj del celular no es confiable.
    recordedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

locationSchema.index({ delivery: 1, recordedAt: -1 });
locationSchema.index({ point: '2dsphere' });
locationSchema.index({ recordedAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

export default mongoose.model('Location', locationSchema);