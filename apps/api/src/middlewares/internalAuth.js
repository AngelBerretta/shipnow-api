import { createHash, timingSafeEqual } from 'node:crypto';
import config from '../config/env.config.js';
import { UnauthorizedError } from '../errors/index.js';

const digest = (value) => createHash('sha256').update(String(value)).digest();

/**
 * Protege /api/internal con el header `x-internal-secret` (lo manda GitHub Actions).
 * Se compara el hash en tiempo constante. Sin INTERNAL_API_SECRET configurado, siempre rechaza.
 */
export function requireInternalSecret(req, _res, next) {
  const expected = config.internalApiSecret;
  const received = req.headers['x-internal-secret'];
  if (!expected || typeof received !== 'string' || !timingSafeEqual(digest(received), digest(expected))) {
    return next(new UnauthorizedError('Secreto interno inválido'));
  }
  return next();
}