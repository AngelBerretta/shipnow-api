import mongoose from 'mongoose';
import Location from '../models/location.model.js';

class LocationRepository {
  async create(data) {
    return Location.create(data);
  }

  /** Recorrido en orden cronológico (los últimos `limit` puntos). */
  async findTrail(deliveryId, limit) {
    const rows = await Location.find({ delivery: deliveryId }).sort({ recordedAt: -1, _id: -1 }).limit(limit).lean();
    return rows.reverse();
  }

  /** Última posición de cada entrega, en una sola consulta. */
  async latestByDeliveries(ids) {
    if (ids.length === 0) return [];
    return Location.aggregate([
      { $match: { delivery: { $in: ids.map((id) => new mongoose.Types.ObjectId(String(id))) } } },
      { $sort: { recordedAt: -1, _id: -1 } },
      { $group: { _id: '$delivery', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);
  }
}

export default new LocationRepository();