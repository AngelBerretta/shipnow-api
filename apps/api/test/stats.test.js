import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { asAdmin, loginAsUser } from './helpers/auth.js';
import { ORDER_STATUS } from '../src/constants/index.js';
import { DEFAULT_TIMEZONE, dayKey } from '../src/utils/dates.js';
import { createCustomer, createOrder, createDelivery, advanceDelivery } from './helpers/fixtures.js';

describe('Metricas (/api/stats)', () => {
  describe('GET /api/stats/overview', () => {
    it('devuelve 401 UNAUTHORIZED sin token', async () => {
      const response = await request(app).get('/api/stats/overview');

      expect(response.status).to.equal(401);
      expect(response.body.error.code).to.equal('UNAUTHORIZED');
    });

    it('devuelve 403 FORBIDDEN_ACTION si el usuario no es admin', async () => {
      const api = await loginAsUser(await createCustomer());

      const response = await api.get('/api/stats/overview');

      expect(response.status).to.equal(403);
      expect(response.body.error.code).to.equal('FORBIDDEN_ACTION');
    });

    it('con la base vacia devuelve todo en cero y una serie de 14 dias', async () => {
      const response = await asAdmin().get('/api/stats/overview');

      expect(response.status).to.equal(200);
      expect(response.body.kpis).to.deep.equal({
        ordersToday: 0,
        inTransit: 0,
        delivered: 0,
        cancelled: 0,
        totalOrders: 0,
        deliveryRate: 0,
      });
      expect(response.body.byStatus.map((row) => row.status)).to.deep.equal(Object.values(ORDER_STATUS));
      response.body.byStatus.forEach((row) => expect(row.count).to.equal(0));
      expect(response.body.perDay).to.have.lengthOf(14);
    });

    it('calcula KPIs, pedidos por estado y la serie diaria a partir de los pedidos reales', async () => {
      const customer = await createCustomer();
      await createOrder(customer._id); // created
      const cancelled = await createOrder(customer._id);
      await asAdmin().patch(`/api/orders/${cancelled._id}/status`).send({ status: 'cancelled' });
      const inTransit = await createDelivery();
      await advanceDelivery(inTransit._id, ['picked_up', 'in_transit']);
      const delivered = await createDelivery();
      await advanceDelivery(delivered._id); // hasta delivered

      const response = await asAdmin().get('/api/stats/overview');

      expect(response.status).to.equal(200);
      expect(response.body.kpis).to.deep.equal({
        ordersToday: 4,
        inTransit: 1,
        delivered: 1,
        cancelled: 1,
        totalOrders: 4,
        // 1 entregado de 3 pedidos no cancelados
        deliveryRate: 33.3,
      });
      const counts = Object.fromEntries(response.body.byStatus.map((row) => [row.status, row.count]));
      expect(counts).to.include({ created: 1, in_transit: 1, delivered: 1, cancelled: 1, assigned: 0 });

      const today = response.body.perDay.at(-1);
      expect(today).to.deep.equal({ date: dayKey(new Date(), DEFAULT_TIMEZONE), created: 4, delivered: 1 });
    });

    it('respeta ?days y lo acota a un maximo de 90; un valor invalido cae al default', async () => {
      const seven = await asAdmin().get('/api/stats/overview?days=7');
      const tooMany = await asAdmin().get('/api/stats/overview?days=999');
      const invalid = await asAdmin().get('/api/stats/overview?days=abc');

      expect(seven.body.perDay).to.have.lengthOf(7);
      expect(tooMany.body.perDay).to.have.lengthOf(90);
      expect(invalid.body.perDay).to.have.lengthOf(14);
    });
  });
});
