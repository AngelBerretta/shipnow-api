/**
 * mocks.docs.js — Documentación OpenAPI del módulo Mocks (/api/mocks).
 * Solo comentarios @openapi: no contiene lógica de rutas ni es
 * importado por src/routes/mocks.routes.js.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     MockUser:
 *       type: object
 *       description: >
 *         Usuario simulado en memoria (mismo formato que `UserInput`, pero
 *         con `password` incluida como parte del dato falso).
 *       properties:
 *         _id:
 *           type: string
 *           description: Solo presente en `/api/mocks/full` (ObjectId simulado, no persistido).
 *           example: 66f1a2b3c4d5e6f7a8b9c0d1
 *         firstName:
 *           type: string
 *           example: Sofia
 *         lastName:
 *           type: string
 *           example: Gomez
 *         email:
 *           type: string
 *           example: sofia.gomez48412@mail.com
 *         password:
 *           type: string
 *           example: Mock4821!
 *         role:
 *           $ref: '***REMOVED***/components/schemas/Role'
 *         documents:
 *           type: array
 *           items: {}
 *           example: []
 *
 *     MockOrder:
 *       type: object
 *       description: Pedido simulado en memoria (mismo formato que `Order`, sin populate).
 *       properties:
 *         _id:
 *           type: string
 *           description: Solo presente en `/api/mocks/full` (ObjectId simulado, no persistido).
 *         customer:
 *           type: string
 *           description: >
 *             ObjectId. En `/api/mocks/orders` es un ID simulado sin
 *             documento real asociado; en `/api/mocks/full` referencia a
 *             uno de los `MockUser` de la misma respuesta.
 *         items:
 *           type: array
 *           items:
 *             $ref: '***REMOVED***/components/schemas/OrderItem'
 *         deliveryAddress:
 *           type: string
 *           example: San Martin 2481, Chivilcoy
 *         total:
 *           type: number
 *         status:
 *           $ref: '***REMOVED***/components/schemas/OrderStatus'
 *         priority:
 *           $ref: '***REMOVED***/components/schemas/Priority'
 *
 *     MockDelivery:
 *       type: object
 *       description: Entrega simulada en memoria (mismo formato que `Delivery`, sin populate).
 *       properties:
 *         order:
 *           type: string
 *           description: ObjectId simulado o referenciado a un `MockOrder` de la misma respuesta (según endpoint).
 *         driver:
 *           type: string
 *           description: ObjectId simulado o referenciado a un `MockUser` de la misma respuesta (según endpoint).
 *         status:
 *           $ref: '***REMOVED***/components/schemas/DeliveryStatus'
 *         priority:
 *           $ref: '***REMOVED***/components/schemas/Priority'
 *         assignedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         deliveredAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *
 *     MockSeedRequest:
 *       type: object
 *       description: Los tres campos son opcionales; cada uno tiene tope 200.
 *       properties:
 *         users:
 *           type: integer
 *           minimum: 0
 *           maximum: 200
 *           default: 10
 *         orders:
 *           type: integer
 *           minimum: 0
 *           maximum: 200
 *           default: 10
 *         deliveries:
 *           type: integer
 *           minimum: 0
 *           maximum: 200
 *           default: 5
 *
 *     MockSeedResponse:
 *       type: object
 *       properties:
 *         persisted:
 *           type: boolean
 *           example: true
 *         summary:
 *           type: object
 *           properties:
 *             users:
 *               type: object
 *               properties:
 *                 requested: { type: integer, example: 8 }
 *                 created: { type: integer, example: 8 }
 *             orders:
 *               type: object
 *               properties:
 *                 requested: { type: integer, example: 6 }
 *                 created: { type: integer, example: 6 }
 *             deliveries:
 *               type: object
 *               properties:
 *                 requested: { type: integer, example: 4 }
 *                 created: { type: integer, example: 4 }
 *             warnings:
 *               type: array
 *               description: >
 *                 Avisos no bloqueantes (ej: no había repartidores
 *                 disponibles, o se pidieron más entregas que pedidos
 *                 "created" disponibles).
 *               items:
 *                 type: string
 *               example: []
 *         data:
 *           type: object
 *           properties:
 *             users:
 *               type: array
 *               items:
 *                 $ref: '***REMOVED***/components/schemas/User'
 *             orders:
 *               type: array
 *               items:
 *                 $ref: '***REMOVED***/components/schemas/Order'
 *             deliveries:
 *               type: array
 *               items:
 *                 $ref: '***REMOVED***/components/schemas/Delivery'
 */

/**
 * @openapi
 * /api/mocks/users:
 *   get:
 *     tags: [Mocks]
 *     summary: Generar usuarios simulados (preview, no persiste)
 *     description: 'Genera usuarios falsos en memoria. No escribe nada en MongoDB (`persisted: false`).'
 *     parameters:
 *       - name: count
 *         in: query
 *         required: false
 *         description: Cantidad a generar (default 10, máximo 100).
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 10
 *         example: 5
 *       - name: role
 *         in: query
 *         required: false
 *         description: Filtra el rol generado. Si no se envía, el rol se sortea.
 *         schema:
 *           $ref: '***REMOVED***/components/schemas/Role'
 *     responses:
 *       200:
 *         description: Usuarios simulados generados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 persisted: { type: boolean, example: false }
 *                 count: { type: integer, example: 5 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '***REMOVED***/components/schemas/MockUser'
 *       400:
 *         description: '`count` no numérico/negativo, o `role` fuera del enum permitido.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             examples:
 *               cantidadInvalida:
 *                 summary: count inválido
 *                 value:
 *                   success: false
 *                   error:
 *                     code: INVALID_MOCK_QUANTITY
 *                     message: El parametro "count" no puede ser negativo
 *                     details: { field: count, received: '-5' }
 *               rolInvalido:
 *                 summary: role inválido
 *                 value:
 *                   success: false
 *                   error:
 *                     code: INVALID_ROLE
 *                     message: 'Rol invalido: "owner". Valores permitidos: admin, customer, driver, store'
 *                     details: { received: owner, allowed: [admin, customer, driver, store] }
 *
 * /api/mocks/orders:
 *   get:
 *     tags: [Mocks]
 *     summary: Generar pedidos simulados (preview, no persiste)
 *     description: >
 *       Genera pedidos falsos en memoria, con `customer` apuntando a un
 *       ObjectId simulado (sin documento real asociado). No escribe nada en
 *       MongoDB (`persisted: false`).
 *     parameters:
 *       - name: count
 *         in: query
 *         required: false
 *         description: Cantidad a generar (default 10, máximo 100).
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 10
 *     responses:
 *       200:
 *         description: Pedidos simulados generados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 persisted: { type: boolean, example: false }
 *                 count: { type: integer, example: 10 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '***REMOVED***/components/schemas/MockOrder'
 *       400:
 *         description: '`count` no numérico o negativo.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: INVALID_MOCK_QUANTITY
 *                 message: El parametro "count" debe ser un numero
 *                 details: { field: count, received: abc }
 *
 * /api/mocks/deliveries:
 *   get:
 *     tags: [Mocks]
 *     summary: Generar entregas simuladas (preview, no persiste)
 *     description: >
 *       Genera entregas falsas en memoria, con `order` y `driver` apuntando
 *       a ObjectId simulados (sin documentos reales asociados). No escribe
 *       nada en MongoDB (`persisted: false`).
 *     parameters:
 *       - name: count
 *         in: query
 *         required: false
 *         description: Cantidad a generar (default 10, máximo 100).
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 10
 *     responses:
 *       200:
 *         description: Entregas simuladas generadas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 persisted: { type: boolean, example: false }
 *                 count: { type: integer, example: 10 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '***REMOVED***/components/schemas/MockDelivery'
 *       400:
 *         description: '`count` no numérico o negativo.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *
 * /api/mocks/full:
 *   get:
 *     tags: [Mocks]
 *     summary: Generar dataset completo y relacionado (preview, no persiste)
 *     description: >
 *       Genera usuarios, pedidos y entregas simulados que se referencian
 *       entre sí (los pedidos usan como `customer` un `_id` de los
 *       usuarios simulados en la misma respuesta, y las entregas usan como
 *       `order`/`driver` un `_id` de esos mismos pedidos/usuarios). No
 *       escribe nada en MongoDB (`persisted: false`).
 *     parameters:
 *       - name: users
 *         in: query
 *         required: false
 *         description: Cantidad de usuarios (default 5, máximo 100).
 *         schema: { type: integer, minimum: 0, default: 5 }
 *       - name: orders
 *         in: query
 *         required: false
 *         description: Cantidad de pedidos (default 5, máximo 100).
 *         schema: { type: integer, minimum: 0, default: 5 }
 *       - name: deliveries
 *         in: query
 *         required: false
 *         description: Cantidad de entregas (default 5, máximo 100).
 *         schema: { type: integer, minimum: 0, default: 5 }
 *     responses:
 *       200:
 *         description: Dataset simulado generado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 persisted: { type: boolean, example: false }
 *                 note:
 *                   type: string
 *                   example: Dataset simulado en memoria. Ningun documento fue guardado en MongoDB.
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '***REMOVED***/components/schemas/MockUser'
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '***REMOVED***/components/schemas/MockOrder'
 *                 deliveries:
 *                   type: array
 *                   items:
 *                     $ref: '***REMOVED***/components/schemas/MockDelivery'
 *       400:
 *         description: Alguno de `users`, `orders` o `deliveries` no es numérico o es negativo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: INVALID_MOCK_QUANTITY
 *                 message: El parametro "orders" no puede ser negativo
 *                 details: { field: orders, received: '-3' }
 *
 * /api/mocks/generate:
 *   post:
 *     tags: [Mocks]
 *     summary: Cargar datos de prueba reales en MongoDB (seed)
 *     description: >
 *       Inserta datos de prueba **reales** en MongoDB, reutilizando
 *       `UserService`, `OrderService` y `DeliveryService` (las mismas
 *       reglas de negocio que los endpoints normales). Es aditivo: no
 *       borra datos existentes. El rol `admin` nunca se genera acá (la
 *       misma regla que bloquea su alta pública se respeta en el seeding).
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '***REMOVED***/components/schemas/MockSeedRequest'
 *           example:
 *             users: 8
 *             orders: 6
 *             deliveries: 4
 *     responses:
 *       201:
 *         description: Datos de prueba insertados.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/MockSeedResponse'
 *       400:
 *         description: >
 *           Cantidad inválida en `users`/`orders`/`deliveries`, o no hay
 *           usuarios con rol `customer` disponibles para asociar pedidos
 *           (si `users` fue 0 y la base está vacía).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             examples:
 *               cantidadInvalida:
 *                 summary: Cantidad inválida
 *                 value:
 *                   success: false
 *                   error:
 *                     code: INVALID_MOCK_QUANTITY
 *                     message: El parametro "users" debe ser un numero
 *                     details: { field: users, received: abc }
 *               sinCustomers:
 *                 summary: No hay customers para asociar pedidos
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: >-
 *                       No hay usuarios con rol "customer" para asociar a los pedidos.
 *                       Genera usuarios primero (parametro "users" > 0).
 *       500:
 *         description: Falla inesperada durante la carga en MongoDB (conexión caída, error de escritura no controlado, etc.).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: MOCK_GENERATION_FAILED
 *                 message: No se pudieron cargar los datos de prueba en MongoDB. Intenta nuevamente en unos segundos.
 */
