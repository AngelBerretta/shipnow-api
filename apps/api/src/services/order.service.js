import orderRepository from '../repositories/order.repository.js';
import userRepository from '../repositories/user.repository.js';
import deliveryRepository from '../repositories/delivery.repository.js';
import orderEventService from './orderEvent.service.js';
import {
  ROLES,
  ORDER_STATUS,
  PRIORITY,
  ORDER_EVENT_TYPES,
  ORDER_TRANSITIONS,
  canTransition,
  getAllowedTransitions,
} from '../constants/index.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { generateTrackingCode } from '../utils/trackingCode.js';
import logger from '../config/logger.config.js';
import {
  OrderNotFoundError,
  UserNotFoundError,
  ValidationError,
  InvalidStatusError,
  InvalidStatusTransitionError,
  ForbiddenActionError,
  OrderAlreadyDeliveredError,
  OrderHasActiveDeliveryError,
} from '../errors/index.js';
import { assertAllowed, canAccessOrder } from '../policies/access.policy.js';
import geocodingService from './geocoding.service.js';

const SHIPPING_COST_PER_UNIT = 10;
const MAX_TRACKING_CODE_ATTEMPTS = 5;

class OrderService {
  /**
   * Listado paginado de pedidos. Nunca devuelve la colección completa
   * sin control (ver utils/pagination.js). Admite filtrar por `status`,
   * `customer` y `store` (?status=created&customer=<id>&store=<id>).
   */
  async getAllOrders(query = {}, actor) {
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
    if (query.store) {
      filter.store = query.store;
    }

    // El alcance por rol se aplica ULTIMO: pisa cualquier filtro del query.
    Object.assign(filter, await this.#scopeFilterFor(actor));

    const [orders, total] = await Promise.all([
      orderRepository.findAll(filter, { skip: pagination.skip, limit: pagination.limit }),
      orderRepository.countAll(filter),
    ]);

    return { data: orders, pagination: buildPaginationMeta(pagination, total) };
  }

  async getOrderById(id, actor) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new OrderNotFoundError();
    }
    assertAllowed(!actor || canAccessOrder(actor, order));
    return order;
  }

  /** Historial (linea de tiempo) de un pedido. */
  async getOrderEvents(id, actor) {
    if (actor) {
      await this.getOrderById(id, actor); // 404 o 403 antes de exponer el historial
    }
    return orderEventService.getTimeline(id);
  }

  async createOrder(input, actor, { source } = {}) {
    const { items, deliveryAddress, priority } = input;
    const { customer, store } = this.#resolveCreationParties(input, actor);
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

    if (store) {
      const storeUser = await userRepository.findById(store);
      if (!storeUser) {
        throw new UserNotFoundError('La tienda no existe');
      }
      if (storeUser.role !== ROLES.STORE) {
        throw new ValidationError(`El usuario indicado como tienda no tiene rol de tienda (rol actual: ${storeUser.role})`);
      }
    }

    const total = this.#calculateTotal(items);

    const newOrder = await this.#createWithUniqueTrackingCode({
      customer,
      store: store || null,
      items,
      deliveryAddress,
      total,
      priority: priority || PRIORITY.NORMAL,
      status: ORDER_STATUS.CREATED,
      ...(source ? { source } : {}),
    });

    await orderEventService.record({
      order: newOrder._id,
      type: ORDER_EVENT_TYPES.ORDER_CREATED,
      toStatus: ORDER_STATUS.CREATED,
    });

    logger.info(
      `Pedido ${newOrder._id} (${newOrder.trackingCode}) creado correctamente (cliente: ${customer}, total: $${total})`
    );
    // Best-effort y en segundo plano (Nominatim: 1 req/s). Alimenta ETA y geocerca.
    geocodingService.geocodeOrderSoon(newOrder);

    const shippingCost = this.#calculateShippingCost(newOrder.items);

    return { order: newOrder, shippingCost };
  }

  /**
   * Cambio manual de estado de un pedido (PATCH /api/orders/:oid/status).
   * Respeta la maquina de estados (`ORDER_TRANSITIONS` de @ruvika/shared):
   * no se puede saltar de `created` a `delivered`, retroceder, ni repetir
   * el estado actual.
   */
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
    if (!canTransition(ORDER_TRANSITIONS, order.status, status)) {
      throw new InvalidStatusTransitionError(
        'el pedido',
        order.status,
        status,
        getAllowedTransitions(ORDER_TRANSITIONS, order.status)
      );
    }
    // Un pedido con entrega asociada no se cancela "por arriba": primero
    // hay que eliminar la entrega (lo que lo devuelve a `created`).
    if (status === ORDER_STATUS.CANCELLED && order.delivery) {
      throw new OrderHasActiveDeliveryError();
    }

    return this.#applyStatus(order, status, {
      type: ORDER_EVENT_TYPES.STATUS_CHANGED,
    });
  }

  /**
   * Borrado en cascada: al eliminar un pedido se eliminan tambien su
   * entrega y su historial, para no dejar entregas huerfanas apuntando
   * a un pedido que ya no existe.
   */
  async deleteOrder(id) {
    const order = await orderRepository.findByIdPlain(id);
    if (!order) {
      throw new OrderNotFoundError();
    }

    const deletedDeliveries = await deliveryRepository.deleteManyByOrder(order._id);
    await orderEventService.deleteByOrder(order._id);
    const deleted = await orderRepository.deleteById(id);

    logger.info(`Pedido ${id} eliminado (entregas eliminadas en cascada: ${deletedDeliveries})`);

    return deleted;
  }

  // -------------------------------------------------------------------
  // Operaciones que dispara el DeliveryService para mantener el pedido
  // coherente con su entrega (ver delivery.service.js).
  // -------------------------------------------------------------------

  /**
   * Una entrega nueva queda asociada al pedido, que pasa a `assigned`.
   * `order` es el pedido tal cual lo leyo el DeliveryService (ya validado
   * en estado `created`).
   */
  async attachDelivery(order, delivery) {
    const updated = await orderRepository.updateById(order._id, {
      status: ORDER_STATUS.ASSIGNED,
      delivery: delivery._id,
    });
    await orderEventService.record({
      order: order._id,
      type: ORDER_EVENT_TYPES.DELIVERY_ASSIGNED,
      fromStatus: order.status,
      toStatus: ORDER_STATUS.ASSIGNED,
      delivery: delivery._id,
    });
    return updated;
  }

  /**
   * La entrega avanzo (assigned/picked_up/in_transit/delivered): el pedido
   * refleja el mismo estado. Es tolerante a proposito: si el pedido ya esta
   * en ese estado, o la transicion no es valida desde donde esta (alguien
   * lo movio a mano), no se bloquea al repartidor: se deja constancia en el
   * log y se sigue.
   */
  async syncStatusFromDelivery(orderId, deliveryId, status) {
    const order = await orderRepository.findByIdPlain(orderId);
    if (!order || order.status === status) {
      return order;
    }
    if (!canTransition(ORDER_TRANSITIONS, order.status, status)) {
      logger.warning(
        `Pedido ${orderId} no se sincronizo con la entrega ${deliveryId}: transicion "${order.status}" -> "${status}" no permitida`
      );
      return order;
    }
    return this.#applyStatus(order, status, {
      type: ORDER_EVENT_TYPES.DELIVERY_STATUS_CHANGED,
      deliveryId,
    });
  }

  /**
   * Se elimino una entrega: el pedido deja de apuntar a ella y, si todavia
   * estaba en curso, vuelve a `created` para poder asignarse de nuevo. Un
   * pedido ya entregado o cancelado conserva su estado.
   */
  async detachDelivery(orderId, deliveryId) {
    const order = await orderRepository.findByIdPlain(orderId);
    if (!order || String(order.delivery) !== String(deliveryId)) {
      return order;
    }

    const isInProgress = ![ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.CREATED].includes(order.status);
    const updated = await orderRepository.updateById(orderId, {
      delivery: null,
      ...(isInProgress ? { status: ORDER_STATUS.CREATED } : {}),
    });
    await orderEventService.record({
      order: order._id,
      type: ORDER_EVENT_TYPES.DELIVERY_REMOVED,
      fromStatus: isInProgress ? order.status : null,
      toStatus: isInProgress ? ORDER_STATUS.CREATED : null,
      delivery: deliveryId,
    });
    return updated;
  }

  // -------------------------------------------------------------------
  // Helpers privados
  // -------------------------------------------------------------------

  /** Persiste el cambio de estado y deja el evento correspondiente en el historial. */
  async #applyStatus(order, status, { type, deliveryId = null }) {
    const updatedOrder = await orderRepository.updateById(order._id, { status });
    await orderEventService.record({
      order: order._id,
      type,
      fromStatus: order.status,
      toStatus: status,
      delivery: deliveryId,
    });
    logger.info(`Pedido ${updatedOrder._id} actualizado a estado: ${status}`);
    return updatedOrder;
  }

  /**
   * Crea el pedido con un codigo de seguimiento nuevo. El codigo es
   * aleatorio y el indice de Mongo garantiza su unicidad: en el caso
   * (muy improbable) de colision se reintenta con otro codigo.
   */
  async #createWithUniqueTrackingCode(data) {
    let attempt = 1;
    for (;;) {
      try {
        return await orderRepository.create({ ...data, trackingCode: generateTrackingCode() });
      } catch (error) {
        const isTrackingCodeCollision = error.code === 11000 && Boolean(error.keyPattern?.trackingCode);
        if (!isTrackingCodeCollision || attempt >= MAX_TRACKING_CODE_ATTEMPTS) {
          throw error;
        }
        attempt += 1;
        logger.warning(`Colision de codigo de seguimiento, reintentando (intento ${attempt})`);
      }
    }
  }

  #calculateTotal(items) {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }

  #calculateShippingCost(items) {
    return items.reduce((acc, item) => acc + item.quantity * SHIPPING_COST_PER_UNIT, 0);
  }

  /** Filtro de Mongo con lo que cada rol puede ver. Sin actor (llamada interna) no se acota. */
  async #scopeFilterFor(actor) {
    if (!actor || actor.role === ROLES.ADMIN) return {};
    if (actor.role === ROLES.CUSTOMER) return { customer: actor._id };
    if (actor.role === ROLES.STORE) return { store: actor._id };
    if (actor.role === ROLES.DRIVER) {
      return { _id: { $in: await deliveryRepository.findOrderIdsByDriver(actor._id) } };
    }
    throw new ForbiddenActionError();
  }

  /**
   * Un customer solo crea pedidos a su nombre y una tienda solo de su tienda:
   * se fuerzan al id del actor, y si el body trae otro distinto, 403.
   */
  #resolveCreationParties({ customer, store }, actor) {
    if (!actor || actor.role === ROLES.ADMIN) return { customer, store };
    const me = String(actor._id);

    if (actor.role === ROLES.CUSTOMER) {
      if (customer && String(customer) !== me) {
        throw new ForbiddenActionError('Solo podes crear pedidos a tu nombre');
      }
      return { customer: me, store };
    }
    if (actor.role === ROLES.STORE) {
      if (store && String(store) !== me) {
        throw new ForbiddenActionError('Solo podes crear pedidos de tu tienda');
      }
      return { customer, store: me };
    }
    throw new ForbiddenActionError();
  }

}

export default new OrderService();
