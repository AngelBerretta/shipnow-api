import notificationService from '../services/notification.service.js';

export async function list(req, res, next) {
  try {
    res.json(await notificationService.listMine(req.query, req.user));
  } catch (error) {
    next(error);
  }
}

export async function unreadCount(req, res, next) {
  try {
    res.json(await notificationService.unreadCount(req.user));
  } catch (error) {
    next(error);
  }
}

export async function markRead(req, res, next) {
  try {
    res.json(await notificationService.markRead(req.body, req.user));
  } catch (error) {
    next(error);
  }
}

export function pushPublicKey(req, res, next) {
  try {
    res.json(notificationService.pushPublicKey());
  } catch (error) {
    next(error);
  }
}

export async function pushSubscribe(req, res, next) {
  try {
    await notificationService.subscribePush(req.body, req.user, req.get('user-agent'));
    res.status(201).json({ message: 'Dispositivo suscripto' });
  } catch (error) {
    next(error);
  }
}

export async function pushUnsubscribe(req, res, next) {
  try {
    await notificationService.unsubscribePush(req.body, req.user);
    res.json({ message: 'Suscripción eliminada' });
  } catch (error) {
    next(error);
  }
}