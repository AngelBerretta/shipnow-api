import { expect } from 'chai';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import app from '../src/app.js';
import Integration from '../src/models/integration.model.js';
import Order from '../src/models/order.model.js';
import notificationService from '../src/services/notification.service.js';
import { channels } from '../src/notifications/index.js';
import { isSafeWebhookUrl } from '../src/utils/webhookUrl.js';
import { asAdmin, loginAsUser } from './helpers/auth.js';
import { createCustomer, createStore } from './helpers/fixtures.js';

const inbound = (key) => request(app).post('/api/inbound/orders').set('X-API-Key', key);
const payload = (overrides = {}) => ({
  externalId: 'EXT-1',
  customer: { firstName: 'Ana', lastName: 'Gómez', email: 'ana@tienda-test.com' },
  items: [{ name: 'Remera', quantity: 2, price: 5000 }],
  deliveryAddress: 'Mitre 55, Chivilcoy',
  ...overrides,
});

async function createIntegration(overrides = {}) {
  const store = await createStore();
  const response = await asAdmin()
    .post('/api/integrations')
    .send({ name: 'Tienda Demo', store: store._id, webhookUrl: 'https://hooks.example.com/ruvika', ...overrides });
  return { store, ...response.body, httpStatus: response.status };
}

describe('Integraciones (Etapa 6)', () => {
  describe('/api/integrations', () => {
    it('crea la integración, devuelve las credenciales una vez y nunca las lista', async () => {
      const created = await createIntegration();

      expect(created.httpStatus).to.equal(201);
      expect(created.apiKey).to.match(/^rvk_[a-f0-9]{8}_/);
      expect(created.webhookSecret).to.match(/^whsec_/);

      const list = await asAdmin().get('/api/integrations');
      const raw = JSON.stringify(list.body);
      expect(list.body.data).to.have.lengthOf(1);
      expect(raw).to.not.include(created.apiKey);
      expect(raw).to.not.include(created.webhookSecret);
      expect(raw).to.not.include('keyHash');
    });

    it('solo admin; la tienda debe tener rol store', async () => {
      const api = await loginAsUser(await createCustomer());
      const customer = await createCustomer();

      expect((await api.get('/api/integrations')).status).to.equal(403);
      const wrongRole = await asAdmin().post('/api/integrations').send({ name: 'X', store: customer._id });
      expect(wrongRole.status).to.equal(400);
    });

    it('rotar la clave invalida la anterior', async () => {
      const { integration, apiKey } = await createIntegration();

      const rotated = await asAdmin().post(`/api/integrations/${integration._id}/rotate-key`);

      expect((await inbound(apiKey).send(payload())).status).to.equal(401);
      expect((await inbound(rotated.body.apiKey).send(payload())).status).to.equal(201);
    });

    it('isSafeWebhookUrl bloquea redes internas en producción', () => {
      expect(isSafeWebhookUrl('https://hooks.example.com/h', true)).to.equal(true);
      expect(isSafeWebhookUrl('https://fcbarcelona.com/h', true)).to.equal(true);
      expect(isSafeWebhookUrl('http://hooks.example.com/h', true)).to.equal(false);
      expect(isSafeWebhookUrl('https://localhost/h', true)).to.equal(false);
      expect(isSafeWebhookUrl('https://192.168.1.10/h', true)).to.equal(false);
      expect(isSafeWebhookUrl('https://[::1]/h', true)).to.equal(false);
    });
  });

  describe('POST /api/inbound/orders', () => {
    it('crea el pedido a nombre de la tienda y es idempotente por externalId', async () => {
      const { store, apiKey } = await createIntegration();

      const first = await inbound(apiKey).send(payload());
      const again = await inbound(apiKey).send(payload());

      expect(first.status).to.equal(201);
      expect(first.body.order).to.include({ status: 'created', externalId: 'EXT-1' });
      expect(first.body.order.trackingCode).to.match(/^RV-/);
      expect(again.status).to.equal(200);
      expect(again.body).to.deep.include({ created: false });
      expect(again.body.order.trackingCode).to.equal(first.body.order.trackingCode);
      expect(await Order.countDocuments()).to.equal(1);
      expect(String((await Order.findOne()).store)).to.equal(store._id);
    });

    it('rechaza sin key, con key inventada o con la integración desactivada', async () => {
      const { integration, apiKey } = await createIntegration();

      expect((await request(app).post('/api/inbound/orders').send(payload())).status).to.equal(401);
      expect((await inbound('rvk_00000000_' + 'a'.repeat(32)).send(payload())).status).to.equal(401);
      await Integration.updateOne({ _id: integration._id }, { isActive: false });
      expect((await inbound(apiKey).send(payload())).status).to.equal(401);
    });

    it('devuelve 400 con un cuerpo inválido', async () => {
      const { apiKey } = await createIntegration();

      const response = await inbound(apiKey).send(payload({ items: [] }));

      expect(response.status).to.equal(400);
      expect(response.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('WooCommerce: valida la firma y solo crea pedidos en processing', async () => {
      const { integration, webhookSecret } = await createIntegration();
      const wc = {
        id: 77,
        status: 'processing',
        billing: { first_name: 'Lu', last_name: 'Paz', email: 'lu@tienda-test.com' },
        shipping: { address_1: 'Belgrano 120', city: 'Chivilcoy' },
        line_items: [{ name: 'Taza', quantity: 1, price: '3500' }],
      };
      const send = (body, secret = webhookSecret) => {
        const raw = JSON.stringify(body);
        return request(app)
          .post(`/api/inbound/woocommerce/${integration._id}`)
          .set('Content-Type', 'application/json')
          .set('X-WC-Webhook-Signature', createHmac('sha256', secret).update(raw).digest('base64'))
          .send(raw);
      };

      expect((await send(wc, 'otro-secreto')).status).to.equal(401);
      expect((await send({ ...wc, status: 'pending' })).body).to.deep.equal({ ignored: true });
      const ok = await send(wc);
      expect(ok.status).to.equal(201);
      expect(ok.body.order.externalId).to.equal('wc-77');
    });
  });

  describe('webhooks salientes', () => {
    it('firma con HMAC y envía order.created a la URL de la integración', async () => {
      const { apiKey, webhookSecret } = await createIntegration();
      const original = channels.webhook.isEnabled;
      const realFetch = globalThis.fetch;
      const calls = [];
      channels.webhook.isEnabled = () => true;
      globalThis.fetch = async (url, options) => {
        calls.push({ url, options });
        return { ok: true, status: 200 };
      };

      try {
        await inbound(apiKey).send(payload());
        const summary = await notificationService.processDue();

        expect(summary.sent).to.equal(1);
        const [{ url, options }] = calls;
        expect(url).to.equal('https://hooks.example.com/ruvika');
        expect(options.headers['X-Ruvika-Event']).to.equal('order.created');
        const [, t, v1] = options.headers['X-Ruvika-Signature'].match(/^t=(\d+),v1=([a-f0-9]{64})$/);
        expect(v1).to.equal(createHmac('sha256', webhookSecret).update(`${t}.${options.body}`).digest('hex'));
        const body = JSON.parse(options.body);
        expect(body.type).to.equal('order.created');
        expect(body.data.order.externalId).to.equal('EXT-1');
        expect(JSON.stringify(body)).to.not.include('ana@tienda-test.com'); // sin datos personales
      } finally {
        channels.webhook.isEnabled = original;
        globalThis.fetch = realFetch;
      }
    });
  });
});