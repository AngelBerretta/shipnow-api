import bcrypt from 'bcryptjs';
import config from '../config/env.config.js';

/**
 * Utilidades de contraseñas. Es la UNICA pieza del proyecto que conoce
 * bcrypt: el resto (Services, scripts) solo llama a estas funciones.
 *
 * Se usa `bcryptjs` (JavaScript puro, API identica a `bcrypt`) para no
 * depender de compilacion nativa ni de binarios precompilados en
 * Alpine/Render/Windows. El costo (rounds) sale de la config.
 */

/** Detecta si un valor ya es un hash bcrypt ($2a$/$2b$/$2y$ + costo + 53 caracteres). */
const BCRYPT_HASH_PATTERN = /^\$2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export function isBcryptHash(value) {
  return typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value);
}

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, config.bcryptRounds);
}

export function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}
