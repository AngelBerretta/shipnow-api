import { z } from 'zod';

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** POST /api/notifications/read: `{ ids: [...] }` o `{ all: true }`. */
export const markReadSchema = z
  .object({
    ids: z.array(z.string().regex(OBJECT_ID, 'id inválido')).max(100).optional(),
    all: z.boolean().optional(),
  })
  .refine((value) => value.all === true || (value.ids?.length ?? 0) > 0, 'Enviá "ids" o "all": true');

/** PushSubscription.toJSON() del navegador (los campos extra, como expirationTime, se descartan). */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export const pushUnsubscribeSchema = z.object({ endpoint: z.string().min(1).max(1000) });