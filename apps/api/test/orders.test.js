import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { ORDER_STATUS, TRACKING_CODE } from '../src/constants/index.js';
import {
  createCustomer,
  createDriver,
  createStore,
  createOrder,
  createDelivery,
  buildOrderPayload,
  advanceOrder,
  NON_EXISTENT_ID,
  MALFORMED_ID,
} from './helpers/fixtures.js';

describe('Pedidos (/api/orders)', () => {
  describe('GET /api/orders', () => {
    it('devuelve 200 y un listado paginado con los pedidos creados, con el cliente populado', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);

      const response = await request(app).get('/api/orders');

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('data').that.is.an('array');
      expect(response.body).to.have.property('pagination');
      const found = response.body.data.find((o) => o._id === order._id);
      expect(found).to.exist;
      expect(found.customer._id).to.equal(customer._id);
      expect(found.customer.email).to.equal(customer.email);
    });

    it('filtra por status cuando se envia por query param', async () => {
      const customer = await createCustomer();
      await createOrder(customer._id);

      const response = await request(app).get(`/api/orders?status=${ORDER_STATUS.CREATED}`);

      expect(response.status).to.equal(200);
      response.body.data.forEach((order) => expect(order.status).to.equal(ORDER_STATUS.CREATED));
    });

    it('filtra por store cuando se envia por query param', async () => {
      const customer = await createCustomer();
      const store = await createStore();
      const ownOrder = await createOrder(customer._id, { store: store._id });
      await createOrder(customer._id);

      const response = await request(app).get(`/api/orders?store=${store._id}`);

      expect(response.status).to.equal(200);
      expect(response.body.data).to.have.lengthOf(1);
      expect(response.body.data[0]._id).to.equal(ownOrder._id);
    });

    it('devuelve 400 INVALID_STATUS si el status de filtro no pertenece al enum', async () => {
      const response = await request(app).get('/api/orders?status=inexistente');

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_STATUS');
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
      expect(response.body.trackingCode).to.match(TRACKING_CODE.PATTERN);
      expect(response.body.store).to.equal(null);
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

    it('asigna un codigo de seguimiento con el formato definido, distinto en cada pedido', async () => {
      const customer = await createCustomer();

      const first = await createOrder(customer._id);
      const second = await createOrder(customer._id);

      expect(first.trackingCode).to.match(TRACKING_CODE.PATTERN);
      expect(second.trackingCode).to.match(TRACKING_CODE.PATTERN);
      expect(first.trackingCode).to.not.equal(second.trackingCode);
    });

    it('asocia el pedido a una tienda cuando se envia store con rol store', async () => {
      const customer = await createCustomer();
      const store = await createStore();

      const order = await createOrder(customer._id, { store: store._id });

      expect(order.store).to.equal(store._id);
    });

    it('devuelve 400 VALIDATION_ERROR si el usuario indicado como store no tiene rol store', async () => {
      const customer = await createCustomer();
      const notAStore = await createCustomer();

      const response = await request(app)
        .post('/api/orders')
        .send(buildOrderPayload(customer._id, { store: notAStore._id }));

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('devuelve 404 USER_NOT_FOUND si la tienda indicada no existe', async () => {
      const customer = await createCustomer();

      const response = await request(app)
        .post('/api/orders')
        .send(buildOrderPayload(customer._id, { store: NON_EXISTENT_ID }));

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('USER_NOT_FOUND');
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

    it('permite cancelar un pedido que todavia no tiene entrega', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);

      const response = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .send({ status: ORDER_STATUS.CANCELLED });

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal(ORDER_STATUS.CANCELLED);
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
      await advanceOrder(order._id); // created -> assigned -> picked_up -> in_transit -> delivered

      const response = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .send({ status: ORDER_STATUS.CANCELLED });

      expect(response.status).to.equal(409);
      expect(response.body.error.code).to.equal('ORDER_ALREADY_DELIVERED');
    });

    describe('maquina de estados', () => {
      it('devuelve 409 INVALID_STATUS_TRANSITION al saltar de created a delivered, con los estados permitidos', async () => {
        const customer = await createCustomer();
        const order = await createOrder(customer._id);

        const response = await request(app)
          .patch(`/api/orders/${order._id}/status`)
          .send({ status: ORDER_STATUS.DELIVERED });

        expect(response.status).to.equal(409);
        expect(response.body.success).to.equal(false);
        expect(response.body.error.code).to.equal('INVALID_STATUS_TRANSITION');
        expect(response.body.error.details).to.deep.equal({
          from: ORDER_STATUS.CREATED,
          to: ORDER_STATUS.DELIVERED,
          allowed: [ORDER_STATUS.ASSIGNED, ORDER_STATUS.CANCELLED],
        });
        const unchanged = await request(app).get(`/api/orders/${order._id}`);
        expect(unchanged.body.status).to.equal(ORDER_STATUS.CREATED);
      });

      it('devuelve 409 INVALID_STATUS_TRANSITION al repetir el estado actual', async () => {
        const customer = await createCustomer();
        const order = await createOrder(customer._id);

        const response = await request(app)
          .patch(`/api/orders/${order._id}/status`)
          .send({ status: ORDER_STATUS.CREATED });

        expect(response.status).to.equal(409);
        expect(response.body.error.code).to.equal('INVALID_STATUS_TRANSITION');
      });

      it('devuelve 409 INVALID_STATUS_TRANSITION al retroceder', async () => {
        const customer = await createCustomer();
        const order = await createOrder(customer._id);
        await advanceOrder(order._id, ['assigned', 'picked_up']);

        const response = await request(app)
          .patch(`/api/orders/${order._id}/status`)
          .send({ status: ORDER_STATUS.ASSIGNED });

        expect(response.status).to.equal(409);
        expect(response.body.error.code).to.equal('INVALID_STATUS_TRANSITION');
      });

      it('un pedido cancelado es un estado final', async () => {
        const customer = await createCustomer();
        const order = await createOrder(customer._id);
        await advanceOrder(order._id, ['cancelled']);

        const response = await request(app)
          .patch(`/api/orders/${order._id}/status`)
          .send({ status: ORDER_STATUS.CREATED });

        expect(response.status).to.equal(409);
        expect(response.body.error.code).to.equal('INVALID_STATUS_TRANSITION');
        expect(response.body.error.details.allowed).to.deep.equal([]);
      });

      it('devuelve 409 ORDER_HAS_ACTIVE_DELIVERY al cancelar un pedido con entrega asociada', async () => {
        const delivery = await createDelivery();

        const response = await request(app)
          .patch(`/api/orders/${delivery.order}/status`)
          .send({ status: ORDER_STATUS.CANCELLED });

        expect(response.status).to.equal(409);
        expect(response.body.error.code).to.equal('ORDER_HAS_ACTIVE_DELIVERY');
      });
    });
  });

  describe('DELETE /api/orders/:oid', () => {
    it('elimina el pedido y devuelve 200', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);

      const response = await request(app).delete(`/api/orders/${order._id}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ message: 'Pedido eliminado' });
      const getResponse = await request(app).get(`/api/orders/${order._id}`);
      expect(getResponse.status).to.equal(404);
    });

    it('elimina en cascada la entrega asociada y el historial del pedido', async () => {
      const delivery = await createDelivery();

      const response = await request(app).delete(`/api/orders/${delivery.order}`);

      expect(response.status).to.equal(200);
      const deliveryResponse = await request(app).get(`/api/deliveries/${delivery._id}`);
      expect(deliveryResponse.status).to.equal(404);
      const eventsResponse = await request(app).get(`/api/orders/${delivery.order}/events`);
      expect(eventsResponse.status).to.equal(404);
    });

    it('devuelve 404 ORDER_NOT_FOUND si el pedido no existe', async () => {
      const response = await request(app).delete(`/api/orders/${NON_EXISTENT_ID}`);

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('ORDER_NOT_FOUND');
    });

    it('devuelve 400 INVALID_ID si el id no tiene un formato valido', async () => {
      const response = await request(app).delete(`/api/orders/${MALFORMED_ID}`);

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_ID');
    });
  });
});
