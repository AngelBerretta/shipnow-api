import { z } from 'zod';

export const inboundOrderSchema = z.object({
  externalId: z.string().trim().min(1).max(100),
  customer: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().toLowerCase().email(),
  }),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(1000),
        price: z.number().min(0).max(100000000),
      })
    )
    .min(1)
    .max(100),
  deliveryAddress: z.string().trim().min(5).max(300),
  priority: z.enum(['low', 'normal', 'high']).optional(),
});