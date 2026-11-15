import OrderEvent from '../models/orderEvent.model.js';

/**
 * OrderEventRepository
 * Unico lugar que conoce Mongoose para la coleccion OrderEvent (historial
 * de pedidos). Es de solo agregado: no hay update.
 */
class OrderEventRepository {
  async create(data) {
    return OrderEvent.create(data);
  }

  /** Eventos de un pedido en orden cronologico (el `_id` desempata eventos del mismo milisegundo). */
  async findByOrder(orderId) {
    return OrderEvent.find({ order: orderId }).sort({ occurredAt: 1, _id: 1 });
  }

  async deleteByOrder(orderId) {
    const result = await OrderEvent.deleteMany({ order: orderId });
    return result.deletedCount;
  }
}

export default new OrderEventRepository();
