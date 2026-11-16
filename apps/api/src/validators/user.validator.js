import { z } from 'zod';

/**
 * Cuerpo de PATCH /api/users/:uid. Todos los campos son opcionales (cambio
 * parcial). El email no se puede cambiar (es la identidad de login). El
 * `role` se valida contra ROLES en el Service, para responder INVALID_ROLE
 * igual que el alta de usuarios.
 */
export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1, 'El nombre no puede estar vacio').optional(),
  lastName: z.string().trim().min(1, 'El apellido no puede estar vacio').optional(),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres').max(200).optional(),
  isActive: z.boolean({ error: 'isActive debe ser true o false' }).optional(),
  role: z.string().optional(),
});

/** Cuerpo de PATCH /api/users/me/availability (interruptor del repartidor). */
export const availabilitySchema = z.object({
  isAvailable: z.boolean({ error: 'isAvailable debe ser true o false' }),
});