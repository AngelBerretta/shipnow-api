import orderRepository from '../repositories/order.repository.js';
import userRepository from '../repositories/user.repository.js';
import { ROLES, ORDER_STATUS, PRIORITY } from '../constants/index.js';
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
  async getAllOrders() {
    return orderRepository.findAll();
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
    console.log(`Pedido ${updatedOrder._id} actualizado a estado: ${status}`);
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
    // Simulacion de envio de email (se reemplazaria por un EmailService real).
    console.log(`[EMAIL SIMULADO] Enviando confirmacion al usuario ${customerId}...`);
    console.log(`[EMAIL SIMULADO] Tu pedido ${orderId} fue creado. Total: $${total}`);
  }
}

export default new OrderService();
