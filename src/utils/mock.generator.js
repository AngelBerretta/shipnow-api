import mongoose from 'mongoose';
import { ROLES, ORDER_STATUS, DELIVERY_STATUS, PRIORITY } from '../constants/index.js';

/**
 * mock.generator.js
 *
 * Generador de datos falsos, puro y sin dependencias externas (no usa
 * librerias como faker). No conoce Express ni Mongoose queries: solo arma
 * objetos JavaScript planos con forma similar a los modelos reales.
 *
 * Esta es la UNICA pieza del modulo de mocking que "inventa" datos. El
 * resto de las capas (service, controller, routes) no generan ningun
 * valor a mano: siempre delegan aca.
 */

// ---------------------------------------------------------------------------
// Pools de datos de referencia (sabor Argentina, coherente con ShipNow)
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Sofia', 'Mateo', 'Valentina', 'Lucas', 'Martina', 'Thiago', 'Emma',
  'Benjamin', 'Catalina', 'Joaquin', 'Isabella', 'Santiago', 'Renata',
  'Bautista', 'Alma', 'Franco', 'Delfina', 'Agustin', 'Julieta', 'Nicolas',
  'Camila', 'Tomas', 'Lucia', 'Ignacio', 'Victoria',
];

const LAST_NAMES = [
  'Gomez', 'Rodriguez', 'Fernandez', 'Lopez', 'Diaz', 'Martinez', 'Perez',
  'Garcia', 'Sosa', 'Romero', 'Alvarez', 'Torres', 'Ruiz', 'Ramirez',
  'Flores', 'Acosta', 'Benitez', 'Medina', 'Herrera', 'Suarez',
];

const STREETS = [
  'Av. Rivadavia', 'Av. Corrientes', 'San Martin', 'Belgrano', 'Mitre',
  'Sarmiento', '25 de Mayo', 'Av. Libertador', 'Independencia', 'Moreno',
];

const CITIES = [
  'Chivilcoy', 'Buenos Aires', 'La Plata', 'Mar del Plata', 'Rosario',
  'Cordoba', 'Mendoza', 'Bahia Blanca', 'San Nicolas', 'Junin',
];

const PRODUCT_NAMES = [
  'Auriculares inalambricos', 'Zapatillas running', 'Mochila urbana',
  'Cafetera electrica', 'Smartwatch', 'Set de herramientas', 'Lampara LED',
  'Silla de escritorio', 'Termo acero inoxidable', 'Mouse gamer',
  'Teclado mecanico', 'Bicicleta plegable', 'Parlante bluetooth',
  'Cargador portatil', 'Kit de limpieza',
];

const EMAIL_DOMAINS = ['mail.com', 'example.com', 'testmail.com', 'shipnow-test.com'];

// ---------------------------------------------------------------------------
// Helpers de azar
// ---------------------------------------------------------------------------

export function pick(array) {
  return array[randomInt(0, array.length - 1)];
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

export function randomEnumValue(enumObject) {
  return pick(Object.values(enumObject));
}

export function randomPriority() {
  return randomEnumValue(PRIORITY);
}

export function fakeObjectId() {
  return new mongoose.Types.ObjectId().toString();
}

export function randomPastDate(daysBack = 30) {
  const now = Date.now();
  const past = now - randomInt(0, daysBack) * 24 * 60 * 60 * 1000;
  return new Date(past);
}

function removeDiacritics(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

let emailSequence = 0;

function buildUniqueEmail(firstName, lastName) {
  emailSequence += 1;
  const cleanFirst = removeDiacritics(firstName).toLowerCase();
  const cleanLast = removeDiacritics(lastName).toLowerCase();
  const suffix = `${Date.now().toString().slice(-4)}${emailSequence}`;
  return `${cleanFirst}.${cleanLast}${suffix}@${pick(EMAIL_DOMAINS)}`;
}

function buildFakePassword() {
  return `Mock${randomInt(1000, 9999)}!`;
}

export function buildFakeAddress() {
  return `${pick(STREETS)} ${randomInt(1, 4999)}, ${pick(CITIES)}`;
}

// ---------------------------------------------------------------------------
// Builders de entidades (forma identica a los modelos reales)
// ---------------------------------------------------------------------------

/**
 * Genera un usuario falso. Si no se especifica `role`, se sortea uno
 * cualquiera de ROLES (incluye ADMIN: solo aplica a datos que NO se
 * persisten via UserService, ya que la regla de negocio real bloquea
 * el alta publica de administradores).
 */
export function generateMockUser({ role } = {}) {
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);

  return {
    firstName,
    lastName,
    email: buildUniqueEmail(firstName, lastName),
    password: buildFakePassword(),
    role: role || randomEnumValue(ROLES),
    documents: [],
  };
}

function generateMockOrderItem() {
  return {
    name: pick(PRODUCT_NAMES),
    quantity: randomInt(1, 5),
    price: randomFloat(500, 50000, 2),
  };
}

export function generateMockOrderItems(count) {
  const itemsCount = count || randomInt(1, 4);
  return Array.from({ length: itemsCount }, generateMockOrderItem);
}

/**
 * Genera un pedido falso. `customer` es opcional: si no se pasa, se usa
 * un ObjectId con formato valido pero inexistente (uso exclusivo de
 * previews que no tocan la base).
 */
export function generateMockOrder({ customer, status, priority } = {}) {
  const items = generateMockOrderItems();
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return {
    customer: customer || fakeObjectId(),
    items,
    deliveryAddress: buildFakeAddress(),
    total,
    status: status || randomEnumValue(ORDER_STATUS),
    priority: priority || randomPriority(),
  };
}

/**
 * Genera una entrega falsa. `order` y `driver` son opcionales: si no se
 * pasan, se usan ObjectId con formato valido pero inexistentes (uso
 * exclusivo de previews que no tocan la base).
 */
export function generateMockDelivery({ order, driver, status, priority } = {}) {
  const resolvedStatus = status || randomEnumValue(DELIVERY_STATUS);

  return {
    order: order || fakeObjectId(),
    driver: driver || fakeObjectId(),
    status: resolvedStatus,
    priority: priority || randomPriority(),
    assignedAt: resolvedStatus !== DELIVERY_STATUS.PENDING ? randomPastDate() : null,
    deliveredAt: resolvedStatus === DELIVERY_STATUS.DELIVERED ? randomPastDate() : null,
  };
}
