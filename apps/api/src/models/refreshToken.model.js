import mongoose from 'mongoose';

/**
 * Refresh tokens emitidos. Se guarda solo el HASH (sha256) del token, nunca
 * el token en si. Todos los tokens de una misma sesion comparten `family`:
 * si se detecta que un token ya rotado se vuelve a usar, se revoca la
 * familia entera. El indice TTL borra los documentos al vencer.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    family: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;