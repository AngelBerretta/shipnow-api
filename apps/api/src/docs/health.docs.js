/**
 * health.docs.js — Documentación OpenAPI del Health Check (/api/health).
 * Solo comentarios @openapi: no contiene lógica de rutas ni es
 * importado por src/routes/health.routes.js.
 */

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Verificar el estado del servidor
 *     description: >
 *       Health check simple para orquestadores y monitoreo (Docker,
 *       balanceadores, uptime checks externos). Disponible en cualquier
 *       entorno, incluida producción, y no requiere que MongoDB esté
 *       conectado. A propósito no expone nada sensible (ni la URI de
 *       Mongo, ni secretos, ni stack traces).
 *     responses:
 *       200:
 *         description: El servidor está activo y respondiendo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 environment:
 *                   type: string
 *                   example: production
 *                 uptime:
 *                   type: number
 *                   description: Segundos desde que arrancó el proceso.
 *                   example: 128.4
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */