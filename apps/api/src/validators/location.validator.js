import { z } from 'zod';

export const positionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).max(200).optional(), // m/s
});