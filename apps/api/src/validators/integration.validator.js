import { z } from 'zod';
import { WEBHOOK_EVENTS } from '../constants/index.js';
import { isSafeWebhookUrl } from '../utils/webhookUrl.js';

const webhookUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((value) => isSafeWebhookUrl(value), 'La URL debe ser https y pública (no se admiten direcciones locales o privadas)');
const events = z.array(z.enum([...WEBHOOK_EVENTS]));

export const createIntegrationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  store: z.string().regex(/^[0-9a-f]{24}$/i, 'id de tienda inválido'),
  webhookUrl: webhookUrl.nullable().optional(),
  events: events.optional(),
});

export const updateIntegrationSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  webhookUrl: webhookUrl.nullable().optional(),
  events: events.optional(),
  isActive: z.boolean().optional(),
});