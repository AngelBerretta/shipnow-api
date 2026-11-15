import Order from '../models/order.model.js';
import OrderEvent from '../models/orderEvent.model.js';
import { ORDER_STATUS } from '../constants/index.js';

/**
 * StatsRepository
 * Aggregation pipelines de solo lectura para el dashboard. Devuelven filas
 * crudas `{ _id, count }`; darles forma (rellenar dias sin datos, calcular
 * tasas) es trabajo del Service.
 */
class StatsRepository {
  /** Cantidad de pedidos por estado (solo estados que tienen al menos un pedido). */
  async countOrdersByStatus() {
    return Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  }

  /** Pedidos creados por dia calendario (en `timezone`) desde `since`. */
  async countOrdersCreatedByDay(since, timezone) {
    return Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone } }, count: { $sum: 1 } } },
    ]);
  }

  /**
   * Pedidos entregados por dia: se cuentan los eventos del historial que
   * llevaron el pedido a `delivered` (la fecha real de la entrega, no la de
   * creacion del pedido).
   */
  async countDeliveredByDay(since, timezone) {
    return OrderEvent.aggregate([
      { $match: { toStatus: ORDER_STATUS.DELIVERED, occurredAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt', timezone } }, count: { $sum: 1 } } },
    ]);
  }
}

export default new StatsRepository();
