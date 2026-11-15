import { describe, expect, it } from 'vitest';
import { canCancelOrder, formatDayKey, nextDeliveryStatus } from './format';

describe('format', () => {
  it('avanza la entrega siguiendo la maquina de estados compartida', () => {
    expect(nextDeliveryStatus('assigned')).toBe('picked_up');
    expect(nextDeliveryStatus('in_transit')).toBe('delivered');
    expect(nextDeliveryStatus('delivered')).toBeNull();
  });

  it('solo permite cancelar pedidos que no estan en un estado final', () => {
    expect(canCancelOrder('created')).toBe(true);
    expect(canCancelOrder('delivered')).toBe(false);
    expect(canCancelOrder('cancelled')).toBe(false);
  });

  it('formatea la clave de dia sin tocar zonas horarias', () => {
    expect(formatDayKey('2026-11-05')).toBe('05/11');
  });
});
