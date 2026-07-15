import deliveryRepository from '../repositories/delivery.repository.js';
import orderRepository from '../repositories/order.repository.js';
import userRepository from '../repositories/user.repository.js';
import ApiError from '../utils/ApiError.js';
import { ROLES, ORDER_STATUS, DELIVERY_STATUS, PRIORITY } from '../constants/index.js';

class DeliveryService {
  async getAllDeliveries() {
    return deliveryRepository.findAll();
  }

  async getDeliveryById(id) {
    const delivery = await deliveryRepository.findById(id);
    if (!delivery) {
      throw new ApiError(404, 'Entrega no encontrada');
    }
    return delivery;
  }

  async createDelivery({ order, driver, priority }) {
    if (!order) {
      throw new ApiError(400, 'El pedido es obligatorio');
    }
    if (!driver) {
      throw new ApiError(400, 'El repartidor es obligatorio');
    }

    const existingOrder = await orderRepository.findById(order);
    if (!existingOrder) {
      throw new ApiError(404, 'El pedido no existe');
    }

    const existingDriver = await userRepository.findById(driver);
    if (!existingDriver) {
      throw new ApiError(404, 'El repartidor no existe');
    }
    if (existingDriver.role !== ROLES.DRIVER) {
      throw new ApiError(400, `El usuario no tiene rol de repartidor (rol actual: ${existingDriver.role})`);
    }

    if (existingOrder.status !== ORDER_STATUS.CREATED) {
      throw new ApiError(409, `El pedido ya fue asignado o procesado (estado actual: ${existingOrder.status})`);
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

    console.log(`Entrega ${newDelivery._id} creada para el pedido ${order}`);

    return newDelivery;
  }

  async updateDeliveryStatus(id, status) {
    if (!status) {
      throw new ApiError(400, 'El estado es obligatorio');
    }
    if (!Object.values(DELIVERY_STATUS).includes(status)) {
      throw new ApiError(400, `Estado invalido. Valores permitidos: ${Object.values(DELIVERY_STATUS).join(', ')}`);
    }

    const delivery = await deliveryRepository.findById(id);
    if (!delivery) {
      throw new ApiError(404, 'Entrega no encontrada');
    }
    if (delivery.status === DELIVERY_STATUS.DELIVERED) {
      throw new ApiError(409, 'La entrega ya fue completada');
    }

    const updateData = { status };
    if (status === DELIVERY_STATUS.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    const updatedDelivery = await deliveryRepository.updateById(id, updateData);

    if (status === DELIVERY_STATUS.DELIVERED) {
      await orderRepository.updateById(delivery.order, { status: ORDER_STATUS.DELIVERED });
    }

    console.log(`Entrega ${updatedDelivery._id} actualizada a: ${status}`);

    return updatedDelivery;
  }

  async deleteDelivery(id) {
    const deleted = await deliveryRepository.deleteById(id);
    if (!deleted) {
      throw new ApiError(404, 'Entrega no encontrada');
    }
    return deleted;
  }
}

export default new DeliveryService();
