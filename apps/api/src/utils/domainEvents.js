import logger from '../config/logger.config.js';

export const DOMAIN_EVENTS = Object.freeze({ ORDER_EVENT: 'order.event' });

const handlers = new Map();

export function onDomainEvent(name, handler) {
  handlers.set(name, [...(handlers.get(name) ?? []), handler]);
}

/**
 * Espera a los suscriptores (así el encolado de avisos es parte del request y los
 * tests son deterministas), pero un suscriptor que falla nunca rompe a quien emite.
 */
export async function emitDomainEvent(name, payload) {
  for (const handler of handlers.get(name) ?? []) {
    try {
      await handler(payload);
    } catch (error) {
      logger.error(`Fallo un suscriptor del evento "${name}": ${error.message}`, { stack: error.stack });
    }
  }
}