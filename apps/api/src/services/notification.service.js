import notificationRepository from '../repositories/notification.repository.js';
import pushSubscriptionRepository from '../repositories/pushSubscription.repository.js';
import orderRepository from '../repositories/order.repository.js';
import userRepository from '../repositories/user.repository.js';
import { channels } from '../notifications/index.js';
import { customerMessage, adminMessage, driverMessage } from '../notifications/templates.js';
import { EMAIL_DOMAINS as MOCK_EMAIL_DOMAINS } from '../utils/mock.generator.js';
import { onDomainEvent, DOMAIN_EVENTS } from '../utils/domainEvents.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { parseOrThrow } from '../validators/auth.validator.js';
import { markReadSchema, pushSubscriptionSchema, pushUnsubscribeSchema } from '../validators/notification.validator.js';
import {
  ROLES,
  ORDER_STATUS,
  ORDER_EVENT_TYPES,
  NOTIFICATION_CHANNELS as CH,
  NOTIFICATION_STATUS as STATUS,
} from '../constants/index.js';
import { ApiError, ERROR_CODES } from '../errors/index.js';
import config from '../config/env.config.js';
import logger from '../config/logger.config.js';

/** Qué avisa cada estado del pedido, a quién y por qué canal. */
const RULES = {
  [ORDER_STATUS.CREATED]: { customer: [CH.EMAIL], admins: [CH.IN_APP, CH.TELEGRAM] },
  [ORDER_STATUS.ASSIGNED]: { driver: [CH.PUSH, CH.IN_APP] },
  [ORDER_STATUS.IN_TRANSIT]: { customer: [CH.EMAIL], admins: [CH.IN_APP] },
  [ORDER_STATUS.DELIVERED]: { customer: [CH.EMAIL], admins: [CH.IN_APP, CH.TELEGRAM] },
  [ORDER_STATUS.CANCELLED]: { customer: [CH.EMAIL], admins: [CH.IN_APP, CH.TELEGRAM] },
};

// Quitar una entrega devuelve el pedido a `created`, pero eso no es un pedido nuevo: no se avisa.
const keyOf = (event) => (event.type === ORDER_EVENT_TYPES.DELIVERY_REMOVED ? null : event.toStatus);

// Los datos de demostración (/api/mocks) usan estos dominios: nunca se les manda email real.
const isMockEmail = (email) => MOCK_EMAIL_DOMAINS.includes(String(email).split('@').pop().toLowerCase());

const LEASE_MS = 5 * 60 * 1000;
const BACKOFF_MINUTES = [1, 5, 15, 60, 180];

class NotificationService {
  // -------------------------------------------------------------------
  // Eventos -> avisos
  // -------------------------------------------------------------------

  /** Suscriptor del evento `order.event`: decide a quién avisar y deja los avisos en la bandeja. */
  async handleOrderEvent(event) {
    const key = keyOf(event);
    const rule = key && RULES[key];
    if (!rule) return [];

    const order = await orderRepository.findById(event.order);
    if (!order) return [];

    const eventId = String(event._id);
    const base = { order: order._id, type: `order_${key}` };
    const jobs = [];

    if (rule.customer && order.customer?.email && !isMockEmail(order.customer.email)) {
      const message = customerMessage(key, order);
      for (const channel of rule.customer) {
        jobs.push({
          ...base,
          user: order.customer._id,
          channel,
          title: message.title,
          body: message.body,
          data: { ...message.data, to: order.customer.email },
          dedupeKey: `${eventId}:${order.customer._id}:${channel}`,
        });
      }
    }

    if (rule.admins) {
      const message = adminMessage(key, order);
      const admins = await userRepository.findAll({ role: ROLES.ADMIN, isActive: true });
      for (const channel of rule.admins) {
        const common = { ...base, channel, title: message.title, body: message.body, data: message.data };
        if (channel === CH.TELEGRAM) {
          jobs.push({ ...common, user: null, dedupeKey: `${eventId}:telegram` });
        } else {
          admins.forEach((admin) => jobs.push({ ...common, user: admin._id, dedupeKey: `${eventId}:${admin._id}:${channel}` }));
        }
      }
    }

    const driverId = order.delivery?.driver;
    if (rule.driver && driverId) {
      const message = driverMessage(order, event.delivery ?? order.delivery._id);
      for (const channel of rule.driver) {
        jobs.push({
          ...base,
          user: driverId,
          channel,
          title: message.title,
          body: message.body,
          data: message.data,
          dedupeKey: `${eventId}:${driverId}:${channel}`,
        });
      }
    }

    return this.enqueue(jobs);
  }

  /**
   * Guarda los avisos en la bandeja (se saltea los canales sin configurar) y dispara el
   * envío en segundo plano. Devuelve las filas creadas.
   */
  async enqueue(jobs) {
    const created = [];
    for (const job of jobs) {
      if (!channels[job.channel]?.isEnabled()) {
        logger.debug(`Canal "${job.channel}" sin configurar: aviso "${job.type}" omitido`);
        continue;
      }
      const inApp = job.channel === CH.IN_APP;
      const row = await notificationRepository.create({
        ...job,
        status: inApp ? STATUS.SENT : STATUS.PENDING,
        sentAt: inApp ? new Date() : null,
      });
      if (row) created.push(row);
    }
    this.#dispatchSoon(created.filter((row) => row.channel !== CH.IN_APP).map((row) => row._id));
    return created;
  }

  // -------------------------------------------------------------------
  // Envío con reintentos
  // -------------------------------------------------------------------

  /** Procesa los avisos pendientes y vencidos. Lo llama /api/internal/notifications/process. */
  async processDue({ limit = 25 } = {}) {
    const summary = { processed: 0, sent: 0, skipped: 0, retried: 0, failed: 0 };
    for (let i = 0; i < limit; i += 1) {
      const notification = await notificationRepository.claim({}, LEASE_MS);
      if (!notification) break;
      const outcome = await this.#deliver(notification);
      summary.processed += 1;
      summary[outcome] += 1;
    }
    return summary;
  }

  #dispatchSoon(ids) {
    if (ids.length === 0 || config.isTest) return;
    setImmediate(() => {
      this.#processIds(ids).catch((error) => logger.error(`Fallo el envío de avisos: ${error.message}`, { stack: error.stack }));
    });
  }

  async #processIds(ids) {
    for (const id of ids) {
      const notification = await notificationRepository.claim({ _id: id }, LEASE_MS);
      if (notification) await this.#deliver(notification);
    }
  }

  /** Devuelve 'sent' | 'skipped' | 'retried' | 'failed'. */
  async #deliver(notification) {
    const channel = channels[notification.channel];
    try {
      if (!channel?.isEnabled()) {
        await notificationRepository.update(notification._id, { status: STATUS.SKIPPED, lastError: 'canal deshabilitado' });
        return 'skipped';
      }
      const result = await channel.send(notification);
      if (result.status === STATUS.SKIPPED) {
        await notificationRepository.update(notification._id, { status: STATUS.SKIPPED, lastError: result.reason ?? null });
        return 'skipped';
      }
      await notificationRepository.update(notification._id, { status: STATUS.SENT, sentAt: new Date(), lastError: null });
      return 'sent';
    } catch (error) {
      const message = String(error.message).slice(0, 300);
      if (error.retryable === false || notification.attempts >= config.notifications.maxAttempts) {
        await notificationRepository.update(notification._id, { status: STATUS.FAILED, lastError: message });
        logger.error(`Aviso ${notification._id} (${notification.channel}/${notification.type}) falló: ${message}`);
        return 'failed';
      }
      const delayMinutes = BACKOFF_MINUTES[Math.min(notification.attempts - 1, BACKOFF_MINUTES.length - 1)];
      await notificationRepository.update(notification._id, {
        nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
        lastError: message,
      });
      logger.warning(`Aviso ${notification._id} (${notification.channel}) falló, se reintenta en ${delayMinutes} min: ${message}`);
      return 'retried';
    }
  }

  // -------------------------------------------------------------------
  // Campana (in_app) del usuario autenticado
  // -------------------------------------------------------------------

  async listMine(query = {}, actor) {
    const pagination = parsePagination(query);
    const unreadOnly = query.unread === 'true';
    const [rows, total, unreadCount] = await Promise.all([
      notificationRepository.findInApp(actor._id, { unreadOnly, skip: pagination.skip, limit: pagination.limit }),
      notificationRepository.countInApp(actor._id, { unreadOnly }),
      notificationRepository.countInApp(actor._id, { unreadOnly: true }),
    ]);
    return { data: rows, pagination: buildPaginationMeta(pagination, total), unreadCount };
  }

  async unreadCount(actor) {
    return { unreadCount: await notificationRepository.countInApp(actor._id, { unreadOnly: true }) };
  }

  async markRead(body, actor) {
    const { ids, all } = parseOrThrow(markReadSchema, body);
    const updated = await notificationRepository.markRead(actor._id, all ? undefined : ids);
    return { updated, ...(await this.unreadCount(actor)) };
  }

  // -------------------------------------------------------------------
  // Web Push (suscripciones de la PWA)
  // -------------------------------------------------------------------

  pushPublicKey() {
    const { publicKey } = config.notifications.push;
    if (!publicKey) {
      throw new ApiError(ERROR_CODES.ROUTE_NOT_FOUND, 'Las notificaciones push no están configuradas en el servidor');
    }
    return { publicKey };
  }

  async subscribePush(body, actor, userAgent) {
    const subscription = parseOrThrow(pushSubscriptionSchema, body);
    await pushSubscriptionRepository.upsert(actor._id, { ...subscription, userAgent: String(userAgent ?? '').slice(0, 300) });
  }

  async unsubscribePush(body, actor) {
    const { endpoint } = parseOrThrow(pushUnsubscribeSchema, body);
    await pushSubscriptionRepository.deleteByEndpoint(endpoint, actor._id);
  }
}

const notificationService = new NotificationService();

let registered = false;
/** Conecta el servicio con los eventos de dominio. Se llama una vez desde app.js. */
export function registerNotificationSubscribers() {
  if (registered) return;
  registered = true;
  onDomainEvent(DOMAIN_EVENTS.ORDER_EVENT, (event) => notificationService.handleOrderEvent(event));
}

export default notificationService;