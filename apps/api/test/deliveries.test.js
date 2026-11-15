import { expect } from 'chai';
import { asAdmin } from './helpers/auth.js';
import { DELIVERY_STATUS, ORDER_STATUS } from '../src/constants/index.js';
import {
  createCustomer,
  createDriver,
  createOrder,
  createDelivery,
  advanceDelivery,
  NON_EXISTENT_ID,
  MALFORMED_ID,
} from './helpers/fixtures.js';

describe('Entregas (/api/deliveries)', () => {
  describe('GET /api/deliveries', () => {
    it('devuelve 200 y un listado paginado con las entregas creadas, con order y driver populados', async () => {
      const delivery = await createDelivery();

      const response = await asAdmin().get('/api/deliveries');

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('data').that.is.an('array');
      expect(response.body).to.have.property('pagination');
      const found = response.body.data.find((d) => d._id === delivery._id);
      expect(found).to.exist;
      expect(found.order).to.be.an('object');
      expect(found.driver).to.be.an('object');
    });

    it('filtra por status cuando se envia por query param', async () => {
      await createDelivery();

      const response = await asAdmin().get(`/api/deliveries?status=${DELIVERY_STATUS.ASSIGNED}`);

      expect(response.status).to.equal(200);
      response.body.data.forEach((delivery) => expect(delivery.status).to.equal(DELIVERY_STATUS.ASSIGNED));
    });

    it('devuelve 400 INVALID_STATUS si el status de filtro no pertenece al enum', async () => {
      const response = await asAdmin().get('/api/deliveries?status=inexistente');

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_STATUS');
    });
  });

  describe('GET /api/deliveries/:did', () => {
    it('devuelve 200 y la entrega correspondiente al id', async () => {
      const delivery = await createDelivery();

      const response = await asAdmin().get(`/api/deliveries/${delivery._id}`);

      expect(response.status).to.equal(200);
      expect(response.body._id).to.equal(delivery._id);
      expect(response.body.status).to.equal(DELIVERY_STATUS.ASSIGNED);
    });

    it('devuelve 404 con el formato de error definido si la entrega no existe', async () => {
      const response = await asAdmin().get(`/api/deliveries/${NON_EXISTENT_ID}`);

      expect(response.status).to.equal(404);
      expect(response.body).to.deep.equal({
        success: false,
        error: { code: 'DELIVERY_NOT_FOUND', message: 'Entrega no encontrada' },
      });
    });

    it('devuelve 400 INVALID_ID si el id no tiene un formato valido', async () => {
      const response = await asAdmin().get(`/api/deliveries/${MALFORMED_ID}`);

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_ID');
    });
  });

  describe('POST /api/deliveries', () => {
    it('crea una entrega valida, devuelve 201 y deja el pedido en estado assigned', async () => {
      const customer = await createCustomer();
      const driver = await createDriver();
      const order = await createOrder(customer._id);

      const response = await asAdmin()
        .post('/api/deliveries')
        .send({ order: order._id, driver: driver._id });

      expect(response.status).to.equal(201);
      expect(response.body.status).to.equal(DELIVERY_STATUS.ASSIGNED);
      // deliveryRepository.create() no popula referencias (a diferencia
      // de findById/findAll): order y driver vienen como IDs planos.
      expect(response.body.order).to.equal(order._id);
      expect(response.body.driver).to.equal(driver._id);
      const orderResponse = await asAdmin().get(`/api/orders/${order._id}`);
      expect(orderResponse.body.status).to.equal(ORDER_STATUS.ASSIGNED);
      expect(orderResponse.body.delivery._id).to.equal(response.body._id);
    });

    it('devuelve 400 VALIDATION_ERROR si falta el driver', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);

      const response = await asAdmin().post('/api/deliveries').send({ order: order._id });

      expect(response.status).to.equal(400);
      expect(response.body).to.deep.equal({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'El repartidor es obligatorio' },
      });
    });

    it('devuelve 400 VALIDATION_ERROR si el usuario indicado como driver no tiene rol driver', async () => {
      const customer = await createCustomer();
      const otherCustomer = await createCustomer();
      const order = await createOrder(customer._id);

      const response = await asAdmin()
        .post('/api/deliveries')
        .send({ order: order._id, driver: otherCustomer._id });

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('devuelve 404 ORDER_NOT_FOUND si el pedido no existe', async () => {
      const driver = await createDriver();

      const response = await asAdmin()
        .post('/api/deliveries')
        .send({ order: NON_EXISTENT_ID, driver: driver._id });

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('ORDER_NOT_FOUND');
    });

    it('devuelve 404 USER_NOT_FOUND si el driver no existe', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);

      const response = await asAdmin()
        .post('/api/deliveries')
        .send({ order: order._id, driver: NON_EXISTENT_ID });

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('USER_NOT_FOUND');
    });

    it('devuelve 409 ORDER_ALREADY_PROCESSED si el pedido ya tiene una entrega asignada', async () => {
      const customer = await createCustomer();
      const driver = await createDriver();
      const secondDriver = await createDriver();
      const order = await createOrder(customer._id);

      await asAdmin().post('/api/deliveries').send({ order: order._id, driver: driver._id });

      const response = await asAdmin()
        .post('/api/deliveries')
        .send({ order: order._id, driver: secondDriver._id });

      expect(response.status).to.equal(409);
      expect(response.body.error.code).to.equal('ORDER_ALREADY_PROCESSED');
    });
  });

  describe('PATCH /api/deliveries/:did/status', () => {
    it('actualiza el estado y devuelve 200 con la entrega actualizada', async () => {
      const delivery = await createDelivery();

      const response = await asAdmin()
        .patch(`/api/deliveries/${delivery._id}/status`)
        .send({ status: DELIVERY_STATUS.PICKED_UP });

      expect(response.status).to.equal(200);
      expect(response.body.status).to.equal(DELIVERY_STATUS.PICKED_UP);
    });

    it('recorre el camino completo assigned -> picked_up -> in_transit -> delivered', async () => {
      const delivery = await createDelivery();

      const finalDelivery = await advanceDelivery(delivery._id);

      expect(finalDelivery.status).to.equal(DELIVERY_STATUS.DELIVERED);
    });

    it('cada avance de la entrega se refleja en el estado del pedido', async () => {
      const delivery = await createDelivery();

      for (const status of [DELIVERY_STATUS.PICKED_UP, DELIVERY_STATUS.IN_TRANSIT]) {
        await advanceDelivery(delivery._id, [status]);
        const orderResponse = await asAdmin().get(`/api/orders/${delivery.order}`);
        expect(orderResponse.body.status).to.equal(status);
      }
    });

    it('al marcar delivered, completa deliveredAt y el pedido pasa a delivered', async () => {
      const delivery = await createDelivery();

      const finalDelivery = await advanceDelivery(delivery._id);

      expect(finalDelivery.status).to.equal(DELIVERY_STATUS.DELIVERED);
      expect(finalDelivery.deliveredAt).to.not.be.null;

      // delivery.order (del fixture createDelivery, que llama a
      // POST /api/deliveries) tampoco viene populado: es el id plano.
      const orderResponse = await asAdmin().get(`/api/orders/${delivery.order}`);
      expect(orderResponse.body.status).to.equal(ORDER_STATUS.DELIVERED);
    });

    it('devuelve 400 VALIDATION_ERROR si no se envia el estado', async () => {
      const delivery = await createDelivery();

      const response = await asAdmin().patch(`/api/deliveries/${delivery._id}/status`).send({});

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('devuelve 400 INVALID_STATUS si el estado no pertenece al enum', async () => {
      const delivery = await createDelivery();

      const response = await asAdmin()
        .patch(`/api/deliveries/${delivery._id}/status`)
        .send({ status: 'returned' });

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_STATUS');
      expect(response.body.error.details).to.deep.equal({
        received: 'returned',
        allowed: Object.values(DELIVERY_STATUS),
      });
    });

    it('devuelve 404 DELIVERY_NOT_FOUND si la entrega no existe', async () => {
      const response = await asAdmin()
        .patch(`/api/deliveries/${NON_EXISTENT_ID}/status`)
        .send({ status: DELIVERY_STATUS.PICKED_UP });

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('DELIVERY_NOT_FOUND');
    });

    it('devuelve 409 DELIVERY_ALREADY_COMPLETED si la entrega ya fue entregada', async () => {
      const delivery = await createDelivery();
      await advanceDelivery(delivery._id);

      const response = await asAdmin()
        .patch(`/api/deliveries/${delivery._id}/status`)
        .send({ status: DELIVERY_STATUS.IN_TRANSIT });

      expect(response.status).to.equal(409);
      expect(response.body.error.code).to.equal('DELIVERY_ALREADY_COMPLETED');
    });

    describe('maquina de estados', () => {
      it('devuelve 409 INVALID_STATUS_TRANSITION al saltar de assigned a delivered, sin tocar el pedido', async () => {
        const delivery = await createDelivery();

        const response = await asAdmin()
          .patch(`/api/deliveries/${delivery._id}/status`)
          .send({ status: DELIVERY_STATUS.DELIVERED });

        expect(response.status).to.equal(409);
        expect(response.body.error.code).to.equal('INVALID_STATUS_TRANSITION');
        expect(response.body.error.details).to.deep.equal({
          from: DELIVERY_STATUS.ASSIGNED,
          to: DELIVERY_STATUS.DELIVERED,
          allowed: [DELIVERY_STATUS.PICKED_UP],
        });
        const orderResponse = await asAdmin().get(`/api/orders/${delivery.order}`);
        expect(orderResponse.body.status).to.equal(ORDER_STATUS.ASSIGNED);
      });

      it('devuelve 409 INVALID_STATUS_TRANSITION al retroceder o repetir el estado', async () => {
        const delivery = await createDelivery();
        await advanceDelivery(delivery._id, [DELIVERY_STATUS.PICKED_UP]);

        const backwards = await asAdmin()
          .patch(`/api/deliveries/${delivery._id}/status`)
          .send({ status: DELIVERY_STATUS.ASSIGNED });
        const repeated = await asAdmin()
          .patch(`/api/deliveries/${delivery._id}/status`)
          .send({ status: DELIVERY_STATUS.PICKED_UP });

        expect(backwards.status).to.equal(409);
        expect(backwards.body.error.code).to.equal('INVALID_STATUS_TRANSITION');
        expect(repeated.status).to.equal(409);
        expect(repeated.body.error.code).to.equal('INVALID_STATUS_TRANSITION');
      });
    });
  });

  describe('DELETE /api/deliveries/:did', () => {
    it('elimina la entrega y devuelve 200', async () => {
      const delivery = await createDelivery();

      const response = await asAdmin().delete(`/api/deliveries/${delivery._id}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ message: 'Entrega eliminada' });

      const getResponse = await asAdmin().get(`/api/deliveries/${delivery._id}`);
      expect(getResponse.status).to.equal(404);
    });

    it('el pedido deja de apuntar a la entrega y vuelve a created, listo para reasignarse', async () => {
      const delivery = await createDelivery();
      await advanceDelivery(delivery._id, [DELIVERY_STATUS.PICKED_UP]);

      await asAdmin().delete(`/api/deliveries/${delivery._id}`);

      const orderResponse = await asAdmin().get(`/api/orders/${delivery.order}`);
      expect(orderResponse.body.status).to.equal(ORDER_STATUS.CREATED);
      expect(orderResponse.body.delivery).to.equal(null);

      const newDriver = await createDriver();
      const reassign = await asAdmin()
        .post('/api/deliveries')
        .send({ order: delivery.order, driver: newDriver._id });
      expect(reassign.status).to.equal(201);
    });

    it('un pedido ya entregado conserva su estado aunque se elimine su entrega', async () => {
      const delivery = await createDelivery();
      await advanceDelivery(delivery._id);

      await asAdmin().delete(`/api/deliveries/${delivery._id}`);

      const orderResponse = await asAdmin().get(`/api/orders/${delivery.order}`);
      expect(orderResponse.body.status).to.equal(ORDER_STATUS.DELIVERED);
      expect(orderResponse.body.delivery).to.equal(null);
    });

    it('devuelve 404 DELIVERY_NOT_FOUND si la entrega no existe', async () => {
      const response = await asAdmin().delete(`/api/deliveries/${NON_EXISTENT_ID}`);

      expect(response.status).to.equal(404);
      expect(response.body.error.code).to.equal('DELIVERY_NOT_FOUND');
    });

    it('devuelve 400 INVALID_ID si el id no tiene un formato valido', async () => {
      const response = await asAdmin().delete(`/api/deliveries/${MALFORMED_ID}`);

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('INVALID_ID');
    });
  });
});
