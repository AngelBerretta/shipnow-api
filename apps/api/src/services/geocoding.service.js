import orderRepository from '../repositories/order.repository.js';
import config from '../config/env.config.js';
import logger from '../config/logger.config.js';

const MIN_GAP_MS = 1100; // política de Nominatim: máximo 1 petición por segundo
const MAX_QUEUE = 50;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class GeocodingService {
  #chain = Promise.resolve();
  #waiting = 0;
  #lastRequestAt = 0;

  /** Encola la geocodificación y devuelve de inmediato: crear un pedido nunca espera a Nominatim. */
  geocodeOrderSoon(order) {
    if (!config.geo.geocoder.enabled) return false;
    if (this.#waiting >= MAX_QUEUE) {
      logger.warning(`Cola de geocodificación llena: el pedido ${order._id} queda sin ubicación`);
      return false;
    }
    this.#waiting += 1;
    const { _id, deliveryAddress } = order;
    this.#chain = this.#chain
      .then(() => this.#geocode(_id, deliveryAddress))
      .catch((error) => logger.warning(`No se pudo geocodificar el pedido ${_id}: ${error.message}`))
      .finally(() => {
        this.#waiting -= 1;
      });
    return true;
  }

  async #geocode(orderId, address) {
    await sleep(Math.max(0, this.#lastRequestAt + MIN_GAP_MS - Date.now()));
    this.#lastRequestAt = Date.now();

    const { url, countryCodes } = config.geo.geocoder;
    const params = new URLSearchParams({ q: address, format: 'jsonv2', limit: '1', countrycodes: countryCodes });
    const response = await fetch(`${url}/search?${params}`, {
      headers: { 'User-Agent': config.geo.userAgent, 'Accept-Language': 'es' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Nominatim respondió ${response.status}`);

    const [match] = await response.json();
    if (!match) {
      await orderRepository.updateById(orderId, { geocodeStatus: 'failed' });
      return;
    }
    await orderRepository.updateById(orderId, {
      deliveryLocation: { type: 'Point', coordinates: [Number(match.lon), Number(match.lat)] },
      geocodeStatus: 'ok',
    });
  }
}

export default new GeocodingService();