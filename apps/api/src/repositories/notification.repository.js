import Notification from '../models/notification.model.js';
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUS } from '../constants/index.js';

class NotificationRepository {
  /** Crea la fila; si el dedupeKey ya existe devuelve null (el aviso ya estaba encolado). */
  async create(data) {
    try {
      return await Notification.create(data);
    } catch (error) {
      if (error.code === 11000) return null;
      throw error;
    }
  }

  /**
   * Toma UNA fila pendiente y vencida de forma atómica: cuenta el intento y adelanta
   * `nextAttemptAt` (lease), así dos procesos no envían el mismo aviso.
   */
  async claim(filter, leaseMs) {
    const now = new Date();
    return Notification.findOneAndUpdate(
      { ...filter, status: NOTIFICATION_STATUS.PENDING, nextAttemptAt: { $lte: now } },
      { $set: { nextAttemptAt: new Date(now.getTime() + leaseMs) }, $inc: { attempts: 1 } },
      { new: true, sort: { nextAttemptAt: 1 } }
    );
  }

  async update(id, patch) {
    return Notification.updateOne({ _id: id }, { $set: patch });
  }

  async findInApp(userId, { unreadOnly = false, skip = 0, limit = 20 } = {}) {
    return Notification.find({ user: userId, channel: NOTIFICATION_CHANNELS.IN_APP, ...(unreadOnly ? { readAt: null } : {}) })
      .select('type title body data readAt createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countInApp(userId, { unreadOnly = false } = {}) {
    return Notification.countDocuments({
      user: userId,
      channel: NOTIFICATION_CHANNELS.IN_APP,
      ...(unreadOnly ? { readAt: null } : {}),
    });
  }

  /** Marca como leídas (solo las del usuario). Sin `ids`, todas. Devuelve cuántas cambiaron. */
  async markRead(userId, ids) {
    const result = await Notification.updateMany(
      { user: userId, channel: NOTIFICATION_CHANNELS.IN_APP, readAt: null, ...(ids ? { _id: { $in: ids } } : {}) },
      { $set: { readAt: new Date() } }
    );
    return result.modifiedCount;
  }
}

export default new NotificationRepository();