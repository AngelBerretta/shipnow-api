import { describe, expect, it } from 'vitest';
import type { QueuedAction } from '../offline/db';
import type { Delivery } from './types';
import { effectiveStatus, googleMapsUrl, hasPending, nextStatus, sortActive, wazeUrl } from './deliveries';

const status = (deliveryId: string, to: 'picked_up' | 'in_transit' | 'delivered'): QueuedAction => ({
  userId: 'u1',
  createdAt: 1,
  type: 'status',
  deliveryId,
  status: to,
});

describe('deliveries', () => {
  it('avanza siguiendo la máquina de estados compartida', () => {
    expect(nextStatus('assigned')).toBe('picked_up');
    expect(nextStatus('picked_up')).toBe('in_transit');
    expect(nextStatus('in_transit')).toBe('delivered');
    expect(nextStatus('delivered')).toBeUndefined();
  });

  it('aplica los cambios en cola sobre el estado del servidor, solo de esa entrega', () => {
    const queue = [status('d1', 'picked_up'), status('d1', 'in_transit'), status('d2', 'delivered')];

    expect(effectiveStatus({ _id: 'd1', status: 'assigned' }, queue)).toBe('in_transit');
    expect(effectiveStatus({ _id: 'd3', status: 'assigned' }, queue)).toBe('assigned');
  });

  it('un cambio en cola no hace retroceder un estado que el servidor ya superó', () => {
    expect(effectiveStatus({ _id: 'd1', status: 'in_transit' }, [status('d1', 'picked_up')])).toBe('in_transit');
  });

  it('detecta cambios pendientes de una entrega, incluidas las fotos', () => {
    const photo: QueuedAction = {
      userId: 'u1',
      createdAt: 2,
      type: 'proof',
      deliveryId: 'd1',
      blob: new Blob(['x']),
      filename: 'a.jpg',
      mimeType: 'image/jpeg',
    };
    const availability: QueuedAction = { userId: 'u1', createdAt: 3, type: 'availability', isAvailable: false };

    expect(hasPending('d1', [photo])).toBe(true);
    expect(hasPending('d1', [availability])).toBe(false);
  });

  it('ordena las activas: urgentes primero y luego las más antiguas', () => {
    const make = (_id: string, priority: Delivery['priority'], assignedAt: string) =>
      ({ _id, priority, assignedAt }) as Delivery;

    const sorted = sortActive([make('a', 'normal', '2026-11-01'), make('b', 'high', '2026-11-03'), make('c', 'normal', '2026-10-30')]);

    expect(sorted.map((d) => d._id)).toEqual(['b', 'c', 'a']);
  });

  it('codifica la dirección en los enlaces de navegación', () => {
    expect(googleMapsUrl('San Martin 12, Chivilcoy')).toContain('destination=San%20Martin%2012%2C%20Chivilcoy');
    expect(wazeUrl('San Martin 12, Chivilcoy')).toContain('q=San%20Martin%2012%2C%20Chivilcoy');
  });
});