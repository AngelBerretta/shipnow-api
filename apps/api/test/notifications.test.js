import { expect } from 'chai';
import request from 'supertest';
import app from '../src/app.js';
import Notification from '../src/models/notification.model.js';
import OrderEvent from '../src/models/orderEvent.model.js';
import PushSubscription from '../src/models/pushSubscription.model.js';
import notificationService from '../src/services/notification.service.js';
import { channels } from '../src/notifications/index.js';
import { ChannelError } from '../src/notifications/ChannelError.js';
import { asAdmin, loginAsUser, session } from './helpers/auth.js';
import { createCustomer, createDriver, createOrder, createDelivery, advanceDelivery } from './helpers/fixtures.js';

const originals = {};

/** Habilita un canal (en tests están apagados) y opcionalmente reemplaza su envío. */
function enableChannel(name, send) {
  originals[name] ??= { isEnabled: channels[name].isEnabled, send: channels[name].send };
  channels[name].isEnabled = () => true;
  if (send) channels[name].send = send;
}

const secret = () => ({ 'x-internal-secret': process.env.INTERNAL_API_SECRET });

describe('Notificaciones (Etapa 5)', () => {
  afterEach(() => {
    for (const [name, original] of Object.entries(originals)) {
      Object.assign(channels[name], original);
      delete originals[name];
    }
  });

  describe('campana (in_app)', () => {
    it('crear un pedido deja un aviso para el admin, con el enlace al pedido', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);

      const response = await asAdmin().get('/api/notifications');

      expect(response.status).to.equal(200);
      expect(response.body.unreadCount).to.equal(1);
      expect(response.body.data).to.have.lengthOf(1);
      expect(response.body.data[0].type).to.equal('order_created');
      expect(response.body.data[0].title).to.include(order.trackingCode);
      expect(response.body.data[0].data.path).to.equal(`/orders/${order._id}`);
      expect(response.body.data[0]).to.not.have.property('dedupeKey');
    });

    it('marca avisos como leídos por id o todos, y rechaza un cuerpo vacío', async () => {
      const customer = await createCustomer();
      await createOrder(customer._id);
      await createOrder(customer._id);
      const [first] = (await asAdmin().get('/api/notifications')).body.data;

      const one = await asAdmin().post('/api/notifications/read').send({ ids: [first._id] });
      expect(one.body).to.deep.equal({ updated: 1, unreadCount: 1 });

      const all = await asAdmin().post('/api/notifications/read').send({ all: true });
      expect(all.body).to.deep.equal({ updated: 1, unreadCount: 0 });

      const empty = await asAdmin().post('/api/notifications/read').send({});
      expect(empty.status).to.equal(400);
      expect(empty.body.error.code).to.equal('VALIDATION_ERROR');
    });

    it('cada usuario ve solo lo suyo y no puede leer los avisos de otro', async () => {
      const customer = await createCustomer();
      await createOrder(customer._id);
      const adminNotification = (await asAdmin().get('/api/notifications')).body.data[0];
      const api = await loginAsUser(customer);

      expect((await api.get('/api/notifications')).body.data).to.deep.equal([]);
      const attempt = await api.post('/api/notifications/read').send({ ids: [adminNotification._id] });
      expect(attempt.body.updated).to.equal(0);
      expect((await asAdmin().get('/api/notifications/unread-count')).body.unreadCount).to.equal(1);
    });

    it('requiere token', async () => {
      expect((await request(app).get('/api/notifications')).status).to.equal(401);
    });
  });

  describe('envío con reintentos (outbox)', () => {
    it('encola el email de confirmación al crear el pedido y lo envía con processDue', async () => {
      const sent = [];
      enableChannel('email', async (notification) => {
        sent.push(notification);
        return { status: 'sent' };
      });
      const customer = await createCustomer();
      const order = await createOrder(customer._id);

      expect(await Notification.countDocuments({ channel: 'email', status: 'pending' })).to.equal(1);
      const summary = await notificationService.processDue();

      expect(summary).to.include({ processed: 1, sent: 1 });
      expect(sent[0].data.to).to.equal(customer.email);
      expect(sent[0].title).to.include(order.trackingCode);
      expect((await Notification.findOne({ channel: 'email' })).status).to.equal('sent');
    });

    it('si el canal falla reintenta con espera; al recuperarse se envía', async () => {
      enableChannel('email', async () => {
        throw new ChannelError('caído');
      });
      const customer = await createCustomer();
      await createOrder(customer._id);

      const first = await notificationService.processDue();
      const row = await Notification.findOne({ channel: 'email' });
      expect(first.retried).to.equal(1);
      expect(row.status).to.equal('pending');
      expect(row.attempts).to.equal(1);
      expect(row.lastError).to.equal('caído');
      expect(row.nextAttemptAt.getTime()).to.be.greaterThan(Date.now());

      // Todavía no venció la espera: no se vuelve a tomar.
      expect((await notificationService.processDue()).processed).to.equal(0);

      channels.email.send = async () => ({ status: 'sent' });
      await Notification.updateOne({ _id: row._id }, { nextAttemptAt: new Date(0) });
      const second = await notificationService.processDue();
      expect(second.sent).to.equal(1);
      expect((await Notification.findById(row._id)).attempts).to.equal(2);
    });

    it('un error no reintentable queda failed de inmediato', async () => {
      enableChannel('email', async () => {
        throw new ChannelError('dirección inválida', { retryable: false });
      });
      const customer = await createCustomer();
      await createOrder(customer._id);

      const summary = await notificationService.processDue();

      expect(summary.failed).to.equal(1);
      expect((await Notification.findOne({ channel: 'email' })).status).to.equal('failed');
    });

    it('procesar dos veces el mismo evento no duplica avisos', async () => {
      const customer = await createCustomer();
      const order = await createOrder(customer._id);
      const event = await OrderEvent.findOne({ order: order._id });

      await notificationService.handleOrderEvent(event);

      expect(await Notification.countDocuments({ channel: 'in_app' })).to.equal(1);
    });

    it('avisa en cada hito: confirmación, en camino y entregado al cliente; la asignación al repartidor', async () => {
      enableChannel('email', async () => ({ status: 'sent' }));
      enableChannel('push'); // sin suscripciones: el envío real queda "skipped"
      const delivery = await createDelivery();

      const assigned = await Notification.findOne({ user: delivery.driver, channel: 'in_app' });
      expect(assigned.type).to.equal('order_assigned');
      expect(assigned.data.url).to.equal(`/deliveries/${delivery._id}`);
      expect(await Notification.countDocuments({ user: delivery.driver, channel: 'push' })).to.equal(1);

      await advanceDelivery(delivery._id);
      const emails = await Notification.find({ channel: 'email' }).sort({ _id: 1 });
      expect(emails.map((row) => row.type)).to.deep.equal(['order_created', 'order_in_transit', 'order_delivered']);

      const summary = await notificationService.processDue();
      expect(summary).to.include({ sent: 3, skipped: 1 });
    });

    it('no manda emails a los datos de demostración', async () => {
      enableChannel('email', async () => ({ status: 'sent' }));
      const customer = await createCustomer({ email: 'sofia.gomez1234@mail.com' });

      await createOrder(customer._id);

      expect(await Notification.countDocuments({ channel: 'email' })).to.equal(0);
    });
  });

  describe('Web Push: suscripciones', () => {
    const subscription = (endpoint = 'https://push.example.com/abc') => ({
      endpoint,
      expirationTime: null,
      keys: { p256dh: 'clave-p256dh', auth: 'clave-auth' },
    });

    it('suscribe, reasigna el dispositivo al otro usuario y lo elimina', async () => {
      const first = await loginAsUser(await createDriver());
      const secondDriver = await createDriver();
      const second = await loginAsUser(secondDriver);

      expect((await first.post('/api/notifications/push/subscribe').send(subscription())).status).to.equal(201);
      expect((await second.post('/api/notifications/push/subscribe').send(subscription())).status).to.equal(201);
      const rows = await PushSubscription.find();
      expect(rows).to.have.lengthOf(1);
      expect(String(rows[0].user)).to.equal(secondDriver._id);

      // El primero ya no es dueño: no puede borrarla.
      await first.delete('/api/notifications/push/subscribe').send({ endpoint: subscription().endpoint });
      expect(await PushSubscription.countDocuments()).to.equal(1);
      await second.delete('/api/notifications/push/subscribe').send({ endpoint: subscription().endpoint });
      expect(await PushSubscription.countDocuments()).to.equal(0);
    });

    it('devuelve 400 si la suscripción es inválida', async () => {
      const api = await loginAsUser(await createDriver());

      const response = await api.post('/api/notifications/push/subscribe').send({ endpoint: 'no-es-una-url', keys: {} });

      expect(response.status).to.equal(400);
    });
  });

  describe('/api/internal', () => {
    it('rechaza sin secreto o con uno incorrecto', async () => {
      expect((await request(app).post('/api/internal/notifications/process')).status).to.equal(401);
      const wrong = await request(app).post('/api/internal/reports/weekly').set('x-internal-secret', 'incorrecto');
      expect(wrong.status).to.equal(401);
    });

    it('procesa la bandeja con el secreto correcto', async () => {
      const response = await request(app).post('/api/internal/notifications/process').set(secret());

      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal({ processed: 0, sent: 0, skipped: 0, retried: 0, failed: 0 });
    });

    it('el reporte semanal avisa al admin una sola vez por semana', async () => {
      const first = await request(app).post('/api/internal/reports/weekly').set(secret());
      const again = await request(app).post('/api/internal/reports/weekly').set(secret());

      expect(first.status).to.equal(200);
      expect(first.body.enqueued).to.equal(1); // solo la campana: los demás canales están apagados en tests
      expect(again.body.enqueued).to.equal(0);
      const notification = await Notification.findOne({ user: session.admin._id, type: 'weekly_report' });
      expect(notification.data.path).to.equal('/reports');
    });
  });
});