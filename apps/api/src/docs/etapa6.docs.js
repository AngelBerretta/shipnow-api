/**
 * etapa6.docs.js — OpenAPI de /api/locations, /api/integrations y /api/inbound.
 * Solo comentarios @openapi.
 */

/**
 * @openapi
 * /api/locations/me:
 *   post:
 *     tags: [Locations]
 *     summary: Enviar mi posición (repartidor)
 *     description: Se aplica a todas las entregas activas del repartidor. Pings con menos de 5 s de diferencia se descartan (`accepted:false`).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lat, lng]
 *             properties:
 *               lat: { type: number, minimum: -90, maximum: 90 }
 *               lng: { type: number, minimum: -180, maximum: 180 }
 *               accuracy: { type: number, description: Metros. }
 *               heading: { type: number }
 *               speed: { type: number, description: m/s. }
 *     responses:
 *       200: { description: '`{ accepted, deliveries }`' }
 *       400: { description: Coordenadas inválidas. }
 *       403: { description: El usuario no es repartidor. }
 * /api/locations/live:
 *   get:
 *     tags: [Locations]
 *     summary: Posiciones de las entregas activas (admin)
 *     responses:
 *       200: { description: '`{ data: [{ deliveryId, trackingCode, driverName, status, lat, lng, recordedAt, eta }], generatedAt }`' }
 * /api/locations/deliveries/{did}:
 *   get:
 *     tags: [Locations]
 *     summary: Recorrido de una entrega (admin)
 *     parameters:
 *       - $ref: '#/components/parameters/DeliveryId'
 *     responses:
 *       200: { description: '`{ delivery, points: [{ lat, lng, recordedAt }] }` (máx. 500 puntos).' }
 *       404: { description: Entrega inexistente. }
 * /api/integrations:
 *   get:
 *     tags: [Integrations]
 *     summary: Listar integraciones (sin secretos)
 *     responses:
 *       200: { description: '`{ data: [...] }`' }
 *   post:
 *     tags: [Integrations]
 *     summary: Crear integración
 *     description: Devuelve `apiKey` y `webhookSecret` UNA sola vez.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, store]
 *             properties:
 *               name: { type: string }
 *               store: { type: string, description: _id de un usuario con rol store. }
 *               webhookUrl: { type: string, nullable: true }
 *               events: { type: array, items: { type: string, example: order.delivered } }
 *     responses:
 *       201: { description: '`{ integration, apiKey, webhookSecret }`' }
 *       400: { description: Datos inválidos o la tienda no tiene rol store. }
 * /api/integrations/{iid}:
 *   patch:
 *     tags: [Integrations]
 *     summary: Editar (nombre, URL, eventos, activar/desactivar)
 *     parameters:
 *       - { name: iid, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Integración actualizada. }
 *       404: { description: No existe. }
 *   delete:
 *     tags: [Integrations]
 *     summary: Eliminar
 *     parameters:
 *       - { name: iid, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Eliminada. }
 * /api/integrations/{iid}/rotate-key:
 *   post:
 *     tags: [Integrations]
 *     summary: Rotar la API key (la anterior deja de servir)
 *     parameters:
 *       - { name: iid, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: '`{ integration, apiKey }`' }
 * /api/integrations/{iid}/rotate-secret:
 *   post:
 *     tags: [Integrations]
 *     summary: Rotar el secreto de firma de los webhooks
 *     parameters:
 *       - { name: iid, in: path, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: '`{ integration, webhookSecret }`' }
 * /api/inbound/orders:
 *   post:
 *     tags: [Inbound]
 *     summary: Crear un pedido desde un sistema externo
 *     description: Auth con `X-API-Key`. Idempotente por `externalId` (repetirlo devuelve 200 y el mismo pedido).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [externalId, customer, items, deliveryAddress]
 *             properties:
 *               externalId: { type: string, example: TN-10234 }
 *               customer:
 *                 type: object
 *                 properties:
 *                   firstName: { type: string }
 *                   lastName: { type: string }
 *                   email: { type: string, format: email }
 *               items: { type: array, items: { $ref: '#/components/schemas/OrderItem' } }
 *               deliveryAddress: { type: string }
 *               priority: { $ref: '#/components/schemas/Priority' }
 *     responses:
 *       201: { description: '`{ created: true, order: { trackingCode, status, externalId, trackingUrl } }`' }
 *       200: { description: Ya existía (mismo externalId). }
 *       401: { description: API key inválida o integración desactivada. }
 * /api/inbound/woocommerce/{integrationId}:
 *   post:
 *     tags: [Inbound]
 *     summary: Webhook de WooCommerce
 *     description: Autenticado con la firma `X-WC-Webhook-Signature` (secreto = `webhookSecret`). Solo crea pedidos en estado `processing`.
 *     security: []
 *     parameters:
 *       - { name: integrationId, in: path, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Pedido creado. }
 *       200: { description: Ignorado (otro estado) o ya existente. }
 *       401: { description: Firma inválida. }
 */