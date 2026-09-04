import deliveryRepository from '../repositories/delivery.repository.js';
import orderRepository from '../repositories/order.repository.js';
import userRepository from '../repositories/user.repository.js';
import { ROLES, ORDER_STATUS, DELIVERY_STATUS, PRIORITY } from '../constants/index.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import logger from '../config/logger.config.js';
import {
  DeliveryNotFoundError,
  OrderNotFoundError,
  UserNotFoundError,
  ValidationError,
  InvalidStatusError,
  OrderAlreadyProcessedError,
  DeliveryAlreadyCompletedError,
} from '../errors/index.js';

class DeliveryService {
  /**
   * Listado paginado de entregas. Nunca devuelve la colección completa
   * sin control (ver utils/pagination.js). Admite filtrar por `status`
   * y por `driver` (?status=in_transit&driver=<id>).
   */
  async getAllDeliveries(query = {}) {
    const pagination = parsePagination(query);
    const filter = {};

    if (query.status) {
      if (!Object.values(DELIVERY_STATUS).includes(query.status)) {
        throw new InvalidStatusError(query.status, Object.values(DELIVERY_STATUS));
      }
      filter.status = query.status;
    }
    if (query.driver) {
      filter.driver = query.driver;
    }

    const [deliveries, total] = await Promise.all([
      deliveryRepository.findAll(filter, { skip: pagination.skip, limit: pagination.limit }),
      deliveryRepository.countAll(filter),
    ]);

    return { data: deliveries, pagination: buildPaginationMeta(pagination, total) };
  }

  async getDeliveryById(id) {
    const delivery = await deliveryRepository.findById(id);
    if (!delivery) {
      throw new DeliveryNotFoundError();
    }
    return delivery;
  }

  async createDelivery({ order, driver, priority }) {
    if (!order) {
      throw new ValidationError('El pedido es obligatorio');
    }
    if (!driver) {
      throw new ValidationError('El repartidor es obligatorio');
    }

    const existingOrder = await orderRepository.findById(order);
    if (!existingOrder) {
      throw new OrderNotFoundError('El pedido no existe');
    }

    const existingDriver = await userRepository.findById(driver);
    if (!existingDriver) {
      throw new UserNotFoundError('El repartidor no existe');
    }
    if (existingDriver.role !== ROLES.DRIVER) {
      throw new ValidationError(`El usuario no tiene rol de repartidor (rol actual: ${existingDriver.role})`);
    }

    if (existingOrder.status !== ORDER_STATUS.CREATED) {
      throw new OrderAlreadyProcessedError(existingOrder.status);
    }

    const newDelivery = await deliveryRepository.create({
      order,
      driver,
      priority: priority || PRIORITY.NORMAL,
      status: DELIVERY_STATUS.ASSIGNED,
      assignedAt: new Date(),
    });

    await orderRepository.updateById(order, {
      status: ORDER_STATUS.ASSIGNED,
      delivery: newDelivery._id,
    });

    logger.info(`Entrega ${newDelivery._id} creada para el pedido ${order}`);

    return newDelivery;
  }

  async updateDeliveryStatus(id, status) {
    if (!status) {
      throw new ValidationError('El estado es obligatorio');
    }
    if (!Object.values(DELIVERY_STATUS).includes(status)) {
      throw new InvalidStatusError(status, Object.values(DELIVERY_STATUS));
    }

    const delivery = await deliveryRepository.findById(id);
    if (!delivery) {
      throw new DeliveryNotFoundError();
    }
    if (delivery.status === DELIVERY_STATUS.DELIVERED) {
      throw new DeliveryAlreadyCompletedError();
    }

    const updateData = { status };
    if (status === DELIVERY_STATUS.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    const updatedDelivery = await deliveryRepository.updateById(id, updateData);

    if (status === DELIVERY_STATUS.DELIVERED) {
      await orderRepository.updateById(delivery.order, { status: ORDER_STATUS.DELIVERED });
    }

    logger.info(`Entrega ${updatedDelivery._id} actualizada a: ${status}`);

    return updatedDelivery;
  }

  async deleteDelivery(id) {
    const deleted = await deliveryRepository.deleteById(id);
    if (!deleted) {
      throw new DeliveryNotFoundError();
    }
    return deleted;
  }
}

export default new DeliveryService();
