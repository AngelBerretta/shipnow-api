/**
 * deliveries.docs.js — Documentación OpenAPI del módulo Deliveries (/api/deliveries).
 * Solo comentarios @openapi: no contiene lógica de rutas ni es
 * importado por src/routes/deliveries.routes.js.
 */

/**
 * @openapi
 * /api/deliveries:
 *   get:
 *     tags: [Deliveries]
 *     summary: Listar entregas
 *     description: >
 *       Devuelve todas las entregas, ordenadas por fecha de creación
 *       descendente, con `order` y `driver` populados.
 *     responses:
 *       200:
 *         description: Listado de entregas.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '***REMOVED***/components/schemas/Delivery'
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *
 *   post:
 *     tags: [Deliveries]
 *     summary: Crear entrega
 *     description: >
 *       Asigna un repartidor a un pedido existente. El pedido debe estar en
 *       estado `created` y el usuario indicado como `driver` debe tener rol
 *       `driver`. Al crearse la entrega, el pedido pasa a estado `assigned`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '***REMOVED***/components/schemas/DeliveryInput'
 *     responses:
 *       201:
 *         description: Entrega creada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/Delivery'
 *       400:
 *         description: Faltan datos obligatorios, o el usuario indicado no tiene rol `driver`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             examples:
 *               sinDriver:
 *                 summary: Falta el repartidor
 *                 value:
 *                   success: false
 *                   error: { code: VALIDATION_ERROR, message: El repartidor es obligatorio }
 *               rolIncorrecto:
 *                 summary: El usuario no es repartidor
 *                 value:
 *                   success: false
 *                   error: { code: VALIDATION_ERROR, message: 'El usuario no tiene rol de repartidor (rol actual: customer)' }
 *       404:
 *         description: El pedido o el repartidor indicados no existen.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             examples:
 *               pedidoInexistente:
 *                 summary: Pedido inexistente
 *                 value:
 *                   success: false
 *                   error: { code: ORDER_NOT_FOUND, message: El pedido no existe }
 *               repartidorInexistente:
 *                 summary: Repartidor inexistente
 *                 value:
 *                   success: false
 *                   error: { code: USER_NOT_FOUND, message: El repartidor no existe }
 *       409:
 *         description: El pedido ya fue asignado o procesado (no está en estado `created`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: ORDER_ALREADY_PROCESSED
 *                 message: 'El pedido ya fue asignado o procesado (estado actual: assigned)'
 *                 details: { currentStatus: assigned }
 *
 * /api/deliveries/{did}:
 *   get:
 *     tags: [Deliveries]
 *     summary: Obtener entrega por ID
 *     parameters:
 *       - $ref: '***REMOVED***/components/parameters/DeliveryId'
 *     responses:
 *       200:
 *         description: Entrega encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/Delivery'
 *       400:
 *         description: El `did` no tiene formato de ObjectId válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *       404:
 *         description: No existe una entrega con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: DELIVERY_NOT_FOUND, message: Entrega no encontrada }
 *
 *   delete:
 *     tags: [Deliveries]
 *     summary: Eliminar entrega
 *     parameters:
 *       - $ref: '***REMOVED***/components/parameters/DeliveryId'
 *     responses:
 *       200:
 *         description: Entrega eliminada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/SuccessResponse'
 *             example:
 *               message: Entrega eliminada
 *       400:
 *         description: El `did` no tiene formato de ObjectId válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *       404:
 *         description: No existe una entrega con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: DELIVERY_NOT_FOUND, message: Entrega no encontrada }
 *
 * /api/deliveries/{did}/status:
 *   patch:
 *     tags: [Deliveries]
 *     summary: Actualizar estado de la entrega
 *     description: >
 *       Si el nuevo estado es `delivered`, además se completa
 *       `deliveredAt` y el pedido asociado pasa automáticamente a estado
 *       `delivered`.
 *     parameters:
 *       - $ref: '***REMOVED***/components/parameters/DeliveryId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '***REMOVED***/components/schemas/DeliveryStatusUpdate'
 *     responses:
 *       200:
 *         description: Entrega actualizada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/Delivery'
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
 *                     message: 'Estado invalido: "returned". Valores permitidos: pending, assigned, in_transit, delivered'
 *                     details: { received: returned, allowed: [pending, assigned, in_transit, delivered] }
 *       404:
 *         description: No existe una entrega con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: DELIVERY_NOT_FOUND, message: Entrega no encontrada }
 *       409:
 *         description: La entrega ya fue completada (no admite más cambios de estado).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: DELIVERY_ALREADY_COMPLETED, message: La entrega ya fue completada }
 */

/**
 * @openapi
 * components:
 *   parameters:
 *     DeliveryId:
 *       name: did
 *       in: path
 *       required: true
 *       description: ID (ObjectId de Mongo) de la entrega.
 *       schema:
 *         type: string
 *       example: 66f1a2b3c4d5e6f7a8b9c0d3
 */
