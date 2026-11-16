/**
 * driverApp.docs.js — Documentación OpenAPI de los endpoints de la app del repartidor.
 * Solo comentarios @openapi: no contiene lógica de rutas.
 */

/**
 * @openapi
 * /api/deliveries/me:
 *   get:
 *     tags: [Deliveries]
 *     summary: Mis entregas (repartidor)
 *     description: >
 *       Solo `driver`. Devuelve las entregas asignadas al repartidor del token, con el
 *       pedido populado y el nombre (sin email) del cliente. Es el endpoint que usa la PWA.
 *     parameters:
 *       - name: active
 *         in: query
 *         required: false
 *         description: '`true` = solo las que siguen en curso; `false` = solo las entregadas.'
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - name: status
 *         in: query
 *         required: false
 *         description: Estado exacto. Tiene prioridad sobre `active`.
 *         schema:
 *           $ref: '#/components/schemas/DeliveryStatus'
 *       - name: page
 *         in: query
 *         required: false
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - name: limit
 *         in: query
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Listado paginado de entregas del repartidor.
 *       400:
 *         description: '`status` fuera del enum (`INVALID_STATUS`).'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: El usuario no es repartidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/users/me/availability:
 *   patch:
 *     tags: [Users]
 *     summary: Marcar disponible / no disponible (repartidor)
 *     description: >
 *       Solo `driver`. Cambia el campo `isAvailable` del usuario autenticado. Es informativo:
 *       los administradores lo ven al asignar entregas, pero la API no bloquea la asignación.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isAvailable]
 *             properties:
 *               isAvailable: { type: boolean }
 *     responses:
 *       200:
 *         description: Usuario actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: '`isAvailable` ausente o no booleano.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: El usuario no es repartidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */