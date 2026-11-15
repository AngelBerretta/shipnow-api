import jwt from 'jsonwebtoken';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import config from '../config/env.config.js';
import { UnauthorizedError, TokenExpiredError } from '../errors/index.js';

const JWT_ALGORITHM = 'HS256';

export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: String(user._id),
    algorithm: JWT_ALGORITHM,
    expiresIn: config.auth.accessTokenTtlSeconds,
  });
}

/** Devuelve el payload o lanza TOKEN_EXPIRED / UNAUTHORIZED. */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret, { algorithms: [JWT_ALGORITHM] });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new TokenExpiredError();
    }
    throw new UnauthorizedError('El token de acceso no es valido');
  }
}

/** Token opaco de 384 bits: no es un JWT, no lleva datos, solo vale si esta en la base. */
export const generateRefreshToken = () => randomBytes(48).toString('base64url');
export const generateTokenFamily = () => randomUUID();
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');