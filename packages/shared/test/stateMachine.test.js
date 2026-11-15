import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_STATUS,
  DELIVERY_STATUS,
  ORDER_TRANSITIONS,
  DELIVERY_TRANSITIONS,
  TRACKING_CODE,
  canTransition,
  getAllowedTransitions,
  isFinalStatus,
} from '../src/index.js';

describe('maquinas de estados', () => {
  it('toda clave y todo destino de ORDER_TRANSITIONS es un estado de pedido valido', () => {
    const valid = Object.values(ORDER_STATUS);
    assert.deepEqual(Object.keys(ORDER_TRANSITIONS).sort(), [...valid].sort());
    Object.values(ORDER_TRANSITIONS).forEach((targets) => targets.forEach((t) => assert.ok(valid.includes(t))));
  });

  it('toda clave y todo destino de DELIVERY_TRANSITIONS es un estado de entrega valido', () => {
    const valid = Object.values(DELIVERY_STATUS);
    assert.deepEqual(Object.keys(DELIVERY_TRANSITIONS).sort(), [...valid].sort());
    Object.values(DELIVERY_TRANSITIONS).forEach((targets) => targets.forEach((t) => assert.ok(valid.includes(t))));
  });

  it('el camino feliz del pedido es valido paso a paso', () => {
    const path = [ORDER_STATUS.CREATED, ORDER_STATUS.ASSIGNED, ORDER_STATUS.PICKED_UP, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.DELIVERED];
    for (let i = 0; i < path.length - 1; i += 1) {
      assert.equal(canTransition(ORDER_TRANSITIONS, path[i], path[i + 1]), true);
    }
  });

  it('el camino feliz de la entrega es valido paso a paso', () => {
    const path = [DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.PICKED_UP, DELIVERY_STATUS.IN_TRANSIT, DELIVERY_STATUS.DELIVERED];
    for (let i = 0; i < path.length - 1; i += 1) {
      assert.equal(canTransition(DELIVERY_TRANSITIONS, path[i], path[i + 1]), true);
    }
  });

  it('rechaza saltos (created -> delivered), retrocesos y mismo estado', () => {
    assert.equal(canTransition(ORDER_TRANSITIONS, ORDER_STATUS.CREATED, ORDER_STATUS.DELIVERED), false);
    assert.equal(canTransition(ORDER_TRANSITIONS, ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.ASSIGNED), false);
    assert.equal(canTransition(ORDER_TRANSITIONS, ORDER_STATUS.CREATED, ORDER_STATUS.CREATED), false);
    assert.equal(canTransition(DELIVERY_TRANSITIONS, DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.DELIVERED), false);
  });

  it('delivered y cancelled son estados finales', () => {
    assert.equal(isFinalStatus(ORDER_TRANSITIONS, ORDER_STATUS.DELIVERED), true);
    assert.equal(isFinalStatus(ORDER_TRANSITIONS, ORDER_STATUS.CANCELLED), true);
    assert.equal(isFinalStatus(DELIVERY_TRANSITIONS, DELIVERY_STATUS.DELIVERED), true);
    assert.equal(isFinalStatus(ORDER_TRANSITIONS, ORDER_STATUS.CREATED), false);
  });

  it('un estado desconocido no tiene transiciones', () => {
    assert.deepEqual(getAllowedTransitions(ORDER_TRANSITIONS, 'inventado'), []);
  });

  it('los mapas estan congelados', () => {
    assert.throws(() => ORDER_TRANSITIONS[ORDER_STATUS.CREATED].push('x'), TypeError);
  });
});

describe('TRACKING_CODE', () => {
  it('el patron acepta codigos validos y rechaza ambiguos o de otro largo', () => {
    assert.equal(TRACKING_CODE.PATTERN.test('RV-7K2M9QX4TB'), true);
    assert.equal(TRACKING_CODE.PATTERN.test('RV-7K2M9QX4T0'), false); // contiene 0
    assert.equal(TRACKING_CODE.PATTERN.test('RV-7K2M9QX4T'), false); // corto
    assert.equal(TRACKING_CODE.PATTERN.test('XX-7K2M9QX4TB'), false); // prefijo
  });
});
