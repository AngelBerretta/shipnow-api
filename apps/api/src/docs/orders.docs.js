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
 *                 $ref: '#/components/schemas/Order'
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   post:
 *     tags: [Orders]
 *     summary: Crear pedido
 *     description: >
 *       Crea un pedido para un cliente existente. El pedido nace siempre en
 *       estado `created`. El `total` se calcula en el servidor a partir de
 *       los `items`; no debe enviarse. Un usuario con rol `driver` no puede
 *       figurar como `customer`. Se le asigna un `trackingCode` aleatorio y se
 *       registra el evento `order_created` en su historial. `store` (opcional)
 *       debe ser un usuario existente con rol `store`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderInput'
 *     responses:
 *       201:
 *         description: Pedido creado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderCreatedResponse'
 *       400:
 *         description: Faltan datos obligatorios (`customer`, `items` o `deliveryAddress`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: FORBIDDEN_ACTION, message: Los repartidores no pueden crear pedidos }
 *       404:
 *         description: El `customer` indicado no existe.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: USER_NOT_FOUND, message: El usuario no existe }
 *
 * /api/orders/{oid}:
 *   get:
 *     tags: [Orders]
 *     summary: Obtener pedido por ID
 *     parameters:
 *       - $ref: '#/components/parameters/OrderId'
 *     responses:
 *       200:
 *         description: Pedido encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: El `oid` no tiene formato de ObjectId válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: INVALID_ID, message: 'El identificador "123" no tiene un formato valido' }
 *       404:
 *         description: No existe un pedido con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: ORDER_NOT_FOUND, message: Pedido no encontrado }
 *
 *   delete:
 *     tags: [Orders]
 *     summary: Eliminar pedido
 *     description: >
 *       Borrado en cascada: elimina también la entrega asociada y el historial
 *       del pedido.
 *     parameters:
 *       - $ref: '#/components/parameters/OrderId'
 *     responses:
 *       200:
 *         description: Pedido eliminado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: Pedido eliminado
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
 *
 * /api/orders/{oid}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Actualizar estado del pedido
 *     description: >
 *       Respeta la máquina de estados: `created → assigned → picked_up →
 *       in_transit → delivered`, y `cancelled` desde cualquier estado no final.
 *       No se admiten saltos, retrocesos ni repetir el estado actual
 *       (`409 INVALID_STATUS_TRANSITION`). Un pedido con entrega asociada no se
 *       puede cancelar (`409 ORDER_HAS_ACTIVE_DELIVERY`). Cada cambio queda en
 *       el historial (`GET /api/orders/{oid}/events`).
 *     parameters:
 *       - $ref: '#/components/parameters/OrderId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderStatusUpdate'
 *     responses:
 *       200:
 *         description: Pedido actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Falta el `status` o no pertenece al enum de estados válidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: ORDER_NOT_FOUND, message: Pedido no encontrado }
 *       409:
 *         description: >
 *           El pedido ya fue entregado, la transición de estado no está permitida
 *           por la máquina de estados, o se intentó cancelar un pedido con entrega asociada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               yaEntregado:
 *                 summary: El pedido ya fue entregado
 *                 value:
 *                   success: false
 *                   error: { code: ORDER_ALREADY_DELIVERED, message: El pedido ya fue entregado }
 *               transicionInvalida:
 *                 summary: Salto de estado (created a delivered)
 *                 value:
 *                   success: false
 *                   error:
 *                     code: INVALID_STATUS_TRANSITION
 *                     message: 'Transicion de estado invalida para el pedido: "created" -> "delivered". Permitidas desde "created": assigned, cancelled'
 *                     details: { from: created, to: delivered, allowed: [assigned, cancelled] }
 *               conEntrega:
 *                 summary: Cancelar un pedido con entrega asociada
 *                 value:
 *                   success: false
 *                   error: { code: ORDER_HAS_ACTIVE_DELIVERY, message: 'El pedido tiene una entrega asociada: eliminala antes de cancelar el pedido' }
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
