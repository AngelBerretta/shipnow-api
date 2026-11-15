import { z } from 'zod';
import { ValidationError } from '../errors/index.js';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/** Valida con Zod y traduce el fallo al ValidationError (400) de la API. */
export function parseOrThrow(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw new ValidationError('Los datos enviados no son validos', details);
  }
  return result.data;
}