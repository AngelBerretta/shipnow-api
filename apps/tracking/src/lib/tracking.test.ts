import { describe, expect, it } from 'vitest';
import { isFinal, isValidCode, normalizeCode, STEPS, whatsappUrl } from './tracking';

describe('tracking', () => {
  it('normaliza mayúsculas, espacios y el código sin prefijo', () => {
    expect(normalizeCode(' rv-7k2m9qx4tb ')).toBe('RV-7K2M9QX4TB');
    expect(normalizeCode('7k2m 9qx4tb')).toBe('RV-7K2M9QX4TB');
  });

  it('valida el formato compartido con la API', () => {
    expect(isValidCode('RV-7K2M9QX4TB')).toBe(true);
    expect(isValidCode('7k2m9qx4tb')).toBe(true);
    expect(isValidCode('RV-7K2M9QX4T0')).toBe(false); // el 0 es ambiguo y no existe en el alfabeto
    expect(isValidCode('hola')).toBe(false);
  });

  it('el progreso sigue el ciclo del pedido', () => {
    expect(STEPS).toEqual(['created', 'assigned', 'picked_up', 'in_transit', 'delivered']);
  });

  it('delivered y cancelled son estados finales', () => {
    expect(isFinal('delivered')).toBe(true);
    expect(isFinal('cancelled')).toBe(true);
    expect(isFinal('in_transit')).toBe(false);
    expect(isFinal(undefined)).toBe(false);
  });

  it('arma el enlace de WhatsApp con el mensaje codificado', () => {
    const url = whatsappUrl('RV-7K2M9QX4TB', 'https://portal.example/seguimiento/RV-7K2M9QX4TB');
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(url)).toContain('RV-7K2M9QX4TB');
  });
});