import User from '../models/user.model.js';

/**
 * UserRepository
 * Unico lugar de la aplicacion que conoce Mongoose/MongoDB para la entidad User.
 * No contiene reglas de negocio: solo busca y persiste datos.
 * Proyecta por defecto sin el campo `password` para no filtrarlo por accidente
 * en ninguna respuesta de la API.
 */
class UserRepository {
  /**
   * `options.limit` es opcional a propósito: llamadas internas (ej.
   * mock.service.js buscando "todos los customers disponibles" para
   * asociarles pedidos) siguen trayendo el set completo que matchea el
   * filtro. El límite por default para pedidos HTTP de listado vive en
   * la capa de Service (ver user.service.js / utils/pagination.js).
   */
  async findAll(filter = {}, { skip = 0, limit = 0 } = {}) {
    let query = User.find(filter).select('-password').sort({ createdAt: -1 });
    if (limit > 0) {
      query = query.skip(skip).limit(limit);
    }
    return query;
  }

  async countAll(filter = {}) {
    return User.countDocuments(filter);
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

  /**
   * Agrega un nuevo elemento a `documents` sin pisar los ya existentes
   * (`$push`), y devuelve el usuario ya actualizado.
   */
  async addDocument(id, documentData) {
    return User.findByIdAndUpdate(id, { $push: { documents: documentData } }, { new: true, runValidators: true })
      .select('-password');
  }
}

export default new UserRepository();
