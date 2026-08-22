import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { ORDER_STATUS } from '../src/constants/index.js';
import {
  createCustomer,
  createDriver,
  createOrder,
  buildOrderPayload,
  NON_EXISTENT_ID,
  MALFORMED_ID,
} from './helpers/fixtures.js';

describe('Pedidos (/api/orders)', () => {
  describe('GET /api/orders', () => {
    it('devuelve 200 y un arreglo con los pedidos creados, con el cliente populado', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);

      const response = await request(app).get('/api/orders');

      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array');
      const found = response.body.find((o) => o._id === order._id);
      expect(found).to.exist;
      expect(found.customer._id).to.equal(customer._id);
      expect(found.customer.email).to.equal(customer.email);
    });
  });

  describe('GET /api/orders/:oid', () => {
    it('devuelve 200 y la estructura completa del pedido', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id, {
        items: [{ name: 'Producto A', quantity: 2, price: 150 }],
      });

      const response = await request(app).get(`/api/orders/${order._id}`);

      expect(response.status).to.equal(200);
      expect(response.body._id).to.equal(order._id);
      expect(response.body.status).to.equal(ORDER_STATUS.CREATED);
      expect(response.body.total).to.equal(300);
      expect(response.body.items).to.have.lengthOf(1);
      expect(response.body.items[0]).to.include({ name: 'Producto A', quantity: 2, price: 150 });
      expect(response.body.customer._id).to.equal(customer._id);
    });

    it('devuelve 404 con el formato de error definido si el pedido no existe', async () => {
      const response = await request(app).get(`/api/orders/${NON_EXISTENT_ID}`);

      expect(response.status).to.equal(404);
      expect(response.body).to.deep.equal({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Pedido no encontrado' },
      });
    });

    it('devuelve 400 si el id no tiene un formato valido', async () => {
      const response = await request(app).get(`/api/orders/${MALFORMED_ID}`);

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_ID');
    });
  });

  describe('POST /api/orders', () => {
    it('crea un pedido valido y devuelve 201 con el pedido y el costo de envio', async () => {
      const customer = await createCustomer();
      const payload = buildOrderPayload(customer._id, {
        items: [
          { name: 'Producto A', quantity: 2, price: 100 },
          { name: 'Producto B', quantity: 1, price: 50 },
        ],
      });

      const response = await request(app).post('/api/orders').send(payload);

      expect(response.status).to.equal(201);
      expect(response.body.message).to.equal('Pedido creado y email enviado');
      expect(response.body.order.status).to.equal(ORDER_STATUS.CREATED);
      expect(response.body.order.total).to.equal(250);
      expect(response.body.order.customer).to.equal(customer._id);
      // shippingCost = suma(quantity) * 10 = (2 + 1) * 10
      expect(response.body.shippingCost).to.equal(30);
    });

    it('devuelve 400 VALIDATION_ERROR si faltan items', async () => {
      const customer = await createCustomer();

      const response = await request(app)
        .post('/api/orders')
        .send({ customer: customer._id, deliveryAddress: 'Calle Falsa 123' });

      expect(response.status).to.equal(400);
      expect(response.body).to.deep.equal({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Faltan los items del pedido' },
      });
    });

    it('devuelve 404 USER_NOT_FOUND si el cliente indicado no existe', async () => {
      const payload = buildOrderPayload(NON_EXISTENT_ID);

      const response = await request(app).post('/api/orders').send(payload);

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('USER_NOT_FOUND');
    });

    it('devuelve 403 FORBIDDEN_ACTION si el cliente es un repartidor', async () => {
      const driver = await createDriver();
      const payload = buildOrderPayload(driver._id);

      const response = await request(app).post('/api/orders').send(payload);

      expect(response.status).to.equal(403);
      expect(response.body.error.code).to.equal('FORBIDDEN_ACTION');
    });
  });

  describe('PATCH /api/orders/:oid/status', () => {
    it('actualiza el estado y devuelve 200 con el pedido actualizado', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);

      const response = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .send({ status: ORDER_STATUS.ASSIGNED });

      expect(response.status).to.equal(200);
      expect(response.body._id).to.equal(order._id);
      expect(response.body.status).to.equal(ORDER_STATUS.ASSIGNED);
    });

    it('devuelve 400 VALIDATION_ERROR si no se envia el estado', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);

      const response = await request(app).patch(`/api/orders/${order._id}/status`).send({});

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('devuelve 400 INVALID_STATUS si el estado no pertenece al enum', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);

      const response = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .send({ status: 'estado_inventado' });

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_STATUS');
      expect(response.body.error.details).to.deep.equal({
        received: 'estado_inventado',
        allowed: Object.values(ORDER_STATUS),
      });
    });

    it('devuelve 404 ORDER_NOT_FOUND si el pedido no existe', async () => {
      const response = await request(app)
        .patch(`/api/orders/${NON_EXISTENT_ID}/status`)
        .send({ status: ORDER_STATUS.ASSIGNED });

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('ORDER_NOT_FOUND');
    });

    it('devuelve 409 ORDER_ALREADY_DELIVERED si el pedido ya fue entregado', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);
      await request(app).patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.DELIVERED });

      const response = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .send({ status: ORDER_STATUS.CANCELLED });

      expect(response.status).to.equal(409);
      expect(response.body.error.code).to.equal('ORDER_ALREADY_DELIVERED');
    });
  });
});
