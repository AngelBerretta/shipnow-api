import mockService from '../services/mock.service.js';

/**
 * MockController
 * Igual que el resto de los controllers: solo lee req, llama al Service
 * correspondiente y responde. No genera ningun dato a mano ni conoce
 * Mongoose.
 */

export async function previewUsers(req, res, next) {
  try {
    const { count, role } = req.query;
    const users = mockService.previewUsers(count, role);
    res.json({ persisted: false, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
}

export async function previewOrders(req, res, next) {
  try {
    const { count } = req.query;
    const orders = mockService.previewOrders(count);
    res.json({ persisted: false, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
}

export async function previewDeliveries(req, res, next) {
  try {
    const { count } = req.query;
    const deliveries = mockService.previewDeliveries(count);
    res.json({ persisted: false, count: deliveries.length, data: deliveries });
  } catch (error) {
    next(error);
  }
}

export async function previewFull(req, res, next) {
  try {
    const { users, orders, deliveries } = req.query;
    const dataset = mockService.previewFullDataset({ users, orders, deliveries });
    res.json({ persisted: false, ...dataset });
  } catch (error) {
    next(error);
  }
}

export async function seed(req, res, next) {
  try {
    const { users, orders, deliveries } = req.body;
    const result = await mockService.seedDatabase({ users, orders, deliveries });
    res.status(201).json({ persisted: true, ...result });
  } catch (error) {
    next(error);
  }
}
