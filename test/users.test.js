import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { ROLES } from '../src/constants/index.js';
import { createUser, createCustomer, buildUserPayload, NON_EXISTENT_ID, MALFORMED_ID } from './helpers/fixtures.js';

describe('Usuarios (/api/users)', () => {
  describe('GET /api/users', () => {
    it('devuelve 200 y un arreglo con los usuarios creados', async () => {
      const created = await createCustomer();

      const response = await request(app).get('/api/users');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
      const found = response.body.find((user) => user._id === created._id);
      expect(found).to.exist;
      expect(found).to.include({ firstName: created.firstName, email: created.email, role: ROLES.CUSTOMER });
    });

    it('nunca expone la contraseña de los usuarios', async () => {
      await createCustomer();

      const response = await request(app).get('/api/users');

      response.body.forEach((user) => {
        expect(user).to.not.have.property('password');
      });
    });
  });

  describe('GET /api/users/:uid', () => {
    it('devuelve 200 y el usuario correspondiente al id', async () => {
      const created = await createCustomer();

      const response = await request(app).get(`/api/users/${created._id}`);

      expect(response.status).to.equal(200);
      expect(response.body._id).to.equal(created._id);
      expect(response.body.email).to.equal(created.email);
      expect(response.body).to.not.have.property('password');
    });

    it('devuelve 404 con el formato de error definido si el usuario no existe', async () => {
      const response = await request(app).get(`/api/users/${NON_EXISTENT_ID}`);

      expect(response.status).to.equal(404);
      expect(response.body).to.deep.equal({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' },
      });
    });

    it('devuelve 400 si el id no tiene un formato valido', async () => {
      const response = await request(app).get(`/api/users/${MALFORMED_ID}`);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.equal(false);
      expect(response.body.error.code).to.equal('INVALID_ID');
    });
  });

  describe('POST /api/users', () => {
    it('crea un usuario valido y devuelve 201 con el usuario (sin password)', async () => {
      const payload = buildUserPayload({ role: ROLES.DRIVER });

      const response = await request(app).post('/api/users').send(payload);

      expect(response.status).to.equal(201);
      expect(response.body).to.include({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        role: ROLES.DRIVER,
      });
      expect(response.body).to.have.property('_id');
      expect(response.body).to.not.have.property('password');
    });

    it('devuelve 400 VALIDATION_ERROR si faltan datos obligatorios', async () => {
      const response = await request(app).post('/api/users').send({ firstName: 'Incompleto' });

      expect(response.status).to.equal(400);
      expect(response.body).to.deep.equal({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Faltan datos obligatorios (firstName, lastName, email, password)',
        },
      });
    });

    it('devuelve 400 INVALID_ROLE si el rol no pertenece al enum de roles', async () => {
      const payload = buildUserPayload({ role: 'super-admin' });

      const response = await request(app).post('/api/users').send(payload);

      expect(response.status).to.equal(400);
      expect(response.body.success).to.equal(false);
      expect(response.body.error.code).to.equal('INVALID_ROLE');
      expect(response.body.error.details).to.deep.equal({
        received: 'super-admin',
        allowed: Object.values(ROLES),
      });
    });

    it('devuelve 403 si se intenta crear un usuario con rol admin', async () => {
      const payload = buildUserPayload({ role: ROLES.ADMIN });

      const response = await request(app).post('/api/users').send(payload);

      expect(response.status).to.equal(403);
      expect(response.body.error.code).to.equal('FORBIDDEN_ACTION');
    });

    it('devuelve 409 DUPLICATE_EMAIL si el email ya esta registrado', async () => {
      const existing = await createUser();

      const response = await request(app).post('/api/users').send(buildUserPayload({ email: existing.email }));

      expect(response.status).to.equal(409);
      expect(response.body.success).to.equal(false);
      expect(response.body.error.code).to.equal('DUPLICATE_EMAIL');
    });
  });
});
