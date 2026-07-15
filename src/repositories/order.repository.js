import Order from '../models/order.model.js';

/**
 * OrderRepository
 * Unico lugar de la aplicacion que conoce Mongoose/MongoDB para la entidad Order.
 * Encapsula el populate de referencias (customer, delivery) para que ningun
 * otro archivo necesite conocer el esquema de Mongoose.
 */
class OrderRepository {
  async findAll(filter = {}) {
    return Order.find(filter)
      .populate('customer', 'firstName lastName email role')
      .populate('delivery')
      .sort({ createdAt: -1 });
  }

  async findById(id) {
    return Order.findById(id)
      .populate('customer', 'firstName lastName email role')
      .populate('delivery');
  }

  async create(data) {
    return Order.create(data);
  }

  async updateById(id, data) {
    return Order.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async deleteById(id) {
    return Order.findByIdAndDelete(id);
  }
}

export default new OrderRepository();
