import config from '../config/env.config.js';
import logger from '../config/logger.config.js';
import { haversineMeters } from '../utils/geo.js';

const FALLBACK_SPEED_MPS = (25 * 1000) / 3600; // 25 km/h urbano
const DETOUR_FACTOR = 1.3; // la calle es más larga que la línea recta

class RoutingService {
  /** { minutes, distanceMeters, source: 'osrm' | 'estimate' }. Nunca lanza: si OSRM falla, estima. */
  async estimate(from, to) {
    if (config.geo.routing.enabled) {
      try {
        const url = `${config.geo.routing.url}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
        const response = await fetch(url, { headers: { 'User-Agent': config.geo.userAgent }, signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const route = (await response.json()).routes?.[0];
          if (route) {
            return { minutes: Math.max(1, Math.round(route.duration / 60)), distanceMeters: Math.round(route.distance), source: 'osrm' };
          }
        }
      } catch (error) {
        logger.warning(`OSRM no respondió, se usa estimación: ${error.message}`);
      }
    }
    const meters = haversineMeters(from, to) * DETOUR_FACTOR;
    return { minutes: Math.max(1, Math.round(meters / FALLBACK_SPEED_MPS / 60)), distanceMeters: Math.round(meters), source: 'estimate' };
  }
}

export default new RoutingService();