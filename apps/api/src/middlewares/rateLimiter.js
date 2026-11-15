import rateLimit from 'express-rate-limit';
import config from '../config/env.config.js';
import { TooManyRequestsError } from '../errors/index.js';

/** Limite por IP para login/refresh/logout (fuerza bruta). Responde con el formato uniforme de errores. */
export const authLimiter = rateLimit({
  windowMs: config.auth.rateLimitWindowMinutes * 60 * 1000,
  limit: config.auth.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(new TooManyRequestsError()),
});