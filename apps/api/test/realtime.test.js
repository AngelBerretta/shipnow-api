import { expect } from 'chai';
import http from 'node:http';
import { io as connect } from 'socket.io-client';
import app from '../src/app.js';
import { initSocket, closeSocket } from '../src/realtime/socket.js';
import { asAdmin, loginAsUser, session } from './helpers/auth.js';
import { createCustomer, createDriver, createOrder } from './helpers/fixtures.js';

describe('Socket.IO (tiempo real)', () => {
  let server;
  let url;

  before(async () => {
    server = http.createServer(app);
    initSocket(server);
    await new Promise((resolve) => server.listen(0, resolve));
    url = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    await closeSocket();
  });

  it('rechaza la conexión sin token válido', async () => {
    const client = connect(url, { auth: { token: 'invalido' }, reconnection: false, transports: ['websocket'] });
    const error = await new Promise((resolve) => client.on('connect_error', resolve));
    client.close();

    expect(error.message).to.equal('UNAUTHORIZED');
  });

  it('los admin reciben la posición que envía el repartidor', async () => {
    const customer = await createCustomer();
    const driver = await createDriver();
    const order = await createOrder(customer._id);
    await asAdmin().post('/api/deliveries').send({ order: order._id, driver: driver._id });
    const api = await loginAsUser(driver);

    const client = connect(url, { auth: { token: session.adminToken }, transports: ['websocket'] });
    await new Promise((resolve) => client.on('connect', resolve));
    const received = new Promise((resolve) => client.on('location:update', resolve));

    await api.post('/api/locations/me').send({ lat: -34.9, lng: -60.02 });
    const update = await received;
    client.close();

    expect(update).to.include({ trackingCode: order.trackingCode, lat: -34.9, lng: -60.02, status: 'assigned' });
  });
});