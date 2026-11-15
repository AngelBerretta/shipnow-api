/**
 * stats.docs.js — Documentación OpenAPI de las métricas (/api/stats).
 * Solo comentarios @openapi: no contiene lógica de rutas.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     StatsOverview:
 *       type: object
 *       properties:
 *         generatedAt: { type: string, format: date-time }
 *         timezone:
 *           type: string
 *           description: Zona horaria con la que se agrupa por día.
 *           example: America/Argentina/Buenos_Aires
 *         days: { type: integer, example: 14 }
 *         kpis:
 *           type: object
 *           properties:
 *             ordersToday: { type: integer, description: Pedidos creados hoy (día local)., example: 6 }
 *             inTransit: { type: integer, example: 3 }
 *             delivered: { type: integer, example: 40 }
 *             cancelled: { type: integer, example: 2 }
 *             totalOrders: { type: integer, example: 52 }
 *             deliveryRate:
 *               type: number
 *               description: Porcentaje de pedidos entregados sobre los no cancelados.
 *               example: 80
 *         byStatus:
 *           type: array
 *           description: Un elemento por cada estado de pedido (los que no tienen pedidos van con 0).
 *           items:
 *             type: object
 *             properties:
 *               status: { $ref: '#/components/schemas/OrderStatus' }
 *               count: { type: integer }
 *         perDay:
 *           type: array
 *           description: Un elemento por día, en orden cronológico; el último es hoy.
 *           items:
 *             type: object
 *             properties:
 *               date: { type: string, example: '2026-11-15' }
 *               created: { type: integer }
 *               delivered: { type: integer }
 */

/**
 * @openapi
 * /api/stats/overview:
 *   get:
 *     tags: [Stats]
 *     summary: Resumen operativo para el dashboard
 *     description: >
 *       Solo `admin`. KPIs, pedidos por estado y pedidos creados/entregados por
 *       día. Calculado con aggregation pipelines de MongoDB.
 *     parameters:
 *       - name: days
 *         in: query
 *         required: false
 *         description: Cantidad de días de la serie `perDay` (default 14, máximo 90). Un valor inválido cae al default.
 *         schema: { type: integer, minimum: 1, maximum: 90, default: 14 }
 *     responses:
 *       200:
 *         description: Resumen calculado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsOverview'
 *       401:
 *         description: Sin token, token inválido o vencido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: El usuario no es administrador.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
