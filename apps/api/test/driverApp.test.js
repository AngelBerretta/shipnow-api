import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { asAdmin, loginAsUser } from './helpers/auth.js';
import { createCustomer, createDriver, createOrder, advanceDelivery } from './helpers/fixtures.js';

async function assign(order, driver) {
  const response = await asAdmin().post('/api/deliveries').send({ order: order._id, driver: driver._id });
  return response.body;
}

describe('App del repartidor', () => {
  describe('GET /api/deliveries/me', () => {
    it('devuelve solo las entregas del repartidor, con el nombre del cliente y sin su email', async () => {
      const customer = await createCustomer();
      const driver = await createDriver();
      const other = await createDriver();
      const mine = await assign(await createOrder(customer._id), driver);
      await assign(await createOrder(customer._id), other);
      const api = await loginAsUser(driver);

      const response = await api.get('/api/deliveries/me');

      expect(response.status).to.equal(200);
      expect(response.body.data.map((d) => d._id)).to.deep.equal([mine._id]);
      const { order } = response.body.data[0];
      expect(order.trackingCode).to.be.a('string');
      expect(order.deliveryAddress).to.be.a('string');
      expect(order.customer).to.include({ firstName: customer.firstName, lastName: customer.lastName });
      expect(order.customer).to.not.have.property('email');
    });

    it('?active=true excluye las entregadas y ?active=false trae solo esas', async () => {
      const customer = await createCustomer();
      const driver = await createDriver();
      const inProgress = await assign(await createOrder(customer._id), driver);
      const finished = await assign(await createOrder(customer._id), driver);
      await advanceDelivery(finished._id);
      const api = await loginAsUser(driver);

      const active = await api.get('/api/deliveries/me?active=true');
      const done = await api.get('/api/deliveries/me?active=false');

      expect(active.body.data.map((d) => d._id)).to.deep.equal([inProgress._id]);
      expect(done.body.data.map((d) => d._id)).to.deep.equal([finished._id]);
    });

    it('devuelve 400 INVALID_STATUS con un status fuera del enum', async () => {
      const api = await loginAsUser(await createDriver());

      const response = await api.get('/api/deliveries/me?status=inventado');

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_STATUS');
    });

    it('devuelve 403 a un customer y 401 sin token', async () => {
      const api = await loginAsUser(await createCustomer());

      expect((await api.get('/api/deliveries/me')).status).to.equal(403);
      expect((await request(app).get('/api/deliveries/me')).status).to.equal(401);
    });
  });

  describe('PATCH /api/users/me/availability', () => {
    it('el repartidor se marca no disponible y queda guardado', async () => {
      const api = await loginAsUser(await createDriver());

      const response = await api.patch('/api/users/me/availability').send({ isAvailable: false });
      const me = await api.get('/api/auth/me');

      expect(response.status).to.equal(200);
      expect(response.body.isAvailable).to.equal(false);
      expect(me.body.isAvailable).to.equal(false);
    });

    it('devuelve 400 VALIDATION_ERROR si isAvailable no es booleano', async () => {
      const api = await loginAsUser(await createDriver());

      const response = await api.patch('/api/users/me/availability').send({ isAvailable: 'si' });

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('devuelve 403 si el usuario no es repartidor', async () => {
      const api = await loginAsUser(await createCustomer());

      const response = await api.patch('/api/users/me/availability').send({ isAvailable: false });

      expect(response.status).to.equal(403);
    });
  });
});