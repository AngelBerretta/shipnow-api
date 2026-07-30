import userRepository from '../repositories/user.repository.js';
import orderRepository from '../repositories/order.repository.js';
import userService from './user.service.js';
import orderService from './order.service.js';
import deliveryService from './delivery.service.js';
import { ROLES, ORDER_STATUS } from '../constants/index.js';
import * as mockGenerator from '../utils/mock.generator.js';
import {
  ApiError,
  ValidationError,
  InvalidRoleError,
  InvalidMockQuantityError,
  MockGenerationError,
} from '../errors/index.js';

/**
 * MockService
 *
 * Orquesta el modulo de mocking. No inventa datos por si mismo (eso vive
 * en `utils/mock.generator.js`) ni conoce Mongoose directamente.
 *
 * Tiene dos responsabilidades bien separadas:
 *
 * 1. Preview (`preview*`): arma datos simulados en memoria, con forma
 *    identica a los modelos reales, y los devuelve SIN tocar la base.
 *
 * 2. Seed (`seedDatabase`): inserta datos de prueba reales en MongoDB,
 *    pero en vez de escribir a mano con los repositorios, reutiliza
 *    UserService / OrderService / DeliveryService. Esto garantiza que
 *    los datos de prueba respetan exactamente las mismas reglas de
 *    negocio que un alta real (por ejemplo: un pedido siempre nace en
 *    estado CREATED, una entrega solo puede crearse sobre un pedido
 *    CREATED y un driver con rol DRIVER, etc.), sin duplicar esa logica
 *    aca.
 *
 * Manejo de errores: igual que el resto de los Services, nunca arma una
 * respuesta HTTP. Lanza los errores personalizados de `src/errors/`
 * (`InvalidMockQuantityError`, `InvalidRoleError`, etc.) y el middleware
 * global (`errorHandler`) es quien decide como responderlos.
 */

const MAX_PREVIEW_COUNT = 100;
const MAX_SEED_COUNT = 200;

// Ciclo de roles usado al sembrar usuarios: garantiza que, para
// cualquier cantidad >= 4, siempre haya al menos un customer y un
// driver disponibles para poder generar pedidos y entregas coherentes.
// ADMIN queda deliberadamente afuera: UserService.createUser rechaza el
// alta publica de administradores, y el seeding respeta esa regla en
// vez de saltearla.
const SEED_ROLE_CYCLE = [ROLES.CUSTOMER, ROLES.CUSTOMER, ROLES.DRIVER, ROLES.STORE];

class MockService {
  // -------------------------------------------------------------------
  // Preview: datos simulados en memoria, nunca se guardan en MongoDB
  // -------------------------------------------------------------------

  previewUsers(count, role) {
    const n = this.***REMOVED***parseCount(count, 10, MAX_PREVIEW_COUNT, 'count');

    if (role && !Object.values(ROLES).includes(role)) {
      throw new InvalidRoleError(role, Object.values(ROLES));
    }

    return Array.from({ length: n }, () => mockGenerator.generateMockUser({ role }));
  }

  previewOrders(count) {
    const n = this.***REMOVED***parseCount(count, 10, MAX_PREVIEW_COUNT, 'count');
    return Array.from({ length: n }, () => mockGenerator.generateMockOrder());
  }

  previewDeliveries(count) {
    const n = this.***REMOVED***parseCount(count, 10, MAX_PREVIEW_COUNT, 'count');
    return Array.from({ length: n }, () => mockGenerator.generateMockDelivery());
  }

  /**
   * Arma un dataset completo y coherente (usuarios, pedidos y entregas
   * referenciandose entre si) sin escribir nada en la base. Util para
   * ver de un vistazo la forma final de los datos relacionados.
   */
  previewFullDataset({ users, orders, deliveries } = {}) {
    const usersCount = this.***REMOVED***parseCount(users, 5, MAX_PREVIEW_COUNT, 'users');
    const ordersCount = this.***REMOVED***parseCount(orders, 5, MAX_PREVIEW_COUNT, 'orders');
    const deliveriesCount = this.***REMOVED***parseCount(deliveries, 5, MAX_PREVIEW_COUNT, 'deliveries');

    const mockUsers = Array.from({ length: usersCount }, (_, index) =>
      mockGenerator.generateMockUser({ role: SEED_ROLE_CYCLE[index % SEED_ROLE_CYCLE.length] })
    ).map((user) => ({ _id: mockGenerator.fakeObjectId(), ...user }));

    const customers = mockUsers.filter((user) => user.role === ROLES.CUSTOMER);
    const drivers = mockUsers.filter((user) => user.role === ROLES.DRIVER);

    const mockOrders = Array.from({ length: ordersCount }, () =>
      mockGenerator.generateMockOrder({
        customer: customers.length ? mockGenerator.pick(customers)._id : undefined,
        status: ORDER_STATUS.CREATED,
      })
    ).map((order) => ({ _id: mockGenerator.fakeObjectId(), ...order }));

    const mockDeliveries = Array.from({ length: deliveriesCount }, () =>
      mockGenerator.generateMockDelivery({
        order: mockOrders.length ? mockGenerator.pick(mockOrders)._id : undefined,
        driver: drivers.length ? mockGenerator.pick(drivers)._id : undefined,
      })
    );

    return {
      note: 'Dataset simulado en memoria. Ningun documento fue guardado en MongoDB.',
      users: mockUsers,
      orders: mockOrders,
      deliveries: mockDeliveries,
    };
  }

  // -------------------------------------------------------------------
  // Seed: insercion real y controlada en MongoDB
  // -------------------------------------------------------------------

  async seedDatabase({ users, orders, deliveries } = {}) {
    const usersCount = this.***REMOVED***parseCount(users, 10, MAX_SEED_COUNT, 'users');
    const ordersCount = this.***REMOVED***parseCount(orders, 10, MAX_SEED_COUNT, 'orders');
    const deliveriesCount = this.***REMOVED***parseCount(deliveries, 5, MAX_SEED_COUNT, 'deliveries');

    const warnings = [];

    try {
      const createdUsers = await this.***REMOVED***seedUsers(usersCount);
      const createdOrders = await this.***REMOVED***seedOrders(ordersCount, createdUsers, warnings);
      const createdDeliveries = await this.***REMOVED***seedDeliveries(deliveriesCount, createdUsers, createdOrders, warnings);

      return {
        summary: {
          users: { requested: usersCount, created: createdUsers.length },
          orders: { requested: ordersCount, created: createdOrders.length },
          deliveries: { requested: deliveriesCount, created: createdDeliveries.length },
          warnings,
        },
        data: {
          users: createdUsers,
          orders: createdOrders,
          deliveries: createdDeliveries,
        },
      };
    } catch (error) {
      // Un ApiError (ej: "no hay customers para asociar pedidos") ya es
      // un error de dominio controlado: se propaga tal cual, para que el
      // middleware lo responda con su codigo y mensaje reales.
      if (error instanceof ApiError) {
        throw error;
      }

      // Cualquier otra cosa (conexion caida, timeout de Mongo, error de
      // escritura no controlado) se loguea completa server-side y se
      // traduce a una respuesta controlada en vez de dejar que un error
      // crudo de Mongoose/MongoDB llegue sin traducir al cliente.
      console.error('[mock.service] Fallo inesperado al cargar datos de prueba en MongoDB:', error);
      throw new MockGenerationError(
        'No se pudieron cargar los datos de prueba en MongoDB. Intenta nuevamente en unos segundos.'
      );
    }
  }

  // -------------------------------------------------------------------
  // Helpers privados de seeding
  // -------------------------------------------------------------------

  async ***REMOVED***seedUsers(count) {
    const created = [];
    for (let i = 0; i < count; i += 1) {
      const role = SEED_ROLE_CYCLE[i % SEED_ROLE_CYCLE.length];
      const payload = mockGenerator.generateMockUser({ role });
      const newUser = await userService.createUser(payload);
      created.push(newUser);
    }
    return created;
  }

  async ***REMOVED***seedOrders(count, createdUsers, warnings) {
    if (count === 0) return [];

    let customers = createdUsers.filter((user) => user.role === ROLES.CUSTOMER);
    if (customers.length === 0) {
      customers = await userRepository.findAll({ role: ROLES.CUSTOMER });
    }
    if (customers.length === 0) {
      throw new ValidationError(
        'No hay usuarios con rol "customer" para asociar a los pedidos. Genera usuarios primero (parametro "users" > 0).'
      );
    }

    const created = [];
    for (let i = 0; i < count; i += 1) {
      const customer = mockGenerator.pick(customers);
      const payload = {
        customer: customer._id,
        items: mockGenerator.generateMockOrderItems(),
        deliveryAddress: mockGenerator.buildFakeAddress(),
        priority: mockGenerator.randomPriority(),
      };
      const { order } = await orderService.createOrder(payload);
      created.push(order);
    }

    if (customers.length === 1) {
      warnings.push('Todos los pedidos se asociaron al unico usuario "customer" disponible.');
    }

    return created;
  }

  async ***REMOVED***seedDeliveries(count, createdUsers, createdOrders, warnings) {
    if (count === 0) return [];

    let drivers = createdUsers.filter((user) => user.role === ROLES.DRIVER);
    if (drivers.length === 0) {
      drivers = await userRepository.findAll({ role: ROLES.DRIVER });
    }
    if (drivers.length === 0) {
      warnings.push(
        'No se crearon entregas: no hay usuarios con rol "driver" disponibles. Genera usuarios primero (parametro "users" > 0).'
      );
      return [];
    }

    let eligibleOrders = createdOrders.filter((order) => order.status === ORDER_STATUS.CREATED);
    if (eligibleOrders.length < count) {
      const existingCreatedOrders = await orderRepository.findAll({ status: ORDER_STATUS.CREATED });
      const knownIds = new Set(eligibleOrders.map((order) => String(order._id)));
      for (const order of existingCreatedOrders) {
        if (!knownIds.has(String(order._id))) {
          eligibleOrders.push(order);
          knownIds.add(String(order._id));
        }
      }
    }

    let deliveriesToCreate = count;
    if (deliveriesToCreate > eligibleOrders.length) {
      warnings.push(
        `Se solicitaron ${count} entregas pero solo hay ${eligibleOrders.length} pedido(s) en estado "created" disponibles para asignar. Se crearon ${eligibleOrders.length}.`
      );
      deliveriesToCreate = eligibleOrders.length;
    }

    const created = [];
    for (let i = 0; i < deliveriesToCreate; i += 1) {
      const order = eligibleOrders[i];
      const driver = mockGenerator.pick(drivers);
      const payload = {
        order: order._id,
        driver: driver._id,
        priority: mockGenerator.randomPriority(),
      };
      const newDelivery = await deliveryService.createDelivery(payload);
      created.push(newDelivery);
    }

    return created;
  }

  /**
   * Convierte un valor de query/body en un entero valido dentro de
   * [0, max]. Si no se especifica, usa el default. Rechaza valores no
   * numericos o negativos con un InvalidMockQuantityError (400),
   * identificando el parametro (`fieldName`) que fallo.
   */
  ***REMOVED***parseCount(value, defaultValue, max, fieldName) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) {
      throw new InvalidMockQuantityError(`El parametro "${fieldName}" debe ser un numero`, {
        field: fieldName,
        received: value,
      });
    }
    if (n < 0) {
      throw new InvalidMockQuantityError(`El parametro "${fieldName}" no puede ser negativo`, {
        field: fieldName,
        received: value,
      });
    }
    return Math.min(Math.trunc(n), max);
  }
}

export default new MockService();
