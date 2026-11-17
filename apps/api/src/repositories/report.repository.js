import Order from '../models/order.model.js';
import Delivery from '../models/delivery.model.js';
import OrderEvent from '../models/orderEvent.model.js';
import { ORDER_STATUS, DELIVERY_STATUS } from '../constants/index.js';

/**
 * Pipelines de solo lectura para los reportes. El período se da en DÍAS LOCALES
 * (`from`..`to`, inclusive, en `timezone`): primero una ventana holgada que usa los
 * índices (`since`/`until`) y después el recorte exacto por día local.
 */
const inPeriod = (field, { from, to, timezone, since, until }, extra = {}) => [
  { $match: { ...extra, [field]: { $gte: since, $lt: until } } },
  { $addFields: { _day: { $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone } } } },
  { $match: { _day: { $gte: from, $lte: to } } },
];

const countIf = (condition) => ({ $sum: { $cond: [condition, 1, 0] } });

const withUserName = [
  { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
  { $addFields: { firstName: { $arrayElemAt: ['$user.firstName', 0] }, lastName: { $arrayElemAt: ['$user.lastName', 0] } } },
  { $project: { user: 0 } },
];

class ReportRepository {
  /** Pedidos CREADOS en el período, por estado actual. */
  async ordersByStatus(period) {
    return Order.aggregate([...inPeriod('createdAt', period), { $group: { _id: '$status', count: { $sum: 1 } } }]);
  }

  async ordersCreatedByDay(period) {
    return Order.aggregate([...inPeriod('createdAt', period), { $group: { _id: '$_day', count: { $sum: 1 } } }]);
  }

  /** Entregas realizadas por día (fecha real del evento `delivered`). */
  async deliveredByDay(period) {
    return OrderEvent.aggregate([
      ...inPeriod('occurredAt', period, { toStatus: ORDER_STATUS.DELIVERED }),
      { $group: { _id: '$_day', count: { $sum: 1 } } },
    ]);
  }

  /** Entregas completadas en el período y su duración promedio (asignación -> entrega). */
  async deliveryTimes(period) {
    const [row] = await Delivery.aggregate([
      ...inPeriod('deliveredAt', period, { status: DELIVERY_STATUS.DELIVERED, assignedAt: { $ne: null } }),
      { $group: { _id: null, count: { $sum: 1 }, avgMs: { $avg: { $subtract: ['$deliveredAt', '$assignedAt'] } } } },
    ]);
    return row ?? { count: 0, avgMs: null };
  }

  /** Entregas asignadas en el período, por repartidor. */
  async byDriver(period) {
    const delivered = { $eq: ['$status', DELIVERY_STATUS.DELIVERED] };
    return Delivery.aggregate([
      ...inPeriod('createdAt', period, { driver: { $ne: null } }),
      {
        $group: {
          _id: '$driver',
          deliveries: { $sum: 1 },
          delivered: countIf(delivered),
          avgMs: {
            $avg: {
              $cond: [
                { $and: [delivered, { $ne: ['$deliveredAt', null] }, { $ne: ['$assignedAt', null] }] },
                { $subtract: ['$deliveredAt', '$assignedAt'] },
                null,
              ],
            },
          },
        },
      },
      ...withUserName,
      { $sort: { delivered: -1, deliveries: -1 } },
    ]);
  }

  /** Pedidos creados en el período, por tienda (`_id: null` = pedidos sin tienda). */
  async byStore(period) {
    return Order.aggregate([
      ...inPeriod('createdAt', period),
      {
        $group: {
          _id: '$store',
          orders: { $sum: 1 },
          delivered: countIf({ $eq: ['$status', ORDER_STATUS.DELIVERED] }),
          cancelled: countIf({ $eq: ['$status', ORDER_STATUS.CANCELLED] }),
          revenue: { $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.DELIVERED] }, '$total', 0] } },
        },
      },
      ...withUserName,
      { $sort: { orders: -1 } },
    ]);
  }
}

export default new ReportRepository();