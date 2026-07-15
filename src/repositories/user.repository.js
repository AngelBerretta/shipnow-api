import User from '../models/user.model.js';

/**
 * UserRepository
 * Unico lugar de la aplicacion que conoce Mongoose/MongoDB para la entidad User.
 * No contiene reglas de negocio: solo busca y persiste datos.
 * Proyecta por defecto sin el campo `password` para no filtrarlo por accidente
 * en ninguna respuesta de la API.
 */
class UserRepository {
  async findAll(filter = {}) {
    return User.find(filter).select('-password');
  }

  async findById(id) {
    return User.findById(id).select('-password');
  }

  async findByEmail(email) {
    return User.findOne({ email }).select('-password');
  }

  async create(data) {
    const created = await User.create(data);
    const { password, ...rest } = created.toObject();
    return rest;
  }

  async deleteById(id) {
    return User.findByIdAndDelete(id).select('-password');
  }
}

export default new UserRepository();
