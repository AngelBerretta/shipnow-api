import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { ORDER_EVENT_TYPES, ORDER_STATUS, DELIVERY_STATUS, TRACKING_CODE } from '../src/constants/index.js';
import {
  createCustomer,
  createOrder,
  createDelivery,
  advanceDelivery,
  advanceOrder,
  NON_EXISTENT_ID,
  MALFORMED_ID,
} from './helpers/fixtures.js';

const summarize = (events) => events.map((e) => [e.type, e.fromStatus, e.toStatus]);

describe('Historial de pedidos (/api/orders/:oid/events)', () => {
  it('un pedido recien creado tiene el evento order_created', async () => {
    const customer = await createCustomer();
    const order = await createOrder(customer._id);

    const response = await request(app).get(`/api/orders/${order._id}/events`);

    expect(response.status).to.equal(200);
    expect(response.body.order).to.equal(order._id);
    expect(response.body.trackingCode).to.match(TRACKING_CODE.PATTERN);
    expect(summarize(response.body.events)).to.deep.equal([[ORDER_EVENT_TYPES.ORDER_CREATED, null, ORDER_STATUS.CREATED]]);
    expect(response.body.events[0]).to.have.property('occurredAt');
  });

  it('registra los cambios de estado manuales en orden cronologico', async () => {
    const customer = await createCustomer();
    const order = await createOrder(customer._id);
    await advanceOrder(order._id, ['assigned', 'picked_up']);

    const response = await request(app).get(`/api/orders/${order._id}/events`);

    expect(summarize(response.body.events)).to.deep.equal([
      [ORDER_EVENT_TYPES.ORDER_CREATED, null, 'created'],
      [ORDER_EVENT_TYPES.STATUS_CHANGED, 'created', 'assigned'],
      [ORDER_EVENT_TYPES.STATUS_CHANGED, 'assigned', 'picked_up'],
    ]);
  });

  it('registra la entrega asignada y cada avance del repartidor, con la entrega asociada', async () => {
    const delivery = await createDelivery();
    await advanceDelivery(delivery._id);

    const response = await request(app).get(`/api/orders/${delivery.order}/events`);

    expect(summarize(response.body.events)).to.deep.equal([
      [ORDER_EVENT_TYPES.ORDER_CREATED, null, 'created'],
      [ORDER_EVENT_TYPES.DELIVERY_ASSIGNED, 'created', 'assigned'],
      [ORDER_EVENT_TYPES.DELIVERY_STATUS_CHANGED, 'assigned', 'picked_up'],
      [ORDER_EVENT_TYPES.DELIVERY_STATUS_CHANGED, 'picked_up', 'in_transit'],
      [ORDER_EVENT_TYPES.DELIVERY_STATUS_CHANGED, 'in_transit', 'delivered'],
    ]);
    response.body.events.slice(1).forEach((event) => expect(event.delivery).to.equal(delivery._id));
  });

  it('registra la eliminacion de la entrega cuando el pedido vuelve a created', async () => {
    const delivery = await createDelivery();
    await advanceDelivery(delivery._id, [DELIVERY_STATUS.PICKED_UP]);
    await request(app).delete(`/api/deliveries/${delivery._id}`);

    const response = await request(app).get(`/api/orders/${delivery.order}/events`);

    expect(summarize(response.body.events).at(-1)).to.deep.equal([ORDER_EVENT_TYPES.DELIVERY_REMOVED, 'picked_up', 'created']);
  });

  it('un cambio de estado rechazado por la maquina de estados no deja evento', async () => {
    const customer = await createCustomer();
    const order = await createOrder(customer._id);
    await request(app).patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.DELIVERED });

    const response = await request(app).get(`/api/orders/${order._id}/events`);

    expect(response.body.events).to.have.lengthOf(1);
  });

  it('devuelve 404 ORDER_NOT_FOUND si el pedido no existe', async () => {
    const response = await request(app).get(`/api/orders/${NON_EXISTENT_ID}/events`);

    expect(response.status).to.equal(404);
    expect(response.body.error.code).to.equal('ORDER_NOT_FOUND');
  });

  it('devuelve 400 INVALID_ID si el id no tiene un formato valido', async () => {
    const response = await request(app).get(`/api/orders/${MALFORMED_ID}/events`);

    expect(response.status).to.equal(400);
    expect(response.body.error.code).to.equal('INVALID_ID');
  });
});
