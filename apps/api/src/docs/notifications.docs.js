/**
 * notifications.docs.js — OpenAPI de /api/notifications, /api/reports e /api/internal.
 * Solo comentarios @openapi: no contiene lógica.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         type: { type: string, example: order_created }
 *         title: { type: string, example: Nuevo pedido RV-7K2M9QX4TB }
 *         body: { type: string }
 *         data:
 *           type: object
 *           properties:
 *             path: { type: string, nullable: true, description: Ruta dentro del panel., example: /orders/66f1a2b3c4d5e6f7a8b9c0d2 }
 *             url: { type: string, nullable: true }
 *         readAt: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *     ReportOverview:
 *       type: object
 *       properties:
 *         from: { type: string, example: '2026-10-19' }
 *         to: { type: string, example: '2026-11-17' }
 *         timezone: { type: string }
 *         summary:
 *           type: object
 *           properties:
 *             totalOrders: { type: integer }
 *             delivered: { type: integer }
 *             cancelled: { type: integer }
 *             inProgress: { type: integer }
 *             fulfillmentRate: { type: number, description: Entregados sobre no cancelados (%). }
 *             avgDeliveryMinutes: { type: number, nullable: true }
 *             deliveriesCompleted: { type: integer }
 *         perDay: { type: array, items: { type: object } }
 *         byDriver: { type: array, items: { type: object } }
 *         byStore: { type: array, items: { type: object } }
 */

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Mis avisos (campana)
 *     parameters:
 *       - { name: unread, in: query, schema: { type: string, enum: ['true'] } }
 *       - { name: page, in: query, schema: { type: integer, default: 1 } }
 *       - { name: limit, in: query, schema: { type: integer, default: 20, maximum: 100 } }
 *     responses:
 *       200:
 *         description: Avisos paginados, del más nuevo al más viejo, y cantidad de no leídos.
 *       401: { description: Sin token o token inválido. }
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Cantidad de avisos sin leer
 *     responses:
 *       200: { description: '`{ unreadCount }`' }
 * /api/notifications/read:
 *   post:
 *     tags: [Notifications]
 *     summary: Marcar avisos como leídos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids: { type: array, items: { type: string } }
 *               all: { type: boolean }
 *     responses:
 *       200: { description: '`{ updated, unreadCount }`. Solo se tocan los avisos del usuario del token.' }
 *       400: { description: Falta `ids` o `all`. }
 * /api/notifications/push/public-key:
 *   get:
 *     tags: [Notifications]
 *     summary: Clave pública VAPID
 *     responses:
 *       200: { description: '`{ publicKey }`' }
 *       404: { description: Web Push no está configurado en el servidor. }
 * /api/notifications/push/subscribe:
 *   post:
 *     tags: [Notifications]
 *     summary: Suscribir este dispositivo a Web Push
 *     description: Recibe el `PushSubscription.toJSON()` del navegador. Si el dispositivo ya estaba suscripto por otro usuario, pasa a ser de este.
 *     responses:
 *       201: { description: Dispositivo suscripto. }
 *       400: { description: Suscripción inválida. }
 *   delete:
 *     tags: [Notifications]
 *     summary: Quitar la suscripción de este dispositivo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endpoint]
 *             properties:
 *               endpoint: { type: string }
 *     responses:
 *       200: { description: Suscripción eliminada. }
 * /api/reports/overview:
 *   get:
 *     tags: [Reports]
 *     summary: Reporte de operación
 *     description: Solo `admin`. Período en días locales (inclusive); por defecto, los últimos 30 días. Máximo 366 días.
 *     parameters:
 *       - { name: from, in: query, schema: { type: string, example: '2026-10-19' } }
 *       - { name: to, in: query, schema: { type: string, example: '2026-11-17' } }
 *     responses:
 *       200:
 *         description: Resumen, serie diaria, y desempeño por repartidor y por tienda.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportOverview'
 *       400: { description: Fechas con formato inválido, invertidas o período demasiado largo. }
 *       403: { description: El usuario no es administrador. }
 * /api/reports/export.csv:
 *   get:
 *     tags: [Reports]
 *     summary: Exportar a CSV
 *     description: Separador `;` y BOM (abre bien en Excel es-AR).
 *     parameters:
 *       - { name: type, in: query, schema: { type: string, enum: [days, drivers, stores], default: days } }
 *       - { name: from, in: query, schema: { type: string } }
 *       - { name: to, in: query, schema: { type: string } }
 *     responses:
 *       200: { description: Archivo CSV. }
 *       400: { description: '`type` o fechas inválidos.' }
 * /api/reports/export.pdf:
 *   get:
 *     tags: [Reports]
 *     summary: Exportar a PDF
 *     parameters:
 *       - { name: from, in: query, schema: { type: string } }
 *       - { name: to, in: query, schema: { type: string } }
 *     responses:
 *       200: { description: Archivo PDF. }
 * /api/internal/notifications/process:
 *   post:
 *     tags: [Internal]
 *     summary: Enviar avisos pendientes y reintentar los fallidos
 *     security: []
 *     parameters:
 *       - { name: x-internal-secret, in: header, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: '`{ processed, sent, skipped, retried, failed }`' }
 *       401: { description: Secreto inválido. }
 * /api/internal/reports/weekly:
 *   post:
 *     tags: [Internal]
 *     summary: Enviar el reporte semanal a los administradores
 *     description: Cubre los 7 días hasta ayer. Idempotente por semana.
 *     security: []
 *     parameters:
 *       - { name: x-internal-secret, in: header, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: '`{ from, to, enqueued }`' }
 *       401: { description: Secreto inválido. }
 */