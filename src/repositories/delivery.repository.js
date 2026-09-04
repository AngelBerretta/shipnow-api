import Delivery from '../models/delivery.model.js';

/**
 * DeliveryRepository
 * Unico lugar de la aplicacion que conoce Mongoose/MongoDB para la entidad Delivery.
 */
class DeliveryRepository {
  /**
   * `options.limit` opcional: uso interno (ej. futuras integraciones) puede
   * seguir pidiendo el set completo. El límite por default del listado
   * HTTP vive en delivery.service.js.
   */
  async findAll(filter = {}, { skip = 0, limit = 0 } = {}) {
    let query = Delivery.find(filter)
      .populate('order')
      .populate('driver', 'firstName lastName email role')
      .sort({ createdAt: -1 });
    if (limit > 0) {
      query = query.skip(skip).limit(limit);
    }
    return query;
  }

  async countAll(filter = {}) {
    return Delivery.countDocuments(filter);
  }

  async findById(id) {
    return Delivery.findById(id)
      .populate('order')
      .populate('driver', 'firstName lastName email role');
  }

  async create(data) {
    return Delivery.create(data);
  }

  async updateById(id, data) {
    return Delivery.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async deleteById(id) {
    return Delivery.findByIdAndDelete(id);
  }

  /**
   * Agrega un nuevo elemento a `documents` (comprobantes) sin pisar los
   * ya existentes (`$push`), y devuelve la entrega ya actualizada y
   * populada (misma proyeccion que `findById`).
   */
  async addDocument(id, documentData) {
    return Delivery.findByIdAndUpdate(id, { $push: { documents: documentData } }, { new: true, runValidators: true })
      .populate('order')
      .populate('driver', 'firstName lastName email role');
  }
}

export default new DeliveryRepository();
