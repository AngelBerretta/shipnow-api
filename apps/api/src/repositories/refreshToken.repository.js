import RefreshToken from '../models/refreshToken.model.js';

class RefreshTokenRepository {
  async create(data) {
    return RefreshToken.create(data);
  }

  async findByHash(tokenHash) {
    return RefreshToken.findOne({ tokenHash });
  }

  /**
   * Marca el token como usado de forma ATOMICA y devuelve el documento
   * previo, o `null` si no existe, ya fue usado/revocado o vencio. Que sea
   * un solo findOneAndUpdate evita que dos refresh simultaneos con el mismo
   * token ganen los dos.
   */
  async consume(tokenHash) {
    const now = new Date();
    return RefreshToken.findOneAndUpdate(
      { tokenHash, revokedAt: null, expiresAt: { $gt: now } },
      { $set: { revokedAt: now } }
    );
  }

  async revokeFamily(family) {
    return RefreshToken.updateMany({ family, revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
}

export default new RefreshTokenRepository();