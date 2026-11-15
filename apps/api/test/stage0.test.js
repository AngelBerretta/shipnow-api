import { expect } from 'chai';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import userService from '../src/services/user.service.js';
import { ROLES } from '../src/constants/index.js';
import { isBcryptHash, comparePassword } from '../src/utils/password.js';
import { generateTrackingCode } from '../src/utils/trackingCode.js';
import { TRACKING_CODE } from '../src/constants/index.js';
import { buildUserPayload, createUser, createStore, createCustomer, NON_EXISTENT_ID } from './helpers/fixtures.js';

describe('Preparacion para autenticacion (Etapa 0)', () => {
  describe('contraseñas', () => {
    it('POST /api/users guarda un hash bcrypt, nunca la contrasena en texto plano', async () => {
      const payload = buildUserPayload();

      const response = await request(app).post('/api/users').send(payload);

      expect(response.status).to.equal(201);
      expect(response.body).to.not.have.property('password');
      const stored = await User.findById(response.body._id).lean();
      expect(stored.password).to.not.equal(payload.password);
      expect(isBcryptHash(stored.password)).to.equal(true);
      expect(await bcrypt.compare(payload.password, stored.password)).to.equal(true);
      expect(await comparePassword('otra-clave', stored.password)).to.equal(false);
    });

    it('el mismo texto produce hashes distintos (salt aleatorio)', async () => {
      const first = await createUser({ password: 'Igual1234!' });
      const second = await createUser({ password: 'Igual1234!' });

      const [a, b] = await Promise.all([User.findById(first._id).lean(), User.findById(second._id).lean()]);

      expect(a.password).to.not.equal(b.password);
    });

    it('devuelve 400 VALIDATION_ERROR si la contrasena no es un texto', async () => {
      const response = await request(app).post('/api/users').send(buildUserPayload({ password: 12345678 }));

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });
  });

  describe('User.isActive', () => {
    it('los usuarios nuevos nacen activos', async () => {
      const user = await createCustomer();

      expect(user.isActive).to.equal(true);
    });
  });

  describe('createAdminUser (usado por npm run seed:admin)', () => {
    it('crea un usuario admin con la contrasena hasheada', async () => {
      const payload = buildUserPayload();

      const admin = await userService.createAdminUser(payload);

      expect(admin.role).to.equal(ROLES.ADMIN);
      expect(admin).to.not.have.property('password');
      const stored = await User.findById(admin._id).lean();
      expect(isBcryptHash(stored.password)).to.equal(true);
    });

    it('rechaza un email ya registrado', async () => {
      const existing = await createUser();

      let error;
      try {
        await userService.createAdminUser(buildUserPayload({ email: existing.email }));
      } catch (e) {
        error = e;
      }

      expect(error).to.exist;
      expect(error.code).to.equal('DUPLICATE_EMAIL');
    });

    it('la alta publica sigue bloqueando el rol admin (403)', async () => {
      const response = await request(app).post('/api/users').send(buildUserPayload({ role: ROLES.ADMIN }));

      expect(response.status).to.equal(403);
    });
  });

  describe('Product.owner', () => {
    const productPayload = (overrides = {}) => ({ name: 'Producto', price: 100, stock: 5, ...overrides });

    it('crea un producto asociado a una tienda', async () => {
      const store = await createStore();

      const response = await request(app).post('/api/products').send(productPayload({ owner: store._id }));

      expect(response.status).to.equal(201);
      expect(response.body.owner).to.equal(store._id);
    });

    it('sin owner el producto queda con owner null', async () => {
      const response = await request(app).post('/api/products').send(productPayload());

      expect(response.status).to.equal(201);
      expect(response.body.owner).to.equal(null);
    });

    it('devuelve 400 VALIDATION_ERROR si el owner no tiene rol store', async () => {
      const customer = await createCustomer();

      const response = await request(app).post('/api/products').send(productPayload({ owner: customer._id }));

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('devuelve 404 USER_NOT_FOUND si el owner no existe', async () => {
      const response = await request(app).post('/api/products').send(productPayload({ owner: NON_EXISTENT_ID }));

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('USER_NOT_FOUND');
    });

    it('permite asignar el owner al actualizar y filtrar el listado por owner', async () => {
      const store = await createStore();
      const created = await request(app).post('/api/products').send(productPayload());
      await request(app).post('/api/products').send(productPayload({ name: 'Otro' }));

      const updated = await request(app).put(`/api/products/${created.body._id}`).send({ owner: store._id });
      const list = await request(app).get(`/api/products?owner=${store._id}`);

      expect(updated.status).to.equal(200);
      expect(updated.body.owner).to.equal(store._id);
      expect(list.body.data).to.have.lengthOf(1);
      expect(list.body.data[0]._id).to.equal(created.body._id);
    });
  });

  describe('generateTrackingCode', () => {
    it('genera codigos con el formato compartido y sin repetirse en una tanda grande', () => {
      const codes = new Set(Array.from({ length: 2000 }, generateTrackingCode));

      expect(codes.size).to.equal(2000);
      codes.forEach((code) => expect(code).to.match(TRACKING_CODE.PATTERN));
    });
  });
});
