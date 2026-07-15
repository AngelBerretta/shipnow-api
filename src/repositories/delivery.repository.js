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
}

export default new DeliveryRepository();
