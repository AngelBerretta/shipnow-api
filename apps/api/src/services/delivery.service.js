import deliveryRepository from '../repositories/delivery.repository.js';
import orderRepository from '../repositories/order.repository.js';
import userRepository from '../repositories/user.repository.js';
import orderService from './order.service.js';
import {
  ROLES,
  ORDER_STATUS,
  DELIVERY_STATUS,
  DELIVERY_TRANSITIONS,
  PRIORITY,
  canTransition,
  getAllowedTransitions,
} from '../constants/index.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import logger from '../config/logger.config.js';
import {
  DeliveryNotFoundError,
  OrderNotFoundError,
  UserNotFoundError,
  ValidationError,
  InvalidStatusError,
  InvalidStatusTransitionError,
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

    // El pedido pasa a `assigned`, queda apuntando a la entrega y se
    // registra el evento en su historial.
    await orderService.attachDelivery(existingOrder, newDelivery);

    logger.info(`Entrega ${newDelivery._id} creada para el pedido ${order}`);

    return newDelivery;
  }

  /**
   * Cambio de estado de una entrega (lo que usara la app del repartidor).
   * Respeta la maquina de estados (`DELIVERY_TRANSITIONS`): assigned ->
   * picked_up -> in_transit -> delivered, sin saltos ni retrocesos. Cada
   * avance se refleja en el pedido asociado.
   */
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
    if (!canTransition(DELIVERY_TRANSITIONS, delivery.status, status)) {
      throw new InvalidStatusTransitionError(
        'la entrega',
        delivery.status,
        status,
        getAllowedTransitions(DELIVERY_TRANSITIONS, delivery.status)
      );
    }

    const updateData = { status };
    if (status === DELIVERY_STATUS.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    const updatedDelivery = await deliveryRepository.updateById(id, updateData);

    // `delivery.order` viene populado: es null si el pedido fue borrado.
    if (delivery.order) {
      await orderService.syncStatusFromDelivery(delivery.order._id, delivery._id, status);
    }

    logger.info(`Entrega ${updatedDelivery._id} actualizada a: ${status}`);

    return updatedDelivery;
  }

  /**
   * Borrado en cascada pedido <-> entrega: al eliminar una entrega, el
   * pedido deja de apuntar a ella y (si seguia en curso) vuelve a `created`.
   */
  async deleteDelivery(id) {
    const deleted = await deliveryRepository.deleteById(id);
    if (!deleted) {
      throw new DeliveryNotFoundError();
    }

    if (deleted.order) {
      await orderService.detachDelivery(deleted.order, deleted._id);
    }

    return deleted;
  }
}

export default new DeliveryService();
