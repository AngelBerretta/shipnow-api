import { asAdmin, TEST_PASSWORD } from './auth.js';
import userService from '../../src/services/user.service.js';
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
    email: `test.user.${Date.now()}.${sequence}@ruvika-tests.com`,
    password: TEST_PASSWORD,
    role: ROLES.CUSTOMER,
    ...overrides,
  };
}

/** Crea un usuario real por el UserService (mismas reglas que el alta) y lo devuelve como JSON plano. */
export async function createUser(overrides = {}) {
  const user = await userService.createUser(buildUserPayload(overrides));
  return JSON.parse(JSON.stringify(user));
}

export const createCustomer = (overrides = {}) => createUser({ ...overrides, role: ROLES.CUSTOMER });
export const createDriver = (overrides = {}) => createUser({ ...overrides, role: ROLES.DRIVER });
export const createStore = (overrides = {}) => createUser({ ...overrides, role: ROLES.STORE });

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
  const response = await asAdmin().post('/api/orders').send(payload);
  if (response.status !== 201) {
    throw new Error(`No se pudo crear el pedido de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body.order;
}

/**
 * Crea una entrega real (con su cliente, pedido y repartidor de
 * fixture) via POST /api/deliveries y devuelve la entrega creada.
 */
export async function createDelivery(overrides = {}) {
  const customer = await createCustomer();
  const driver = await createDriver();
  const order = await createOrder(customer._id);
  const payload = { order: order._id, driver: driver._id, ...overrides };

  const response = await asAdmin().post('/api/deliveries').send(payload);
  if (response.status !== 201) {
    throw new Error(`No se pudo crear la entrega de prueba: ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

/** Camino completo (valido) de una entrega recien asignada: lo recorre estado por estado. */
export const DELIVERY_PATH_AFTER_ASSIGNED = ['picked_up', 'in_transit', 'delivered'];

/** Avanza una entrega por la lista de estados dada (cada paso es un PATCH real). */
export async function advanceDelivery(deliveryId, statuses = DELIVERY_PATH_AFTER_ASSIGNED) {
  let response;
  for (const status of statuses) {
    response = await asAdmin().patch(`/api/deliveries/${deliveryId}/status`).send({ status });
    if (response.status !== 200) {
      throw new Error(`No se pudo avanzar la entrega a "${status}": ${JSON.stringify(response.body)}`);
    }
  }
  return response?.body;
}

/** Avanza un pedido (sin entrega) por la lista de estados dada. */
export async function advanceOrder(orderId, statuses = ['assigned', 'picked_up', 'in_transit', 'delivered']) {
  let response;
  for (const status of statuses) {
    response = await asAdmin().patch(`/api/orders/${orderId}/status`).send({ status });
    if (response.status !== 200) {
      throw new Error(`No se pudo avanzar el pedido a "${status}": ${JSON.stringify(response.body)}`);
    }
  }
  return response?.body;
}

/** Un ObjectId con formato valido pero que no existe en la base. */
export const NON_EXISTENT_ID = '64a000000000000000000000';

/** Un valor que NO es un ObjectId valido (dispara un CastError de Mongoose). */
export const MALFORMED_ID = 'no-es-un-object-id';
