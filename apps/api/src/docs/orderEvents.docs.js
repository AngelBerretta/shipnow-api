/**
 * orderEvents.docs.js — Documentación OpenAPI del historial de pedidos
 * (/api/orders/{oid}/events) y de la máquina de estados.
 * Solo comentarios @openapi: no contiene lógica de rutas ni es
 * importado por src/routes/orders.routes.js.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     OrderEventType:
 *       type: string
 *       description: >
 *         Qué provocó el evento. Todo evento con `toStatus` es un cambio de
 *         estado del pedido.
 *       enum: [order_created, status_changed, delivery_assigned, delivery_status_changed, delivery_removed]
 *       example: status_changed
 *
 *     OrderEvent:
 *       type: object
 *       description: Un hecho del historial de un pedido (la colección es de solo agregado).
 *       properties:
 *         _id:
 *           type: string
 *           example: 66f1a2b3c4d5e6f7a8b9c0e1
 *         order:
 *           type: string
 *           example: 66f1a2b3c4d5e6f7a8b9c0d2
 *         type:
 *           $ref: '#/components/schemas/OrderEventType'
 *         fromStatus:
 *           nullable: true
 *           description: Estado del pedido antes del cambio (`null` si no hubo cambio de estado o es el alta).
 *           $ref: '#/components/schemas/OrderStatus'
 *         toStatus:
 *           nullable: true
 *           description: Estado del pedido después del cambio (`null` si el evento no cambió el estado).
 *           $ref: '#/components/schemas/OrderStatus'
 *         delivery:
 *           type: string
 *           nullable: true
 *           description: '`_id` de la entrega que originó el evento, si la hubo.'
 *         actor:
 *           type: string
 *           nullable: true
 *           description: Usuario que hizo el cambio. Siempre `null` hasta que exista autenticación.
 *         occurredAt:
 *           type: string
 *           format: date-time
 *
 *     OrderTimeline:
 *       type: object
 *       properties:
 *         order:
 *           type: string
 *           example: 66f1a2b3c4d5e6f7a8b9c0d2
 *         trackingCode:
 *           type: string
 *           nullable: true
 *           description: Código público de seguimiento del pedido.
 *           example: RV-7K2M9QX4TB
 *         events:
 *           type: array
 *           description: Eventos en orden cronológico.
 *           items:
 *             $ref: '#/components/schemas/OrderEvent'
 */

/**
 * @openapi
 * /api/orders/{oid}/events:
 *   get:
 *     tags: [Orders]
 *     summary: Historial (línea de tiempo) del pedido
 *     description: >
 *       Devuelve, en orden cronológico, todo lo que le pasó al pedido:
 *       creación, cambios de estado, entrega asignada, avances del
 *       repartidor y entrega eliminada. Se elimina junto con el pedido.
 *     parameters:
 *       - $ref: '#/components/parameters/OrderId'
 *     responses:
 *       200:
 *         description: Línea de tiempo del pedido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderTimeline'
 *       400:
 *         description: El `oid` no tiene formato de ObjectId válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: No existe un pedido con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: ORDER_NOT_FOUND, message: Pedido no encontrado }
 */
