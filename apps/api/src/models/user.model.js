import mongoose from 'mongoose';
import fileMetadataSchema from './fileMetadata.schema.js';
import { ROLES } from '../constants/index.js';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'El apellido es obligatorio'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    trim: true,
    lowercase: true
  },
  // Siempre se guarda el HASH bcrypt (ver user.service.js), nunca la
  // contrasena en texto plano.
  password: {
    type: String,
    required: [true, 'La contrasena es obligatoria']
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.CUSTOMER
  },
  // Baja logica: un usuario inactivo no podra iniciar sesion (Etapa 1).
  isActive: {
    type: Boolean,
    default: true
  },
  // Solo aplica a repartidores: el interruptor "disponible / no disponible" de la app.
  isAvailable: {
    type: Boolean,
    default: true
  },  
  documents: {
    type: [fileMetadataSchema],
    default: []
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;
