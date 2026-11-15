import deliveryService from '../services/delivery.service.js';

export async function getAll(req, res, next) {
  try {
    const result = await deliveryService.getAllDeliveries(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const delivery = await deliveryService.getDeliveryById(req.params.did);
    res.json(delivery);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const newDelivery = await deliveryService.createDelivery(req.body);
    res.status(201).json(newDelivery);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const updatedDelivery = await deliveryService.updateDeliveryStatus(req.params.did, req.body.status);
    res.json(updatedDelivery);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await deliveryService.deleteDelivery(req.params.did);
    res.json({ message: 'Entrega eliminada' });
  } catch (error) {
    next(error);
  }
}
