import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import { asAdmin, loginAs, loginAsUser, session } from './helpers/auth.js';
import { createCustomer, createDriver, createStore, createOrder, buildOrderPayload } from './helpers/fixtures.js';

const PDF = Buffer.from('%PDF-1.4 prueba', 'utf-8');

async function assign(order, driver) {
  const response = await asAdmin().post('/api/deliveries').send({ order: order._id, driver: driver._id });
  return response.body;
}

const expectForbidden = (response) => {
  expect(response.status).to.equal(403);
  expect(response.body.error.code).to.equal('FORBIDDEN_ACTION');
};

describe('Permisos por rol', () => {
  describe('sin token', () => {
    const PROTECTED = [
      ['get', '/api/users'],
      ['get', '/api/orders'],
      ['post', '/api/orders'],
      ['get', '/api/deliveries'],
      ['get', '/api/products'],
      ['get', '/api/mocks/users'],
      ['get', '/api/logs/test'],
    ];

    PROTECTED.forEach(([method, url]) => {
      it(`${method.toUpperCase()} ${url} devuelve 401 UNAUTHORIZED`, async () => {
        const response = await request(app)[method](url);

        expect(response.status).to.equal(401);
        expect(response.body.error.code).to.equal('UNAUTHORIZED');
      });
    });
  });

  describe('admin', () => {
    it('no puede eliminar su propia cuenta', async () => {
      const response = await asAdmin().delete(`/api/users/${session.admin._id}`);

      expectForbidden(response);
    });
  });

  describe('customer', () => {
    it('solo ve sus propios pedidos y no puede abrir los de otro', async () => {
      const me = await createCustomer();
      const other = await createCustomer();
      const mine = await createOrder(me._id);
      const theirs = await createOrder(other._id);
      const api = await loginAsUser(me);

      const list = await api.get('/api/orders');
      const forbidden = await api.get(`/api/orders/${theirs._id}`);
      const events = await api.get(`/api/orders/${theirs._id}/events`);

      expect(list.status).to.equal(200);
      expect(list.body.data.map((o) => o._id)).to.deep.equal([mine._id]);
      expectForbidden(forbidden);
      expectForbidden(events);
    });

    it('crea pedidos a su nombre y no puede crearlos a nombre de otro', async () => {
      const me = await createCustomer();
      const other = await createCustomer();
      const api = await loginAsUser(me);

      const own = await api.post('/api/orders').send({ items: buildOrderPayload(me._id).items, deliveryAddress: 'Calle 1' });
      const foreign = await api.post('/api/orders').send(buildOrderPayload(other._id));

      expect(own.status).to.equal(201);
      expect(own.body.order.customer).to.equal(me._id);
      expectForbidden(foreign);
    });

    it('ve su perfil pero no el de otro ni el listado de usuarios', async () => {
      const me = await createCustomer();
      const other = await createCustomer();
      const api = await loginAsUser(me);

      expect((await api.get(`/api/users/${me._id}`)).status).to.equal(200);
      expectForbidden(await api.get(`/api/users/${other._id}`));
      expectForbidden(await api.get('/api/users'));
    });

    it('lee productos pero no los crea; tampoco asigna entregas ni usa /api/mocks', async () => {
      const api = await loginAsUser(await createCustomer());

      expect((await api.get('/api/products')).status).to.equal(200);
      expectForbidden(await api.post('/api/products').send({ name: 'X', price: 1, stock: 1 }));
      expectForbidden(await api.post('/api/deliveries').send({}));
      expectForbidden(await api.get('/api/mocks/users'));
    });

    it('ve la entrega de su pedido pero no la de otro cliente', async () => {
      const me = await createCustomer();
      const other = await createCustomer();
      const driver = await createDriver();
      const mine = await assign(await createOrder(me._id), driver);
      const theirs = await assign(await createOrder(other._id), driver);
      const api = await loginAsUser(me);

      expect((await api.get(`/api/deliveries/${mine._id}`)).status).to.equal(200);
      expectForbidden(await api.get(`/api/deliveries/${theirs._id}`));
      const list = await api.get('/api/deliveries');
      expect(list.body.data.map((d) => d._id)).to.deep.equal([mine._id]);
    });
  });

  describe('store', () => {
    it('solo ve los pedidos de su tienda', async () => {
      const store = await createStore();
      const customer = await createCustomer();
      const own = await createOrder(customer._id, { store: store._id });
      await createOrder(customer._id);
      const api = await loginAsUser(store);

      const list = await api.get('/api/orders');
      const forbidden = await api.get(`/api/orders/${(await createOrder(customer._id))._id}`);

      expect(list.body.data.map((o) => o._id)).to.deep.equal([own._id]);
      expectForbidden(forbidden);
    });

    it('crea productos propios (el owner se fuerza a su id) y no a nombre de otra tienda', async () => {
      const store = await createStore();
      const otherStore = await createStore();
      const api = await loginAsUser(store);

      const own = await api.post('/api/products').send({ name: 'Propio', price: 10, stock: 1 });
      const foreign = await api.post('/api/products').send({ name: 'Ajeno', price: 10, stock: 1, owner: otherStore._id });

      expect(own.status).to.equal(201);
      expect(own.body.owner).to.equal(store._id);
      expectForbidden(foreign);
    });

    it('no modifica ni elimina productos de otra tienda, y solo lista los suyos', async () => {
      const store = await createStore();
      const otherStore = await createStore();
      const foreign = (await asAdmin().post('/api/products').send({ name: 'Ajeno', price: 5, stock: 1, owner: otherStore._id })).body;
      const own = (await asAdmin().post('/api/products').send({ name: 'Propio', price: 5, stock: 1, owner: store._id })).body;
      const api = await loginAsUser(store);

      expectForbidden(await api.put(`/api/products/${foreign._id}`).send({ price: 1 }));
      expectForbidden(await api.delete(`/api/products/${foreign._id}`));
      expectForbidden(await api.get(`/api/products/${foreign._id}`));
      const list = await api.get('/api/products');
      expect(list.body.data.map((p) => p._id)).to.deep.equal([own._id]);
    });
  });

  describe('driver', () => {
    it('solo ve los pedidos y las entregas que tiene asignados', async () => {
      const customer = await createCustomer();
      const driver = await createDriver();
      const otherDriver = await createDriver();
      const mineOrder = await createOrder(customer._id);
      const mine = await assign(mineOrder, driver);
      await assign(await createOrder(customer._id), otherDriver);
      const api = await loginAsUser(driver);

      const orders = await api.get('/api/orders');
      const deliveries = await api.get('/api/deliveries');

      expect(orders.body.data.map((o) => o._id)).to.deep.equal([mineOrder._id]);
      expect(deliveries.body.data.map((d) => d._id)).to.deep.equal([mine._id]);
    });

    it('actualiza el estado de su entrega y no el de otra', async () => {
      const customer = await createCustomer();
      const driver = await createDriver();
      const otherDriver = await createDriver();
      const mine = await assign(await createOrder(customer._id), driver);
      const theirs = await assign(await createOrder(customer._id), otherDriver);
      const api = await loginAsUser(driver);

      const ok = await api.patch(`/api/deliveries/${mine._id}/status`).send({ status: 'picked_up' });
      const forbidden = await api.patch(`/api/deliveries/${theirs._id}/status`).send({ status: 'picked_up' });

      expect(ok.status).to.equal(200);
      expectForbidden(forbidden);
    });

    it('sube comprobantes de su entrega y no de otra', async () => {
      const customer = await createCustomer();
      const driver = await createDriver();
      const otherDriver = await createDriver();
      const mine = await assign(await createOrder(customer._id), driver);
      const theirs = await assign(await createOrder(customer._id), otherDriver);
      const api = await loginAsUser(driver);

      const ok = await api.post(`/api/deliveries/${mine._id}/proof`).attach('file', PDF, { filename: 'a.pdf', contentType: 'application/pdf' });
      const forbidden = await api.post(`/api/deliveries/${theirs._id}/proof`).attach('file', PDF, { filename: 'a.pdf', contentType: 'application/pdf' });

      expect(ok.status).to.equal(201);
      expectForbidden(forbidden);
    });

    it('no crea pedidos, no lee productos y no elimina entregas', async () => {
      const driver = await createDriver();
      const customer = await createCustomer();
      const delivery = await assign(await createOrder(customer._id), driver);
      const api = await loginAsUser(driver);

      expectForbidden(await api.post('/api/orders').send(buildOrderPayload(customer._id)));
      expectForbidden(await api.get('/api/products'));
      expectForbidden(await api.delete(`/api/deliveries/${delivery._id}`));
    });
  });

  describe('cuenta desactivada', () => {
    it('un access token vigente deja de servir apenas se desactiva al usuario', async () => {
      const user = await createCustomer();
      const { accessToken } = await loginAs(user.email);
      await User.updateOne({ _id: user._id }, { isActive: false });

      const response = await request(app).get('/api/orders').set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).to.equal(401);
    });
  });
});