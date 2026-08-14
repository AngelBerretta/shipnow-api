/**
 * orders.docs.js — Documentación OpenAPI del módulo Orders (/api/orders).
 * Solo comentarios @openapi: no contiene lógica de rutas ni es
 * importado por src/routes/orders.routes.js.
 */

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: Listar pedidos
 *     description: >
 *       Devuelve todos los pedidos, ordenados por fecha de creación
 *       descendente, con `customer` y `delivery` populados.
 *     responses:
 *       200:
 *         description: Listado de pedidos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '***REMOVED***/components/schemas/Order'
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *
 *   post:
 *     tags: [Orders]
 *     summary: Crear pedido
 *     description: >
 *       Crea un pedido para un cliente existente. El pedido nace siempre en
 *       estado `created`. El `total` se calcula en el servidor a partir de
 *       los `items`; no debe enviarse. Un usuario con rol `driver` no puede
 *       figurar como `customer`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '***REMOVED***/components/schemas/OrderInput'
 *     responses:
 *       201:
 *         description: Pedido creado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/OrderCreatedResponse'
 *       400:
 *         description: Faltan datos obligatorios (`customer`, `items` o `deliveryAddress`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             examples:
 *               sinItems:
 *                 summary: Sin items
 *                 value:
 *                   success: false
 *                   error: { code: VALIDATION_ERROR, message: Faltan los items del pedido }
 *               sinDireccion:
 *                 summary: Sin dirección de entrega
 *                 value:
 *                   success: false
 *                   error: { code: VALIDATION_ERROR, message: Falta la direccion }
 *       403:
 *         description: El `customer` indicado tiene rol `driver` (no puede crear pedidos).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: FORBIDDEN_ACTION, message: Los repartidores no pueden crear pedidos }
 *       404:
 *         description: El `customer` indicado no existe.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: USER_NOT_FOUND, message: El usuario no existe }
 *
 * /api/orders/{oid}:
 *   get:
 *     tags: [Orders]
 *     summary: Obtener pedido por ID
 *     parameters:
 *       - $ref: '***REMOVED***/components/parameters/OrderId'
 *     responses:
 *       200:
 *         description: Pedido encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/Order'
 *       400:
 *         description: El `oid` no tiene formato de ObjectId válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: INVALID_ID, message: 'El identificador "123" no tiene un formato valido' }
 *       404:
 *         description: No existe un pedido con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: ORDER_NOT_FOUND, message: Pedido no encontrado }
 *
 *   delete:
 *     tags: [Orders]
 *     summary: Eliminar pedido
 *     parameters:
 *       - $ref: '***REMOVED***/components/parameters/OrderId'
 *     responses:
 *       200:
 *         description: Pedido eliminado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/SuccessResponse'
 *             example:
 *               message: Pedido eliminado
 *       400:
 *         description: El `oid` no tiene formato de ObjectId válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *       404:
 *         description: No existe un pedido con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: ORDER_NOT_FOUND, message: Pedido no encontrado }
 *
 * /api/orders/{oid}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Actualizar estado del pedido
 *     parameters:
 *       - $ref: '***REMOVED***/components/parameters/OrderId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '***REMOVED***/components/schemas/OrderStatusUpdate'
 *     responses:
 *       200:
 *         description: Pedido actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/Order'
 *       400:
 *         description: Falta el `status` o no pertenece al enum de estados válidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             examples:
 *               sinStatus:
 *                 summary: Falta el status
 *                 value:
 *                   success: false
 *                   error: { code: VALIDATION_ERROR, message: El estado es obligatorio }
 *               statusInvalido:
 *                 summary: Estado fuera del enum
 *                 value:
 *                   success: false
 *                   error:
 *                     code: INVALID_STATUS
 *                     message: 'Estado invalido: "shipped". Valores permitidos: created, assigned, picked_up, in_transit, delivered, cancelled'
 *                     details: { received: shipped, allowed: [created, assigned, picked_up, in_transit, delivered, cancelled] }
 *       404:
 *         description: No existe un pedido con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: ORDER_NOT_FOUND, message: Pedido no encontrado }
 *       409:
 *         description: El pedido ya fue entregado (no admite más cambios de estado).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: ORDER_ALREADY_DELIVERED, message: El pedido ya fue entregado }
 */

/**
 * @openapi
 * components:
 *   parameters:
 *     OrderId:
 *       name: oid
 *       in: path
 *       required: true
 *       description: ID (ObjectId de Mongo) del pedido.
 *       schema:
 *         type: string
 *       example: 66f1a2b3c4d5e6f7a8b9c0d2
 */
