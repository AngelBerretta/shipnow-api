import PushSubscription from '../models/pushSubscription.model.js';

class PushSubscriptionRepository {
  /** Si el navegador ya estaba suscripto (otro usuario en el mismo celular), pasa a ser del usuario actual. */
  async upsert(userId, { endpoint, keys, userAgent }) {
    return PushSubscription.findOneAndUpdate(
      { endpoint },
      { $set: { user: userId, keys, userAgent: userAgent ?? '' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async findByUser(userId) {
    return PushSubscription.find({ user: userId });
  }

  async deleteByEndpoint(endpoint, userId) {
    return PushSubscription.deleteOne({ endpoint, ...(userId ? { user: userId } : {}) });
  }
}

export default new PushSubscriptionRepository();