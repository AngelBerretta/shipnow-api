import orderRepository from '../repositories/order.repository.js';
import userRepository from '../repositories/user.repository.js';
import { ROLES, ORDER_STATUS, PRIORITY } from '../constants/index.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import logger from '../config/logger.config.js';
import {
  OrderNotFoundError,
  UserNotFoundError,
  ValidationError,
  InvalidStatusError,
  ForbiddenActionError,
  OrderAlreadyDeliveredError,
} from '../errors/index.js';

const SHIPPING_COST_PER_UNIT = 10;

class OrderService {
  /**
   * Listado paginado de pedidos. Nunca devuelve la colección completa
   * sin control (ver utils/pagination.js). Admite filtrar por `status`
   * y por `customer` (?status=created&customer=<id>).
   */
  async getAllOrders(query = {}) {
    const pagination = parsePagination(query);
    const filter = {};

    if (query.status) {
      if (!Object.values(ORDER_STATUS).includes(query.status)) {
        throw new InvalidStatusError(query.status, Object.values(ORDER_STATUS));
      }
      filter.status = query.status;
    }
    if (query.customer) {
      filter.customer = query.customer;
    }

    const [orders, total] = await Promise.all([
      orderRepository.findAll(filter, { skip: pagination.skip, limit: pagination.limit }),
      orderRepository.countAll(filter),
    ]);

    return { data: orders, pagination: buildPaginationMeta(pagination, total) };
  }

  async getOrderById(id) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new OrderNotFoundError();
    }
    return order;
  }

  async createOrder({ customer, items, deliveryAddress, priority }) {
    if (!customer) {
      throw new ValidationError('Falta el cliente');
    }
    if (!items || items.length === 0) {
      throw new ValidationError('Faltan los items del pedido');
    }
    if (!deliveryAddress) {
      throw new ValidationError('Falta la direccion');
    }

    const user = await userRepository.findById(customer);
    if (!user) {
      throw new UserNotFoundError('El usuario no existe');
    }
    if (user.role === ROLES.DRIVER) {
      throw new ForbiddenActionError('Los repartidores no pueden crear pedidos');
    }

    const total = this.***REMOVED***calculateTotal(items);

    const newOrder = await orderRepository.create({
      customer,
      items,
      deliveryAddress,
      total,
      priority: priority || PRIORITY.NORMAL,
      status: ORDER_STATUS.CREATED,
    });

    logger.info(`Pedido ${newOrder._id} creado correctamente (cliente: ${customer}, total: $${total})`);

    this.***REMOVED***sendOrderConfirmationEmail(customer, newOrder._id, total);

    const shippingCost = this.***REMOVED***calculateShippingCost(newOrder.items);

    return { order: newOrder, shippingCost };
  }

  async updateOrderStatus(id, status) {
    if (!status) {
      throw new ValidationError('El estado es obligatorio');
    }
    if (!Object.values(ORDER_STATUS).includes(status)) {
      throw new InvalidStatusError(status, Object.values(ORDER_STATUS));
    }

    const order = await orderRepository.findById(id);
    if (!order) {
      throw new OrderNotFoundError();
    }
    if (order.status === ORDER_STATUS.DELIVERED) {
      throw new OrderAlreadyDeliveredError();
    }

    const updatedOrder = await orderRepository.updateById(id, { status });
    logger.info(`Pedido ${updatedOrder._id} actualizado a estado: ${status}`);
    return updatedOrder;
  }

  async deleteOrder(id) {
    const deleted = await orderRepository.deleteById(id);
    if (!deleted) {
      throw new OrderNotFoundError();
    }
    return deleted;
  }

  ***REMOVED***calculateTotal(items) {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }

  ***REMOVED***calculateShippingCost(items) {
    return items.reduce((acc, item) => acc + item.quantity * SHIPPING_COST_PER_UNIT, 0);
  }

  ***REMOVED***sendOrderConfirmationEmail(customerId, orderId, total) {
    // Simulacion de envio de email (se reemplazaria por un EmailService real
    // apuntando a config.emailServiceUrl, ver src/config/env.config.js).
    logger.debug(`[EMAIL SIMULADO] Enviando confirmacion al usuario ${customerId}...`);
    logger.debug(`[EMAIL SIMULADO] Tu pedido ${orderId} fue creado. Total: $${total}`);
  }
}

export default new OrderService();
