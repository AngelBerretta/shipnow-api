import { randomBytes } from 'node:crypto';
import orderRepository from '../repositories/order.repository.js';
import userRepository from '../repositories/user.repository.js';
import orderService from './order.service.js';
import userService from './user.service.js';
import { parseOrThrow } from '../validators/auth.validator.js';
import { inboundOrderSchema } from '../validators/inbound.validator.js';
import { mapWooCommerceOrder } from '../utils/woocommerce.js';
import { ROLES } from '../constants/index.js';
import { ValidationError } from '../errors/index.js';

class InboundService {
  /** Crea un pedido desde un sistema externo. Idempotente por `externalId`: reenviarlo no duplica. */
  async createOrder(integration, body) {
    const data = parseOrThrow(inboundOrderSchema, body);

    const existing = await orderRepository.findBySource(integration._id, data.externalId);
    if (existing) return { order: existing, created: false };

    const customer = await this.#findOrCreateCustomer(data.customer);
    try {
      const { order } = await orderService.createOrder(
        { customer: customer._id, store: integration.store, items: data.items, deliveryAddress: data.deliveryAddress, priority: data.priority },
        undefined, // llamada interna: sin actor, la autorización ya la resolvió la API key
        { source: { integration: integration._id, externalId: data.externalId } }
      );
      return { order, created: true };
    } catch (error) {
      // Dos requests simultáneas con el mismo externalId: gana una, la otra devuelve el pedido existente.
      if (error.code === 11000 && error.keyPattern?.['source.externalId']) {
        return { order: await orderRepository.findBySource(integration._id, data.externalId), created: false };
      }
      throw error;
    }
  }

  /** WooCommerce: se crea cuando el pedido pasa a "processing" (pagado); el resto se ignora. */
  async createFromWooCommerce(integration, body) {
    if (!body?.id || body.status !== 'processing') return { ignored: true };
    return this.createOrder(integration, mapWooCommerceOrder(body));
  }

  async #findOrCreateCustomer({ firstName, lastName, email }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      if (existing.role !== ROLES.CUSTOMER) {
        throw new ValidationError('El email del cliente pertenece a una cuenta que no es de cliente');
      }
      return existing;
    }
    // Contraseña aleatoria: el cliente externo no inicia sesión; recibe avisos por email y el enlace de seguimiento.
    return userService.createUser({ firstName, lastName, email, password: randomBytes(24).toString('base64url'), role: ROLES.CUSTOMER });
  }
}

export default new InboundService();