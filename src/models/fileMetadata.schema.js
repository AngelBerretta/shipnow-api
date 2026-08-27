import mongoose from 'mongoose';

/**
 * fileMetadata.schema.js
 *
 * Subdocumento reutilizable para los metadatos de un archivo cargado
 * con Multer. En Mongo NUNCA se guarda el archivo en sí (eso vive en el
 * filesystem, ver `multer.config.js`): solo la referencia a dónde
 * quedó guardado y la información necesaria para mostrarlo o
 * descargarlo despues.
 *
 * Lo usan tanto `User.documents` (documentos de usuario: DNI, licencia,
 * etc.) como `Delivery.documents` (comprobantes de entrega), en vez de
 * repetir esta forma en cada modelo.
 */
const fileMetadataSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, 'El nombre original del archivo es obligatorio'],
    },
    storedName: {
      type: String,
      required: [true, 'El nombre generado del archivo es obligatorio'],
    },
    path: {
      type: String,
      required: [true, 'La ruta del archivo es obligatoria'],
    },
    mimeType: {
      type: String,
      required: [true, 'El tipo MIME del archivo es obligatorio'],
    },
    size: {
      type: Number,
      required: [true, 'El tamaño del archivo es obligatorio'],
    },
    documentType: {
      type: String,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

export default fileMetadataSchema;
