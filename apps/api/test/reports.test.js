import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import { asAdmin, loginAsUser } from './helpers/auth.js';
import { toCsv } from '../src/utils/csv.js';
import { isDayKey } from '../src/utils/dates.js';
import { ORDER_STATUS } from '../src/constants/index.js';
import { createCustomer, createStore, createOrder, createDelivery, advanceDelivery } from './helpers/fixtures.js';

const binary = (res, callback) => {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

describe('Reportes (/api/reports)', () => {
  it('requiere token y rol admin', async () => {
    expect((await request(app).get('/api/reports/overview')).status).to.equal(401);
    const api = await loginAsUser(await createCustomer());
    expect((await api.get('/api/reports/overview')).status).to.equal(403);
  });

  it('con la base vacía devuelve ceros y 30 días de serie', async () => {
    const response = await asAdmin().get('/api/reports/overview');

    expect(response.status).to.equal(200);
    expect(response.body.summary).to.deep.equal({
      totalOrders: 0,
      delivered: 0,
      cancelled: 0,
      inProgress: 0,
      fulfillmentRate: 0,
      avgDeliveryMinutes: null,
      deliveriesCompleted: 0,
    });
    expect(response.body.perDay).to.have.lengthOf(30);
    expect(response.body.byDriver).to.deep.equal([]);
    expect(response.body.byStore).to.deep.equal([]);
  });

  it('calcula resumen, desempeño por repartidor y por tienda', async () => {
    const customer = await createCustomer();
    const store = await createStore();
    await createOrder(customer._id, { store: store._id }); // creado, con tienda
    const cancelled = await createOrder(customer._id);
    await asAdmin().patch(`/api/orders/${cancelled._id}/status`).send({ status: ORDER_STATUS.CANCELLED });
    const delivery = await createDelivery();
    await advanceDelivery(delivery._id);

    const response = await asAdmin().get('/api/reports/overview');

    expect(response.status).to.equal(200);
    expect(response.body.summary).to.include({ totalOrders: 3, delivered: 1, cancelled: 1, inProgress: 1, deliveriesCompleted: 1 });
    expect(response.body.summary.fulfillmentRate).to.equal(50); // 1 entregado de 2 no cancelados
    expect(response.body.summary.avgDeliveryMinutes).to.be.a('number');

    expect(response.body.byDriver).to.have.lengthOf(1);
    expect(response.body.byDriver[0]).to.include({ deliveries: 1, delivered: 1, fulfillmentRate: 100 });
    expect(response.body.byDriver[0].name).to.be.a('string').that.is.not.empty;

    const byName = Object.fromEntries(response.body.byStore.map((row) => [row.name, row]));
    expect(byName['Sin tienda']).to.include({ orders: 2, delivered: 1, cancelled: 1 });
    expect(byName[`${store.firstName} ${store.lastName}`]).to.include({ orders: 1, delivered: 0 });

    const today = response.body.perDay.at(-1);
    expect(today).to.include({ created: 3, delivered: 1 });
  });

  it('valida el período', async () => {
    const swapped = await asAdmin().get('/api/reports/overview?from=2026-11-10&to=2026-11-01');
    const malformed = await asAdmin().get('/api/reports/overview?from=ayer&to=hoy');
    const impossible = await asAdmin().get('/api/reports/overview?from=2026-02-30&to=2026-03-02');
    const tooLong = await asAdmin().get('/api/reports/overview?from=2020-01-01&to=2026-01-01');

    [swapped, malformed, impossible, tooLong].forEach((response) => {
      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });
  });

  it('exporta CSV por tipo y rechaza un tipo inválido', async () => {
    await createDelivery();

    const response = await asAdmin().get('/api/reports/export.csv?type=drivers');
    const invalid = await asAdmin().get('/api/reports/export.csv?type=otro');

    expect(response.status).to.equal(200);
    expect(response.headers['content-type']).to.include('text/csv');
    expect(response.headers['content-disposition']).to.include('ruvika-drivers-');
    expect(response.text).to.include('Repartidor;Entregas;Entregadas');
    expect(response.text.split('\r\n').filter(Boolean)).to.have.lengthOf(2);
    expect(invalid.status).to.equal(400);
  });

  it('exporta un PDF válido', async () => {
    const delivery = await createDelivery();
    await advanceDelivery(delivery._id);

    const response = await asAdmin().get('/api/reports/export.pdf').buffer(true).parse(binary);

    expect(response.status).to.equal(200);
    expect(response.headers['content-type']).to.equal('application/pdf');
    expect(response.body.subarray(0, 5).toString()).to.equal('%PDF-');
  });

  describe('utilidades', () => {
    it('toCsv escapa comillas y separadores, y neutraliza fórmulas', () => {
      const csv = toCsv([['Nombre', 'name'], ['Total', 'total']], [{ name: '=CMD("x")', total: 5 }, { name: 'Ana; "la" Gómez', total: -3 }]);

      expect(csv.startsWith('\uFEFFNombre;Total')).to.equal(true);
      expect(csv).to.include(`"'=CMD(""x"")"`);
      expect(csv).to.include('"Ana; ""la"" Gómez";-3');
    });

    it('isDayKey rechaza fechas que no existen', () => {
      expect(isDayKey('2026-11-17')).to.equal(true);
      expect(isDayKey('2026-02-30')).to.equal(false);
      expect(isDayKey('17/11/2026')).to.equal(false);
    });
  });
});