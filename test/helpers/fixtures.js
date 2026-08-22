import request from 'supertest';
import app from '../../src/app.js';
import { ROLES } from '../../src/constants/index.js';

/**
 * test/helpers/fixtures.js
 *
 * Helpers para crear datos de prueba controlados y repetibles. A
 * proposito NO escriben directo con Mongoose: pasan siempre por la propia
 * API (via Supertest), para que un usuario o un pedido de fixture respete
 * exactamente las mismas reglas de negocio que un alta real (las mismas
 * que ademas se estan probando en los tests). Nada de esto persiste entre
 * tests: el afterEach global en test/setup.js limpia la base despues de
 * cada test individual.
 */

let sequence = 0;

/** Datos validos de un usuario, con campos unicos por invocacion (email). */
export function buildUserPayload(overrides = {}) {
  sequence += 1;
  return {
    firstName: 'Test',
    lastName: `User${sequence}`,
    email: `test.user.${Date.now()}.${sequence}@shipnow-tests.com`,
    password: 'Test1234!',
    role: ROLES.CUSTOMER,
    ...overrides,
  };
}

/** Crea un usuario real via POST /api/users y devuelve el body de la respuesta. */
export async function createUser(overrides = {}) {
  const payload = buildUserPayload(overrides);
  const response = await request(app).post('/api/users').send(payload);
  if (response.status !== 201) {
    throw new Error(`No se pudo crear el usuario de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

export const createCustomer = (overrides = {}) => createUser({ ...overrides, role: ROLES.CUSTOMER });
export const createDriver = (overrides = {}) => createUser({ ...overrides, role: ROLES.DRIVER });

/** Datos validos de un pedido para un customer ya existente. */
export function buildOrderPayload(customerId, overrides = {}) {
  return {
    customer: customerId,
    items: [{ name: 'Producto de prueba', quantity: 2, price: 100 }],
    deliveryAddress: 'Calle Falsa 123, Chivilcoy',
    ...overrides,
  };
}

/** Crea un pedido real via POST /api/orders y devuelve el pedido creado. */
export async function createOrder(customerId, overrides = {}) {
  const payload = buildOrderPayload(customerId, overrides);
  const response = await request(app).post('/api/orders').send(payload);
  if (response.status !== 201) {
    throw new Error(`No se pudo crear el pedido de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body.order;
}

/** Un ObjectId con formato valido pero que no existe en la base. */
export const NON_EXISTENT_ID = '64a000000000000000000000';

/** Un valor que NO es un ObjectId valido (dispara un CastError de Mongoose). */
export const MALFORMED_ID = 'no-es-un-object-id';
