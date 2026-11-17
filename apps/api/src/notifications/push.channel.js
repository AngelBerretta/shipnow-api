import config from '../config/env.config.js';
import { NOTIFICATION_STATUS } from '../constants/index.js';
import pushSubscriptionRepository from '../repositories/pushSubscription.repository.js';
import { ChannelError, retryableStatus } from './ChannelError.js';

let webPushPromise = null;

/** web-push se carga recién al primer uso (igual que el SDK de R2). */
function getWebPush() {
  webPushPromise ??= import('web-push').then(({ default: webpush }) => {
    const { subject, publicKey, privateKey } = config.notifications.push;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return webpush;
  });
  return webPushPromise;
}

/** Web Push (VAPID) a todos los dispositivos suscriptos del usuario. */
export default {
  isEnabled: () => config.notifications.push.enabled,

  async send(notification) {
    const subscriptions = await pushSubscriptionRepository.findByUser(notification.user);
    if (subscriptions.length === 0) return { status: NOTIFICATION_STATUS.SKIPPED, reason: 'sin dispositivos suscriptos' };

    const webpush = await getWebPush();
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.data?.url ?? '/',
      tag: notification.type,
    });

    let delivered = 0;
    let transientError = null;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } },
          payload,
          { TTL: 60 * 60 }
        );
        delivered += 1;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await pushSubscriptionRepository.deleteByEndpoint(subscription.endpoint); // suscripción vencida
        } else {
          transientError = error;
        }
      }
    }

    if (delivered > 0) return { status: NOTIFICATION_STATUS.SENT };
    if (transientError) {
      throw new ChannelError(`Push: ${transientError.statusCode ?? ''} ${transientError.message}`.trim(), {
        retryable: retryableStatus(transientError.statusCode ?? 500),
      });
    }
    return { status: NOTIFICATION_STATUS.SKIPPED, reason: 'todas las suscripciones habían vencido' };
  },
};