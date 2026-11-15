import { randomInt } from 'node:crypto';
import { TRACKING_CODE } from '@ruvika/shared';

/**
 * Genera un codigo de seguimiento publico para un pedido, con el formato
 * definido en `@ruvika/shared` (ej: "RV-7K2M9QX4TB").
 *
 * Es aleatorio (crypto.randomInt, no Math.random) y NO secuencial: un
 * codigo no permite adivinar el de otro pedido. La unicidad la garantiza
 * el indice unico de Mongo; `order.service.js` reintenta si hay colision.
 */
export function generateTrackingCode() {
  const { PREFIX, ALPHABET, LENGTH } = TRACKING_CODE;
  let code = '';
  for (let i = 0; i < LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${PREFIX}-${code}`;
}
