import { createHmac, timingSafeEqual } from 'node:crypto';
import integrationRepository from '../repositories/integration.repository.js';
import userRepository from '../repositories/user.repository.js';
import { parseOrThrow } from '../validators/auth.validator.js';
import { createIntegrationSchema, updateIntegrationSchema } from '../validators/integration.validator.js';
import { generateApiKey, generateWebhookSecret, hashApiKey, parseApiKey, safeEqualHex } from '../utils/apiKey.js';
import { ROLES } from '../constants/index.js';
import { IntegrationNotFoundError, UnauthorizedError, UserNotFoundError, ValidationError } from '../errors/index.js';

/** Nunca incluye keyHash ni webhookSecret. */
const toPublic = (doc) => ({
  _id: doc._id,
  name: doc.name,
  store: doc.store,
  keyPrefix: doc.keyPrefix,
  webhookUrl: doc.webhookUrl,
  events: doc.events,
  isActive: doc.isActive,
  lastUsedAt: doc.lastUsedAt,
  createdAt: doc.createdAt,
});

class IntegrationService {
  async list() {
    return { data: (await integrationRepository.findAll()).map(toPublic) };
  }

  /** La API key y el secreto del webhook se devuelven UNA sola vez, al crear o rotar. */
  async create(body) {
    const data = parseOrThrow(createIntegrationSchema, body);
    const store = await userRepository.findById(data.store);
    if (!store) throw new UserNotFoundError('La tienda no existe');
    if (store.role !== ROLES.STORE) {
      throw new ValidationError(`El usuario indicado no tiene rol de tienda (rol actual: ${store.role})`);
    }

    const apiKey = generateApiKey();
    const webhookSecret = generateWebhookSecret();
    const created = await integrationRepository.create({
      name: data.name,
      store: data.store,
      keyPrefix: apiKey.prefix,
      keyHash: apiKey.hash,
      webhookUrl: data.webhookUrl ?? null,
      webhookSecret,
      ...(data.events ? { events: data.events } : {}),
    });
    return { integration: toPublic(await integrationRepository.findById(created._id)), apiKey: apiKey.key, webhookSecret };
  }

  async update(id, body) {
    const data = parseOrThrow(updateIntegrationSchema, body);
    await this.#get(id);
    const updated = Object.keys(data).length ? await integrationRepository.updateById(id, data) : await this.#get(id);
    return toPublic(updated);
  }

  async rotateKey(id) {
    await this.#get(id);
    const apiKey = generateApiKey();
    const updated = await integrationRepository.updateById(id, { keyPrefix: apiKey.prefix, keyHash: apiKey.hash });
    return { integration: toPublic(updated), apiKey: apiKey.key };
  }

  async rotateSecret(id) {
    await this.#get(id);
    const webhookSecret = generateWebhookSecret();
    const updated = await integrationRepository.updateById(id, { webhookSecret });
    return { integration: toPublic(updated), webhookSecret };
  }

  async remove(id) {
    if (!(await integrationRepository.deleteById(id))) throw new IntegrationNotFoundError();
    return { message: 'Integración eliminada' };
  }

  /** Autentica una request entrante por API key. */
  async authenticate(rawKey) {
    const prefix = parseApiKey(rawKey);
    const integration = prefix && (await integrationRepository.findByPrefix(prefix));
    if (!integration || !safeEqualHex(integration.keyHash, hashApiKey(rawKey))) {
      throw new UnauthorizedError('API key inválida');
    }
    if (!integration.isActive) throw new UnauthorizedError('La integración está desactivada');
    integrationRepository.touch(integration._id).catch(() => {});
    return integration;
  }

  /** WooCommerce firma el cuerpo con HMAC-SHA256 en base64 (header X-WC-Webhook-Signature). */
  async authenticateWooCommerce(id, rawBody, signature) {
    const integration = /^[0-9a-f]{24}$/i.test(String(id)) ? await integrationRepository.findByIdWithSecret(id) : null;
    if (!integration || !integration.isActive || !rawBody || !signature) throw new UnauthorizedError('Firma inválida');

    const expected = Buffer.from(createHmac('sha256', integration.webhookSecret).update(rawBody).digest('base64'));
    const received = Buffer.from(String(signature));
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw new UnauthorizedError('Firma inválida');
    }
    return integration;
  }

  async #get(id) {
    const integration = await integrationRepository.findById(id);
    if (!integration) throw new IntegrationNotFoundError();
    return integration;
  }
}

export default new IntegrationService();