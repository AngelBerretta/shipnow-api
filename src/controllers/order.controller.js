import orderService from '../services/order.service.js';

export async function getAll(req, res, next) {
  try {
    const result = await orderService.getAllOrders(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const order = await orderService.getOrderById(req.params.oid);
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const { order, shippingCost } = await orderService.createOrder(req.body);
    res.status(201).json({
      order,
      shippingCost,
      message: 'Pedido creado y email enviado',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const updatedOrder = await orderService.updateOrderStatus(req.params.oid, req.body.status);
    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await orderService.deleteOrder(req.params.oid);
    res.json({ message: 'Pedido eliminado' });
  } catch (error) {
    next(error);
  }
}
