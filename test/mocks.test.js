import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { ROLES } from '../src/constants/index.js';

describe('Mocks (/api/mocks)', () => {
  describe('GET /api/mocks/users (preview, no persiste)', () => {
    it('devuelve 200 con la cantidad por defecto y persisted:false', async () => {
      const response = await request(app).get('/api/mocks/users');

      expect(response.status).to.equal(200);
      expect(response.body.persisted).to.equal(false);
      expect(response.body.count).to.equal(10);
      expect(response.body.data).to.have.lengthOf(10);
      expect(response.body.data[0]).to.include.keys('firstName', 'lastName', 'email', 'role');
    });

    it('respeta la cantidad pedida por query param', async () => {
      const response = await request(app).get('/api/mocks/users?count=3');

      expect(response.status).to.equal(200);
      expect(response.body.count).to.equal(3);
      expect(response.body.data).to.have.lengthOf(3);
    });

    it('respeta el rol pedido por query param', async () => {
      const response = await request(app).get(`/api/mocks/users?count=5&role=${ROLES.DRIVER}`);

      expect(response.status).to.equal(200);
      response.body.data.forEach((user) => expect(user.role).to.equal(ROLES.DRIVER));
    });

    it('devuelve 400 INVALID_MOCK_QUANTITY si la cantidad es negativa', async () => {
      const response = await request(app).get('/api/mocks/users?count=-1');

      expect(response.status).to.equal(400);
      expect(response.body.success).to.equal(false);
      expect(response.body.error.code).to.equal('INVALID_MOCK_QUANTITY');
      expect(response.body.error.details).to.deep.equal({ field: 'count', received: '-1' });
    });

    it('devuelve 400 INVALID_MOCK_QUANTITY si la cantidad no es numerica', async () => {
      const response = await request(app).get('/api/mocks/users?count=abc');

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_MOCK_QUANTITY');
    });

    it('devuelve 400 INVALID_ROLE si el rol no pertenece al enum', async () => {
      const response = await request(app).get('/api/mocks/users?role=inexistente');

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_ROLE');
    });
  });

  describe('GET /api/mocks/orders y /api/mocks/deliveries (preview)', () => {
    it('GET /api/mocks/orders devuelve 200 con pedidos simulados', async () => {
      const response = await request(app).get('/api/mocks/orders?count=4');

      expect(response.status).to.equal(200);
      expect(response.body.persisted).to.equal(false);
      expect(response.body.data).to.have.lengthOf(4);
      expect(response.body.data[0]).to.include.keys('customer', 'items', 'deliveryAddress', 'status', 'total');
    });

    it('GET /api/mocks/deliveries devuelve 200 con entregas simuladas', async () => {
      const response = await request(app).get('/api/mocks/deliveries?count=2');

      expect(response.status).to.equal(200);
      expect(response.body.data).to.have.lengthOf(2);
      expect(response.body.data[0]).to.include.keys('order', 'driver', 'status', 'priority');
    });
  });

  describe('GET /api/mocks/full (preview de dataset relacionado)', () => {
    it('devuelve 200 con usuarios, pedidos y entregas simulados y coherentes entre si', async () => {
      const response = await request(app).get('/api/mocks/full?users=3&orders=2&deliveries=1');

      expect(response.status).to.equal(200);
      expect(response.body.persisted).to.equal(false);
      expect(response.body.users).to.have.lengthOf(3);
      expect(response.body.orders).to.have.lengthOf(2);
      expect(response.body.deliveries).to.have.lengthOf(1);
    });
  });

  describe('POST /api/mocks/generate (seed real en MongoDB)', () => {
    it('inserta datos reales y devuelve 201 con persisted:true y el resumen de lo creado', async () => {
      const response = await request(app)
        .post('/api/mocks/generate')
        .send({ users: 4, orders: 2, deliveries: 1 });

      expect(response.status).to.equal(201);
      expect(response.body.persisted).to.equal(true);
      expect(response.body.summary.users).to.deep.equal({ requested: 4, created: 4 });
      expect(response.body.data.users).to.have.lengthOf(4);
      expect(response.body.data.orders).to.have.lengthOf(2);

      // Los datos quedaron realmente en la base: se pueden leer por la API normal.
      const usersResponse = await request(app).get('/api/users');
      expect(usersResponse.body.length).to.be.at.least(4);
    });

    it('devuelve 400 INVALID_MOCK_QUANTITY si alguna cantidad es invalida', async () => {
      const response = await request(app)
        .post('/api/mocks/generate')
        .send({ users: -5, orders: 0, deliveries: 0 });

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_MOCK_QUANTITY');
      expect(response.body.error.details).to.deep.equal({ field: 'users', received: -5 });
    });

    it('devuelve 400 VALIDATION_ERROR si se piden pedidos sin haber generado usuarios customer', async () => {
      const response = await request(app)
        .post('/api/mocks/generate')
        .send({ users: 0, orders: 2, deliveries: 0 });

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });
  });
});
