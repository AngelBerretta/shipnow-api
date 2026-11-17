/**
 * tracking.docs.js — Documentación OpenAPI del seguimiento público (/api/public/tracking).
 * Solo comentarios @openapi: no contiene lógica de rutas.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     PublicTracking:
 *       type: object
 *       description: >
 *         Vista pública de un pedido. A propósito no incluye ids internos, datos del
 *         cliente (nombre, email), ítems ni montos.
 *       properties:
 *         trackingCode: { type: string, example: RV-7K2M9QX4TB }
 *         status: { $ref: '#/components/schemas/OrderStatus' }
 *         createdAt: { type: string, format: date-time }
 *         address:
 *           type: string
 *           description: Dirección sin el número de calle (solo calle y localidad).
 *           example: Av. Rivadavia, Chivilcoy
 *         driver:
 *           type: object
 *           nullable: true
 *           description: Nombre de pila e inicial del apellido. `null` si todavía no hay repartidor.
 *           properties:
 *             firstName: { type: string, example: Juan }
 *             lastInitial: { type: string, example: P }
 *         events:
 *           type: array
 *           description: Cambios de estado en orden cronológico.
 *           items:
 *             type: object
 *             properties:
 *               status: { $ref: '#/components/schemas/OrderStatus' }
 *               occurredAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /api/public/tracking/{code}:
 *   get:
 *     tags: [Tracking]
 *     summary: Seguimiento público de un pedido
 *     description: >
 *       No requiere token. Un código con formato inválido y uno inexistente devuelven
 *       la misma respuesta 404. Además del límite general por IP, las consultas que
 *       no encuentran pedido tienen un límite propio más bajo (anti-barrido de códigos).
 *     security: []
 *     parameters:
 *       - name: code
 *         in: path
 *         required: true
 *         description: Código de seguimiento (no distingue mayúsculas).
 *         schema: { type: string }
 *         example: RV-7K2M9QX4TB
 *     responses:
 *       200:
 *         description: Estado público del pedido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicTracking'
 *       404:
 *         description: No existe un pedido con ese código (o el código no tiene formato válido).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: ORDER_NOT_FOUND, message: Pedido no encontrado }
 *       429:
 *         description: Demasiadas consultas desde la misma IP.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */