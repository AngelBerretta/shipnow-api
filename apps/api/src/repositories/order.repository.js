import Order from '../models/order.model.js';

/**
 * OrderRepository
 * Unico lugar de la aplicacion que conoce Mongoose/MongoDB para la entidad Order.
 * Encapsula el populate de referencias (customer, delivery) para que ningun
 * otro archivo necesite conocer el esquema de Mongoose.
 */
class OrderRepository {
  /**
   * `options.limit` opcional: el seeding de mocks (mock.service.js) sigue
   * pudiendo traer "todos los pedidos created disponibles" sin recorte.
   * El límite por default para el listado HTTP vive en order.service.js.
   */
  async findAll(filter = {}, { skip = 0, limit = 0 } = {}) {
    let query = Order.find(filter)
      .populate('customer', 'firstName lastName email role')
      .populate('delivery')
      .sort({ createdAt: -1 });
    if (limit > 0) {
      query = query.skip(skip).limit(limit);
    }
    return query;
  }

  async countAll(filter = {}) {
    return Order.countDocuments(filter);
  }

  async findById(id) {
    return Order.findById(id)
      .populate('customer', 'firstName lastName email role')
      .populate('delivery');
  }

  /**
   * Igual que `findById` pero SIN populate: `customer`, `store` y
   * `delivery` quedan como ObjectId. Es lo que necesitan las operaciones
   * internas que solo miran el estado o los ids (sincronizar estado desde
   * una entrega, borrado en cascada), y la unica forma de conocer el id de
   * una entrega ya borrada (con populate, esa referencia colgante vendria
   * en null).
   */
  async findByIdPlain(id) {
    return Order.findById(id);
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
