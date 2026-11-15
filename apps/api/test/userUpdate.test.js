import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import userService from '../src/services/user.service.js';
import { asAdmin, loginAs, loginAsUser, session } from './helpers/auth.js';
import { buildUserPayload, createCustomer, NON_EXISTENT_ID, MALFORMED_ID } from './helpers/fixtures.js';

const patch = (id, body) => asAdmin().patch(`/api/users/${id}`).send(body);

describe('Edicion de usuarios (PATCH /api/users/:uid)', () => {
  it('actualiza nombre y rol y devuelve 200 sin password', async () => {
    const user = await createCustomer();

    const response = await patch(user._id, { firstName: 'Nuevo', lastName: 'Nombre', role: 'driver' });

    expect(response.status).to.equal(200);
    expect(response.body).to.include({ firstName: 'Nuevo', lastName: 'Nombre', role: 'driver', email: user.email });
    expect(response.body).to.not.have.property('password');
  });

  it('cambia la contrasena: la nueva sirve para iniciar sesion', async () => {
    const user = await createCustomer();

    const response = await patch(user._id, { password: 'Nueva1234!' });

    expect(response.status).to.equal(200);
    const session2 = await loginAs(user.email, 'Nueva1234!');
    expect(session2.user._id).to.equal(user._id);
  });

  it('desactivar a un usuario le impide iniciar sesion; reactivarlo se lo devuelve', async () => {
    const user = await createCustomer();

    await patch(user._id, { isActive: false });
    const blocked = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Test1234!' });
    await patch(user._id, { isActive: true });
    const allowed = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Test1234!' });

    expect(blocked.status).to.equal(403);
    expect(allowed.status).to.equal(200);
  });

  it('una peticion sin cambios devuelve 200 con el usuario tal cual', async () => {
    const user = await createCustomer();

    const response = await patch(user._id, {});

    expect(response.status).to.equal(200);
    expect(response.body._id).to.equal(user._id);
  });

  it('devuelve 403 si el admin intenta desactivarse a si mismo o cambiar su propio rol', async () => {
    const deactivate = await patch(session.admin._id, { isActive: false });
    const demote = await patch(session.admin._id, { role: 'customer' });

    expect(deactivate.status).to.equal(403);
    expect(demote.status).to.equal(403);
  });

  it('devuelve 403 si se intenta otorgar el rol admin o cambiar el rol de otro admin', async () => {
    const user = await createCustomer();
    const otherAdmin = await userService.createAdminUser(buildUserPayload());

    const promote = await patch(user._id, { role: 'admin' });
    const demote = await patch(otherAdmin._id, { role: 'customer' });

    expect(promote.status).to.equal(403);
    expect(promote.body.error.code).to.equal('FORBIDDEN_ACTION');
    expect(demote.status).to.equal(403);
  });

  it('un admin si puede editar el nombre de otro admin (sin tocar su rol)', async () => {
    const otherAdmin = await userService.createAdminUser(buildUserPayload());

    const response = await patch(otherAdmin._id, { firstName: 'Renombrado', role: 'admin' });

    expect(response.status).to.equal(200);
    expect(response.body.firstName).to.equal('Renombrado');
    expect(response.body.role).to.equal('admin');
  });

  it('devuelve 400 INVALID_ROLE si el rol no existe', async () => {
    const user = await createCustomer();

    const response = await patch(user._id, { role: 'super-admin' });

    expect(response.status).to.equal(400);
    expect(response.body.error.code).to.equal('INVALID_ROLE');
  });

  it('devuelve 400 VALIDATION_ERROR con el detalle si la contrasena es corta o isActive no es booleano', async () => {
    const user = await createCustomer();

    const shortPassword = await patch(user._id, { password: '123' });
    const badFlag = await patch(user._id, { isActive: 'no' });

    expect(shortPassword.status).to.equal(400);
    expect(shortPassword.body.error.code).to.equal('VALIDATION_ERROR');
    expect(shortPassword.body.error.details[0].field).to.equal('password');
    expect(badFlag.status).to.equal(400);
  });

  it('devuelve 404 USER_NOT_FOUND si el usuario no existe y 400 INVALID_ID si el id es invalido', async () => {
    const missing = await patch(NON_EXISTENT_ID, { firstName: 'X' });
    const malformed = await patch(MALFORMED_ID, { firstName: 'X' });

    expect(missing.status).to.equal(404);
    expect(missing.body.error.code).to.equal('USER_NOT_FOUND');
    expect(malformed.status).to.equal(400);
    expect(malformed.body.error.code).to.equal('INVALID_ID');
  });

  it('solo el admin puede editar: un customer recibe 403 incluso sobre su propio perfil', async () => {
    const me = await createCustomer();
    const api = await loginAsUser(me);

    const response = await api.patch(`/api/users/${me._id}`).send({ role: 'driver' });

    expect(response.status).to.equal(403);
  });
});
