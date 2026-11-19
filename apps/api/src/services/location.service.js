import deliveryRepository from '../repositories/delivery.repository.js';
import locationRepository from '../repositories/location.repository.js';
import notificationService from './notification.service.js';
import routingService from './routing.service.js';
import { emitLocation } from '../realtime/socket.js';
import { parseOrThrow } from '../validators/auth.validator.js';
import { positionSchema } from '../validators/location.validator.js';
import { haversineMeters } from '../utils/geo.js';
import { DeliveryNotFoundError } from '../errors/index.js';
import { DELIVERY_STATUS, TRACKABLE_DELIVERY_STATUSES } from '../constants/index.js';
import config from '../config/env.config.js';
import logger from '../config/logger.config.js';

const ETA_TTL_MS = 60_000;
const TRAIL_LIMIT = 500;

// Estado en memoria (Render Free = una sola instancia). Todo se puede reconstruir desde la base.
const latest = new Map(); // deliveryId -> última posición
const lastPersistAt = new Map(); // deliveryId -> cuándo se guardó en Mongo
const lastSeenByDriver = new Map(); // driverId -> cuándo llegó el último ping
const arrivedNotified = new Set(); // entregas ya avisadas como "llegando"
const etaCache = new Map(); // deliveryId -> { at, value }

const fromRow = (row, delivery) => ({
  deliveryId: String(delivery._id),
  orderId: String(delivery.order._id),
  trackingCode: delivery.order.trackingCode ?? null,
  driverId: String(delivery.driver?._id ?? row.driver),
  driverName: delivery.driver ? `${delivery.driver.firstName} ${delivery.driver.lastName}` : '—',
  status: delivery.status,
  lat: row.point.coordinates[1],
  lng: row.point.coordinates[0],
  accuracy: row.accuracy,
  heading: row.heading,
  speed: row.speed,
  recordedAt: row.recordedAt.toISOString(),
});

class LocationService {
  /**
   * El repartidor manda UNA posición y se aplica a todas sus entregas activas.
   * Si llega antes de `minIntervalMs` del ping anterior se descarta sin error.
   */
  async recordDriverPosition(actor, body) {
    const position = parseOrThrow(positionSchema, body);
    const now = Date.now();
    const driverKey = String(actor._id);
    if (now - (lastSeenByDriver.get(driverKey) ?? 0) < config.geo.tracking.minIntervalMs) {
      return { accepted: false, reason: 'too_frequent', deliveries: 0 };
    }
    lastSeenByDriver.set(driverKey, now);

    const deliveries = await deliveryRepository.findAll({ driver: actor._id, status: { $in: [...TRACKABLE_DELIVERY_STATUSES] } });
    const active = deliveries.filter((delivery) => delivery.order);
    for (const delivery of active) {
      await this.#apply(actor, delivery, position, now);
    }
    return { accepted: true, deliveries: active.length };
  }

  async #apply(actor, delivery, position, now) {
    const id = String(delivery._id);
    const snapshot = {
      deliveryId: id,
      orderId: String(delivery.order._id),
      trackingCode: delivery.order.trackingCode ?? null,
      driverId: String(actor._id),
      driverName: `${actor.firstName} ${actor.lastName}`,
      status: delivery.status,
      ...position,
      recordedAt: new Date(now).toISOString(),
    };
    latest.set(id, snapshot);
    emitLocation(snapshot);

    // Mongo recibe un punto cada `persistIntervalMs` por entrega; el tiempo real va por socket.
    if (now - (lastPersistAt.get(id) ?? 0) >= config.geo.tracking.persistIntervalMs) {
      lastPersistAt.set(id, now);
      try {
        await locationRepository.create({
          delivery: delivery._id,
          driver: actor._id,
          point: { type: 'Point', coordinates: [position.lng, position.lat] },
          accuracy: position.accuracy,
          heading: position.heading,
          speed: position.speed,
        });
      } catch (error) {
        logger.error(`No se pudo guardar la posición de la entrega ${id}: ${error.message}`);
      }
    }

    if (delivery.status === DELIVERY_STATUS.IN_TRANSIT) {
      await this.#checkGeofence(delivery, position);
    }
  }

  /** Avisa "tu repartidor está llegando" una sola vez por entrega (la base lo garantiza con dedupeKey). */
  async #checkGeofence(delivery, position) {
    const id = String(delivery._id);
    const destination = delivery.order.deliveryLocation?.coordinates;
    if (!destination || arrivedNotified.has(id)) return;

    const meters = haversineMeters(position, { lat: destination[1], lng: destination[0] });
    if (meters > config.geo.tracking.geofenceMeters) return;

    arrivedNotified.add(id);
    try {
      await notificationService.notifyArriving(delivery.order._id);
    } catch (error) {
      arrivedNotified.delete(id);
      logger.error(`No se pudo avisar la llegada de la entrega ${id}: ${error.message}`);
    }
  }

  /** Posiciones de todas las entregas activas (carga inicial del mapa y reconciliación cada minuto). */
  async getLive() {
    const deliveries = (await deliveryRepository.findAll({ status: { $in: [...TRACKABLE_DELIVERY_STATUSES] } }, { limit: 200 })).filter(
      (delivery) => delivery.order
    );
    const ids = new Set(deliveries.map((delivery) => String(delivery._id)));
    for (const map of [latest, etaCache, lastPersistAt]) {
      for (const key of map.keys()) if (!ids.has(key)) map.delete(key);
    }

    const rows = await locationRepository.latestByDeliveries(deliveries.map((delivery) => delivery._id));
    const rowByDelivery = new Map(rows.map((row) => [String(row.delivery), row]));

    const data = [];
    for (const delivery of deliveries) {
      const id = String(delivery._id);
      const row = rowByDelivery.get(id);
      const snapshot = latest.get(id) ?? (row && fromRow(row, delivery));
      if (!snapshot) continue;
      const eta = await this.etaFor(id, snapshot, delivery.order.deliveryLocation?.coordinates);
      data.push({ ...snapshot, status: delivery.status, eta });
    }
    return { data, generatedAt: new Date().toISOString() };
  }

  /** Última posición conocida (memoria o base). Uso: portal público. */
  async getLatest(deliveryId) {
    const id = String(deliveryId);
    if (latest.has(id)) return latest.get(id);
    const [row] = await locationRepository.latestByDeliveries([id]);
    if (!row) return null;
    return { lat: row.point.coordinates[1], lng: row.point.coordinates[0], recordedAt: row.recordedAt.toISOString() };
  }

  /** ETA al destino, cacheado 60 s por entrega para no martillar a OSRM. `null` si el pedido no tiene destino. */
  async etaFor(deliveryId, from, destination) {
    if (!destination) return null;
    const cached = etaCache.get(deliveryId);
    if (cached && Date.now() - cached.at < ETA_TTL_MS) return cached.value;
    const value = await routingService.estimate({ lat: from.lat, lng: from.lng }, { lat: destination[1], lng: destination[0] });
    etaCache.set(deliveryId, { at: Date.now(), value });
    return value;
  }

  async getTrail(deliveryId) {
    const delivery = await deliveryRepository.findById(deliveryId);
    if (!delivery) throw new DeliveryNotFoundError();
    const rows = await locationRepository.findTrail(delivery._id, TRAIL_LIMIT);
    return {
      delivery: String(delivery._id),
      points: rows.map((row) => ({ lat: row.point.coordinates[1], lng: row.point.coordinates[0], recordedAt: row.recordedAt })),
    };
  }
}

export default new LocationService();