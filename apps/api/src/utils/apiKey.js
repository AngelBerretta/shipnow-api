import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const KEY_PATTERN = /^rvk_([a-f0-9]{8})_[A-Za-z0-9_-]{32}$/;

export const hashApiKey = (key) => createHash('sha256').update(key).digest('hex');

/** Formato: rvk_<prefijo 8 hex>_<secreto 32>. El prefijo permite buscar sin guardar la key. */
export function generateApiKey() {
  const prefix = randomBytes(4).toString('hex');
  const key = `rvk_${prefix}_${randomBytes(24).toString('base64url')}`;
  return { key, prefix, hash: hashApiKey(key) };
}

export const generateWebhookSecret = () => `whsec_${randomBytes(24).toString('base64url')}`;

/** Devuelve el prefijo si la key tiene formato válido, o null. */
export const parseApiKey = (raw) => (typeof raw === 'string' ? raw.match(KEY_PATTERN)?.[1] ?? null : null);

export function safeEqualHex(a, b) {
  const x = Buffer.from(String(a), 'hex');
  const y = Buffer.from(String(b), 'hex');
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}