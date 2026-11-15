import request from 'supertest';
import app from '../../src/app.js';
import userService from '../../src/services/user.service.js';

export const TEST_PASSWORD = 'Test1234!';
export const ADMIN_PASSWORD = 'Admin1234!';

/** Admin de la sesion de test actual (lo recrea el beforeEach global de setup.js). */
export const session = { admin: null, adminToken: null };

export async function loginAs(email, password = TEST_PASSWORD) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  if (response.status !== 200) {
    throw new Error(`No se pudo iniciar sesion de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export async function startAdminSession() {
  const admin = await userService.createAdminUser({
    firstName: 'Admin',
    lastName: 'Tests',
    email: 'admin.tests@ruvika-tests.com',
    password: ADMIN_PASSWORD,
  });
  const { accessToken } = await loginAs(admin.email, ADMIN_PASSWORD);
  session.admin = JSON.parse(JSON.stringify(admin));
  session.adminToken = accessToken;
}

/** Igual que `request(app)`, pero con el header Authorization ya puesto. */
export function withToken(token) {
  const agent = {};
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    agent[method] = (url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
  }
  return agent;
}

export const asAdmin = () => withToken(session.adminToken);

/** Loguea a un usuario de fixture (creado con la contraseña TEST_PASSWORD) y devuelve un agente autenticado. */
export async function loginAsUser(user) {
  const { accessToken } = await loginAs(user.email);
  return withToken(accessToken);
}