import orderEventRepository from '../repositories/orderEvent.repository.js';
import orderRepository from '../repositories/order.repository.js';
import logger from '../config/logger.config.js';
import { OrderNotFoundError } from '../errors/index.js';

/**
 * OrderEventService
 *
 * Registra y consulta el historial de un pedido. `record` es a proposito
 * "best effort": si por algun motivo no se puede escribir el evento, se
 * loguea el error completo pero NO se rompe la operacion de negocio que
 * lo origino (el pedido ya se actualizo y el cliente no debe recibir un
 * 500 por un problema del historial).
 */
class OrderEventService {
  async record(eventData) {
    try {
      return await orderEventRepository.create(eventData);
    } catch (error) {
      logger.error(
        `No se pudo registrar el evento "${eventData.type}" del pedido ${eventData.order}: ${error.message}`,
        { stack: error.stack }
      );
      return null;
    }
  }

  /** Linea de tiempo de un pedido. 404 si el pedido no existe. */
  async getTimeline(orderId) {
    const order = await orderRepository.findByIdPlain(orderId);
    if (!order) {
      throw new OrderNotFoundError();
    }
    const events = await orderEventRepository.findByOrder(order._id);
    return { order: order._id, trackingCode: order.trackingCode ?? null, events };
  }

  async deleteByOrder(orderId) {
    return orderEventRepository.deleteByOrder(orderId);
  }
}

export default new OrderEventService();
