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

const rateLimitHandler = (_req, _res, next) => next(new TooManyRequestsError());

/** Tope general por IP del seguimiento público (cubre el refresco automático del portal). */
export const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.tracking.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/** Cuenta SOLO las consultas que fallan (4xx): frena el barrido de códigos sin molestar a un cliente normal. */
export const trackingMissLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.tracking.missLimitMax,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/** Webhooks entrantes: tope por IP por minuto. */
export const inboundLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.integrations.inboundRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});