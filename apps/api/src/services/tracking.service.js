import orderRepository from '../repositories/order.repository.js';
import orderEventRepository from '../repositories/orderEvent.repository.js';
import { TRACKING_CODE } from '../constants/index.js';
import { OrderNotFoundError } from '../errors/index.js';
import { maskAddress } from '../utils/address.js';

class TrackingService {
  /**
   * Vista pública de un pedido por su código de seguimiento. Un código con
   * formato inválido y uno que no existe responden EXACTAMENTE igual (404), para
   * que no se pueda distinguir "formato mal" de "no existe". No se devuelven ids
   * internos, datos del cliente, ítems ni montos.
   */
  async getPublicTracking(rawCode) {
    const code = String(rawCode ?? '').trim().toUpperCase();
    if (!TRACKING_CODE.PATTERN.test(code)) {
      throw new OrderNotFoundError();
    }

    const order = await orderRepository.findByTrackingCode(code);
    if (!order) {
      throw new OrderNotFoundError();
    }

    const events = await orderEventRepository.findByOrder(order._id);
    const driver = order.delivery?.driver;

    return {
      trackingCode: order.trackingCode,
      status: order.status,
      createdAt: order.createdAt,
      address: maskAddress(order.deliveryAddress),
      driver:
        driver && typeof driver === 'object' && driver.firstName
          ? { firstName: driver.firstName, lastInitial: (driver.lastName ?? '').charAt(0).toUpperCase() }
          : null,
      // Solo los hechos que cambiaron el estado, sin ids ni actor.
      events: events.filter((e) => e.toStatus).map((e) => ({ status: e.toStatus, occurredAt: e.occurredAt })),
    };
  }
}

export default new TrackingService();