import { expect } from 'chai';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import { TEST_PASSWORD, withToken } from './helpers/auth.js';
import { createCustomer } from './helpers/fixtures.js';

const login = (email, password = TEST_PASSWORD) => request(app).post('/api/auth/login').send({ email, password });
const refresh = (refreshToken) => request(app).post('/api/auth/refresh').send({ refreshToken });

describe('Autenticacion (/api/auth)', () => {
  describe('POST /api/auth/login', () => {
    it('devuelve 200 con access token, refresh token y el usuario sin password', async () => {
      const user = await createCustomer();

      const response = await login(user.email);

      expect(response.status).to.equal(200);
      expect(response.body.tokenType).to.equal('Bearer');
      expect(response.body.accessToken).to.be.a('string');
      expect(response.body.refreshToken).to.be.a('string');
      expect(response.body.expiresIn).to.be.a('number');
      expect(response.body.user._id).to.equal(user._id);
      expect(response.body.user).to.not.have.property('password');
    });

    it('devuelve 401 INVALID_CREDENTIALS, con el mismo mensaje, para contrasena incorrecta y email inexistente', async () => {
      const user = await createCustomer();

      const wrongPassword = await login(user.email, 'incorrecta');
      const unknownEmail = await login('nadie@ruvika-tests.com');

      expect(wrongPassword.status).to.equal(401);
      expect(wrongPassword.body.error.code).to.equal('INVALID_CREDENTIALS');
      expect(unknownEmail.status).to.equal(401);
      expect(unknownEmail.body).to.deep.equal(wrongPassword.body);
    });

    it('devuelve 403 FORBIDDEN_ACTION si la cuenta esta desactivada', async () => {
      const user = await createCustomer();
      await User.updateOne({ _id: user._id }, { isActive: false });

      const response = await login(user.email);

      expect(response.status).to.equal(403);
      expect(response.body.error.code).to.equal('FORBIDDEN_ACTION');
    });

    it('devuelve 400 VALIDATION_ERROR si faltan campos', async () => {
      const response = await request(app).post('/api/auth/login').send({});

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
      expect(response.body.error.details).to.be.an('array').that.is.not.empty;
    });
  });

  describe('GET /api/auth/me y validacion del access token', () => {
    it('devuelve el usuario del token', async () => {
      const user = await createCustomer();
      const { body } = await login(user.email);

      const response = await withToken(body.accessToken).get('/api/auth/me');

      expect(response.status).to.equal(200);
      expect(response.body._id).to.equal(user._id);
      expect(response.body).to.not.have.property('password');
    });

    it('devuelve 401 UNAUTHORIZED sin token o con un esquema distinto de Bearer', async () => {
      const withoutToken = await request(app).get('/api/auth/me');
      const wrongScheme = await request(app).get('/api/auth/me').set('Authorization', 'Token abc');

      expect(withoutToken.status).to.equal(401);
      expect(withoutToken.body.error.code).to.equal('UNAUTHORIZED');
      expect(wrongScheme.status).to.equal(401);
    });

    it('devuelve 401 TOKEN_EXPIRED con un token vencido', async () => {
      const user = await createCustomer();
      const expired = jwt.sign({ role: user.role, exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET, {
        subject: user._id,
      });

      const response = await withToken(expired).get('/api/auth/me');

      expect(response.status).to.equal(401);
      expect(response.body.error.code).to.equal('TOKEN_EXPIRED');
    });

    it('devuelve 401 UNAUTHORIZED con un token firmado con otro secreto', async () => {
      const user = await createCustomer();
      const forged = jwt.sign({ role: 'admin' }, 'otro-secreto-que-no-es-el-de-la-api-0123456', { subject: user._id });

      const response = await withToken(forged).get('/api/auth/me');

      expect(response.status).to.equal(401);
      expect(response.body.error.code).to.equal('UNAUTHORIZED');
    });

    it('un token deja de servir si el usuario es desactivado o eliminado', async () => {
      const deactivated = await createCustomer();
      const deleted = await createCustomer();
      const a = (await login(deactivated.email)).body.accessToken;
      const b = (await login(deleted.email)).body.accessToken;

      await User.updateOne({ _id: deactivated._id }, { isActive: false });
      await User.deleteOne({ _id: deleted._id });

      expect((await withToken(a).get('/api/auth/me')).status).to.equal(401);
      expect((await withToken(b).get('/api/auth/me')).status).to.equal(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('rota el refresh token: el nuevo sirve y el anterior queda invalidado', async () => {
      const user = await createCustomer();
      const first = (await login(user.email)).body;

      const renewed = await refresh(first.refreshToken);

      expect(renewed.status).to.equal(200);
      expect(renewed.body.refreshToken).to.not.equal(first.refreshToken);
      expect(renewed.body.accessToken).to.be.a('string');
      expect((await refresh(first.refreshToken)).status).to.equal(401);
    });

    it('al reutilizar un token ya rotado se revoca toda la sesion (tambien el token nuevo)', async () => {
      const user = await createCustomer();
      const first = (await login(user.email)).body;
      const renewed = (await refresh(first.refreshToken)).body;

      await refresh(first.refreshToken); // reuso: dispara la revocacion de la familia
      const afterReuse = await refresh(renewed.refreshToken);

      expect(afterReuse.status).to.equal(401);
      expect(afterReuse.body.error.code).to.equal('UNAUTHORIZED');
    });

    it('devuelve 401 con un refresh token inventado', async () => {
      const response = await refresh('token-inventado');

      expect(response.status).to.equal(401);
      expect(response.body.error.code).to.equal('UNAUTHORIZED');
    });

    it('devuelve 400 VALIDATION_ERROR si falta el refresh token', async () => {
      const response = await request(app).post('/api/auth/refresh').send({});

      expect(response.status).to.equal(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('cierra la sesion: el refresh token deja de servir', async () => {
      const user = await createCustomer();
      const { refreshToken } = (await login(user.email)).body;

      const response = await request(app).post('/api/auth/logout').send({ refreshToken });

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ message: 'Sesion cerrada' });
      expect((await refresh(refreshToken)).status).to.equal(401);
    });

    it('es idempotente: un token desconocido tambien responde 200', async () => {
      const response = await request(app).post('/api/auth/logout').send({ refreshToken: 'desconocido' });

      expect(response.status).to.equal(200);
    });
  });
});