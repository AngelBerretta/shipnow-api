import Delivery from '../models/delivery.model.js';

/**
 * DeliveryRepository
 * Unico lugar de la aplicacion que conoce Mongoose/MongoDB para la entidad Delivery.
 */
class DeliveryRepository {
  async findAll(filter = {}) {
    return Delivery.find(filter)
      .populate('order')
      .populate('driver', 'firstName lastName email role')
      .sort({ createdAt: -1 });
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
