import mongoose from 'mongoose';

/** Punto GeoJSON [lng, lat]. Lo usan Order (destino) y Location (posiciones). */
const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v) => v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
        message: 'Coordenadas inválidas [lng, lat]',
      },
    },
  },
  { _id: false }
);

export default pointSchema;