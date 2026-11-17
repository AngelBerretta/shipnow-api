import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { asAdmin } from './helpers/auth.js';
import { maskAddress } from '../src/utils/address.js';
import { ORDER_STATUS } from '../src/constants/index.js';
import { createCustomer, createOrder, createDelivery, advanceDelivery } from './helpers/fixtures.js';

const track = (code) => request(app).get(`/api/public/tracking/${code}`);

async function trackingCodeOf(orderId) {
  const response = await asAdmin().get(`/api/orders/${orderId}`);
  return response.body.trackingCode;
}

const NOT_FOUND_BODY = { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Pedido no encontrado' } };

describe('Seguimiento público (/api/public/tracking)', () => {
  it('no requiere token y devuelve solo datos públicos', async () => {
    const customer = await createCustomer();
    const order = await createOrder(customer._id);

    const response = await track(order.trackingCode);

    expect(response.status).to.equal(200);
    expect(response.headers['cache-control']).to.equal('no-store');
    expect(response.body).to.have.all.keys('trackingCode', 'status', 'createdAt', 'address', 'driver', 'events');
    expect(response.body.trackingCode).to.equal(order.trackingCode);
    expect(response.body.status).to.equal(ORDER_STATUS.CREATED);
    expect(response.body.address).to.equal('Calle Falsa, Chivilcoy');
    expect(response.body.driver).to.equal(null);

    const raw = JSON.stringify(response.body);
    expect(raw).to.not.include(order._id);
    expect(raw).to.not.include(customer._id);
    expect(raw).to.not.include(customer.email);
  });

  it('acepta el código en minúsculas', async () => {
    const customer = await createCustomer();
    const order = await createOrder(customer._id);

    const response = await track(order.trackingCode.toLowerCase());

    expect(response.status).to.equal(200);
    expect(response.body.trackingCode).to.equal(order.trackingCode);
  });

  it('la línea de tiempo coincide con lo que hizo el repartidor y no expone ids ni el apellido', async () => {
    const delivery = await createDelivery();
    await advanceDelivery(delivery._id);
    const code = await trackingCodeOf(delivery.order);

    const response = await track(code);

    expect(response.body.status).to.equal(ORDER_STATUS.DELIVERED);
    expect(response.body.driver).to.deep.equal({ firstName: 'Test', lastInitial: 'U' });
    expect(response.body.events.map((e) => e.status)).to.deep.equal([
      'created',
      'assigned',
      'picked_up',
      'in_transit',
      'delivered',
    ]);
    response.body.events.forEach((event) => expect(event).to.have.all.keys('status', 'occurredAt'));
    const raw = JSON.stringify(response.body);
    expect(raw).to.not.include(delivery._id);
    expect(raw).to.not.include(delivery.driver);
  });

  it('un pedido cancelado muestra el estado cancelled', async () => {
    const customer = await createCustomer();
    const order = await createOrder(customer._id);
    await asAdmin().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.CANCELLED });

    const response = await track(order.trackingCode);

    expect(response.body.status).to.equal(ORDER_STATUS.CANCELLED);
    expect(response.body.events.at(-1).status).to.equal(ORDER_STATUS.CANCELLED);
  });

  it('un código distinto al del pedido no revela nada: inexistente, mal formado y el _id interno responden igual', async () => {
    const customer = await createCustomer();
    const order = await createOrder(customer._id);

    const responses = [
      await track('RV-2222222222'),
      await track('no-es-un-codigo'),
      await track(order._id), // el id interno NO sirve como código
    ];

    responses.forEach((response) => {
      expect(response.status).to.equal(404);
      expect(response.body).to.deep.equal(NOT_FOUND_BODY);
    });
  });

  describe('maskAddress', () => {
    it('quita el número de calle y deja calle y localidad', () => {
      expect(maskAddress('Av. Rivadavia 1234, Chivilcoy')).to.equal('Av. Rivadavia, Chivilcoy');
      expect(maskAddress('25 de Mayo 123')).to.equal('25 de Mayo');
      expect(maskAddress('Mitre 55, Piso 3, Junin')).to.equal('Mitre, Junin');
    });

    it('tolera valores vacíos o no textuales', () => {
      expect(maskAddress('')).to.equal('');
      expect(maskAddress(undefined)).to.equal('');
    });
  });
});