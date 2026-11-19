import orderRepository from '../repositories/order.repository.js';
import orderEventRepository from '../repositories/orderEvent.repository.js';
import { OrderNotFoundError } from '../errors/index.js';
import { maskAddress } from '../utils/address.js';
import locationService from './location.service.js';
import config from '../config/env.config.js';
import { ORDER_STATUS, TRACKING_CODE } from '../constants/index.js';

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

    const result = {
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

    // La posición del repartidor es pública SOLO mientras el pedido va en camino y si es reciente.
    // Nunca se devuelve el destino exacto (la dirección pública va sin número de calle).
    if (order.status === ORDER_STATUS.IN_TRANSIT && order.delivery) {
      const last = await locationService.getLatest(order.delivery._id);
      const fresh = last && Date.now() - Date.parse(last.recordedAt) < config.geo.tracking.staleSeconds * 1000;
      if (fresh) {
        const round = (n) => Math.round(n * 1e5) / 1e5;
        result.location = { lat: round(last.lat), lng: round(last.lng), updatedAt: last.recordedAt };
        const eta = await locationService.etaFor(String(order.delivery._id), last, order.deliveryLocation?.coordinates);
        if (eta) result.eta = { minutes: eta.minutes };
      }
    }
    return result;
  }
}

export default new TrackingService();