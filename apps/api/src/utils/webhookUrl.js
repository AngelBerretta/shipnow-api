import config from '../config/env.config.js';

const PRIVATE_V4 = /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function isPrivateHost(host) {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (PRIVATE_V4.test(h)) return true;
  return h.includes(':') && (h === '::1' || /^(fc|fd|fe80)/.test(h));
}

/**
 * En producción: solo https y hosts públicos (evita que un webhook apunte a la red interna).
 * No resuelve DNS: un dominio público que apunte a una IP privada no se detecta.
 */
export function isSafeWebhookUrl(value, production = config.isProduction) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (!production) return true;
  return url.protocol === 'https:' && !isPrivateHost(url.hostname);
}