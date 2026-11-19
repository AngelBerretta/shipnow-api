import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import Location from '../src/models/location.model.js';
import Notification from '../src/models/notification.model.js';
import Order from '../src/models/order.model.js';
import { asAdmin, loginAsUser } from './helpers/auth.js';
import { createCustomer, createDriver, createOrder, advanceDelivery, NON_EXISTENT_ID } from './helpers/fixtures.js';

const DEST = { lat: -34.8956, lng: -60.0189 };

async function activeDelivery() {
  const customer = await createCustomer();
  const driver = await createDriver();
  const order = await createOrder(customer._id);
  const { body: delivery } = await asAdmin().post('/api/deliveries').send({ order: order._id, driver: driver._id });
  return { order, delivery, driver, api: await loginAsUser(driver) };
}

const setDestination = (orderId) =>
  Order.updateOne({ _id: orderId }, { deliveryLocation: { type: 'Point', coordinates: [DEST.lng, DEST.lat] } });

describe('GPS en tiempo real (/api/locations)', () => {
  it('exige token y rol repartidor para enviar la posición', async () => {
    expect((await request(app).post('/api/locations/me').send({ lat: 1, lng: 1 })).status).to.equal(401);
    const api = await loginAsUser(await createCustomer());
    expect((await api.post('/api/locations/me').send({ lat: 1, lng: 1 })).status).to.equal(403);
  });

  it('guarda la posición y la expone a los admin en /live', async () => {
    const { order, delivery, api } = await activeDelivery();

    const response = await api.post('/api/locations/me').send({ lat: -34.9, lng: -60.02, accuracy: 12 });
    const live = await asAdmin().get('/api/locations/live');

    expect(response.body).to.deep.equal({ accepted: true, deliveries: 1 });
    expect(await Location.countDocuments({ delivery: delivery._id })).to.equal(1);
    expect(live.status).to.equal(200);
    expect(live.body.data).to.have.lengthOf(1);
    expect(live.body.data[0]).to.include({ deliveryId: delivery._id, trackingCode: order.trackingCode, lat: -34.9, lng: -60.02 });
  });

  it('sin entregas activas no registra nada', async () => {
    const api = await loginAsUser(await createDriver());

    const response = await api.post('/api/locations/me').send({ lat: -34.9, lng: -60.02 });

    expect(response.body).to.deep.equal({ accepted: true, deliveries: 0 });
    expect(await Location.countDocuments()).to.equal(0);
  });

  it('valida las coordenadas', async () => {
    const api = await loginAsUser(await createDriver());

    const outOfRange = await api.post('/api/locations/me').send({ lat: 200, lng: 0 });
    const notNumbers = await api.post('/api/locations/me').send({ lat: 'a', lng: 'b' });

    expect(outOfRange.status).to.equal(400);
    expect(outOfRange.body.error.code).to.equal('VALIDATION_ERROR');
    expect(notNumbers.status).to.equal(400);
  });

  it('devuelve el recorrido en orden y 404 si la entrega no existe', async () => {
    const { delivery, api } = await activeDelivery();
    for (const lat of [-34.91, -34.905, -34.9]) await api.post('/api/locations/me').send({ lat, lng: -60.02 });

    const trail = await asAdmin().get(`/api/locations/deliveries/${delivery._id}`);
    const missing = await asAdmin().get(`/api/locations/deliveries/${NON_EXISTENT_ID}`);

    expect(trail.body.points.map((p) => p.lat)).to.deep.equal([-34.91, -34.905, -34.9]);
    expect(missing.status).to.equal(404);
    expect(missing.body.error.code).to.equal('DELIVERY_NOT_FOUND');
  });

  it('avisa "llegando" una sola vez al entrar en la geocerca', async () => {
    const { order, delivery, api } = await activeDelivery();
    await setDestination(order._id);
    await advanceDelivery(delivery._id, ['picked_up', 'in_transit']);

    await api.post('/api/locations/me').send({ lat: -34.92, lng: -60.04 }); // lejos
    expect(await Notification.countDocuments({ type: 'order_arriving' })).to.equal(0);

    await api.post('/api/locations/me').send({ lat: DEST.lat + 0.0005, lng: DEST.lng }); // ~55 m
    await api.post('/api/locations/me').send({ lat: DEST.lat + 0.0004, lng: DEST.lng });

    expect(await Notification.countDocuments({ type: 'order_arriving', channel: 'in_app' })).to.equal(1);
  });

  it('el portal público muestra posición y ETA solo mientras el pedido va en camino', async () => {
    const { order, delivery, api } = await activeDelivery();
    await setDestination(order._id);
    const track = () => request(app).get(`/api/public/tracking/${order.trackingCode}`);

    await api.post('/api/locations/me').send({ lat: -34.9, lng: -60.03 });
    expect((await track()).body).to.not.have.property('location');

    await advanceDelivery(delivery._id, ['picked_up', 'in_transit']);
    await api.post('/api/locations/me').send({ lat: -34.9, lng: -60.03 });
    const during = (await track()).body;
    expect(during.location).to.include({ lat: -34.9, lng: -60.03 });
    expect(during.eta.minutes).to.be.at.least(1);
    expect(JSON.stringify(during)).to.not.include(String(DEST.lat)); // el destino nunca sale

    await advanceDelivery(delivery._id, ['delivered']);
    expect((await track()).body).to.not.have.property('location');
  });
});