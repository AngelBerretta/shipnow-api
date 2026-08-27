/**
 * schemas.docs.js
 *
 * Solo contiene bloques de comentarios `@openapi` con los schemas
 * reutilizables de la API (`components.schemas`). No exporta nada
 * ejecutable ni es importado por ningún otro archivo: swagger-jsdoc lo
 * lee directamente gracias al glob `apis` de `src/config/swagger.config.js`.
 *
 * Los demás archivos de `src/docs/` referencian estos schemas con
 * `$ref: '***REMOVED***/components/schemas/<Nombre>'` en vez de repetir la forma de
 * cada entidad en cada endpoint.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     UserSummary:
 *       type: object
 *       description: >
 *         Versión reducida del usuario tal como queda "populado" dentro de
 *         un pedido o una entrega (sin password, sin documents).
 *       properties:
 *         _id:
 *           type: string
 *           example: 66f1a2b3c4d5e6f7a8b9c0d1
 *         firstName:
 *           type: string
 *           example: Sofia
 *         lastName:
 *           type: string
 *           example: Gomez
 *         email:
 *           type: string
 *           format: email
 *           example: sofia.gomez@example.com
 *         role:
 *           $ref: '***REMOVED***/components/schemas/Role'
 *
 *     Role:
 *       type: string
 *       enum: [admin, customer, driver, store]
 *       example: customer
 *
 *     User:
 *       type: object
 *       description: Usuario de la plataforma. La respuesta nunca incluye `password`.
 *       properties:
 *         _id:
 *           type: string
 *           example: 66f1a2b3c4d5e6f7a8b9c0d1
 *         firstName:
 *           type: string
 *           example: Sofia
 *         lastName:
 *           type: string
 *           example: Gomez
 *         email:
 *           type: string
 *           format: email
 *           example: sofia.gomez@example.com
 *         role:
 *           $ref: '***REMOVED***/components/schemas/Role'
 *         documents:
 *           type: array
 *           description: >
 *             Documentos cargados para este usuario (vacío por defecto). Se
 *             suman con `POST /api/users/{uid}/documents` — ver tag `Uploads`.
 *           items:
 *             $ref: '***REMOVED***/components/schemas/FileMetadata'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     UserInput:
 *       type: object
 *       required: [firstName, lastName, email, password]
 *       properties:
 *         firstName:
 *           type: string
 *           example: Sofia
 *         lastName:
 *           type: string
 *           example: Gomez
 *         email:
 *           type: string
 *           format: email
 *           example: sofia.gomez@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: Secreta123!
 *         role:
 *           allOf:
 *             - $ref: '***REMOVED***/components/schemas/Role'
 *           description: >
 *             Opcional (default `customer`). El rol `admin` **no puede
 *             otorgarse por esta vía**: la API responde `403 FORBIDDEN_ACTION`
 *             si se envía `role: "admin"`.
 *
 *     OrderItem:
 *       type: object
 *       required: [name, quantity, price]
 *       properties:
 *         name:
 *           type: string
 *           example: Auriculares inalambricos
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           example: 2
 *         price:
 *           type: number
 *           minimum: 0
 *           example: 15990.5
 *
 *     OrderStatus:
 *       type: string
 *       enum: [created, assigned, picked_up, in_transit, delivered, cancelled]
 *       example: created
 *
 *     Priority:
 *       type: string
 *       enum: [low, normal, high]
 *       example: normal
 *
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 66f1a2b3c4d5e6f7a8b9c0d2
 *         customer:
 *           description: >
 *             En las respuestas (GET) viene populado con los datos del
 *             usuario. Al crear el pedido se envía solo el `_id`
 *             (ver `OrderInput`).
 *           $ref: '***REMOVED***/components/schemas/UserSummary'
 *         items:
 *           type: array
 *           items:
 *             $ref: '***REMOVED***/components/schemas/OrderItem'
 *         deliveryAddress:
 *           type: string
 *           example: Av. Rivadavia 1234, Chivilcoy
 *         total:
 *           type: number
 *           description: Calculado por el servidor (suma de `price * quantity` de cada item).
 *           example: 31981
 *         status:
 *           $ref: '***REMOVED***/components/schemas/OrderStatus'
 *         priority:
 *           $ref: '***REMOVED***/components/schemas/Priority'
 *         delivery:
 *           nullable: true
 *           description: >
 *             `null` hasta que se crea una entrega para el pedido
 *             (`POST /api/deliveries`). Cuando existe, viene populada con
 *             el objeto `Delivery` completo.
 *           $ref: '***REMOVED***/components/schemas/Delivery'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     OrderInput:
 *       type: object
 *       required: [customer, items, deliveryAddress]
 *       properties:
 *         customer:
 *           type: string
 *           description: '`_id` de un usuario existente (no puede tener rol `driver`).'
 *           example: 66f1a2b3c4d5e6f7a8b9c0d1
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '***REMOVED***/components/schemas/OrderItem'
 *         deliveryAddress:
 *           type: string
 *           example: Av. Rivadavia 1234, Chivilcoy
 *         priority:
 *           allOf:
 *             - $ref: '***REMOVED***/components/schemas/Priority'
 *           description: Opcional (default `normal`).
 *
 *     OrderStatusUpdate:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           $ref: '***REMOVED***/components/schemas/OrderStatus'
 *
 *     OrderCreatedResponse:
 *       type: object
 *       properties:
 *         order:
 *           $ref: '***REMOVED***/components/schemas/Order'
 *         shippingCost:
 *           type: number
 *           description: 'Calculado como $10 por unidad pedida, sumando todos los items.'
 *           example: 20
 *         message:
 *           type: string
 *           example: Pedido creado y email enviado
 *
 *     DeliveryStatus:
 *       type: string
 *       enum: [pending, assigned, in_transit, delivered]
 *       example: assigned
 *
 *     Delivery:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 66f1a2b3c4d5e6f7a8b9c0d3
 *         order:
 *           description: En las respuestas (GET) viene populado con el pedido completo.
 *           $ref: '***REMOVED***/components/schemas/Order'
 *         driver:
 *           description: En las respuestas (GET) viene populado con los datos del repartidor.
 *           $ref: '***REMOVED***/components/schemas/UserSummary'
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
 *         documents:
 *           type: array
 *           description: >
 *             Comprobantes asociados a esta entrega (vacío por defecto). Se
 *             suman con `POST /api/deliveries/{did}/proof` — ver tag `Uploads`.
 *           items:
 *             $ref: '***REMOVED***/components/schemas/FileMetadata'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     DeliveryInput:
 *       type: object
 *       required: [order, driver]
 *       properties:
 *         order:
 *           type: string
 *           description: '`_id` de un pedido existente que debe estar en estado `created`.'
 *           example: 66f1a2b3c4d5e6f7a8b9c0d2
 *         driver:
 *           type: string
 *           description: '`_id` de un usuario existente con rol `driver`.'
 *           example: 66f1a2b3c4d5e6f7a8b9c0d1
 *         priority:
 *           allOf:
 *             - $ref: '***REMOVED***/components/schemas/Priority'
 *           description: Opcional (default `normal`).
 *
 *     DeliveryStatusUpdate:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           $ref: '***REMOVED***/components/schemas/DeliveryStatus'
 *
 *     ProductStatus:
 *       type: string
 *       enum: [available, out_of_stock]
 *       example: available
 *
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 66f1a2b3c4d5e6f7a8b9c0d4
 *         name:
 *           type: string
 *           example: Auriculares inalambricos
 *         description:
 *           type: string
 *           example: Auriculares bluetooth con cancelacion de ruido
 *         price:
 *           type: number
 *           minimum: 0
 *           example: 15990.5
 *         stock:
 *           type: integer
 *           minimum: 0
 *           example: 25
 *         category:
 *           type: string
 *           example: Electronica
 *         status:
 *           $ref: '***REMOVED***/components/schemas/ProductStatus'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     ProductInput:
 *       type: object
 *       required: [name, price, stock]
 *       properties:
 *         name:
 *           type: string
 *           example: Auriculares inalambricos
 *         description:
 *           type: string
 *           example: Auriculares bluetooth con cancelacion de ruido
 *         price:
 *           type: number
 *           minimum: 0
 *           example: 15990.5
 *         stock:
 *           type: integer
 *           minimum: 0
 *           example: 25
 *         category:
 *           type: string
 *           example: Electronica
 *         status:
 *           allOf:
 *             - $ref: '***REMOVED***/components/schemas/ProductStatus'
 *           description: >
 *             Ignorado si `stock` queda en 0: el producto siempre pasa a
 *             `out_of_stock` sin importar el valor enviado acá.
 *
 *     DocumentType:
 *       type: string
 *       description: >
 *         Tipo de documento cargado. `comprobante_entrega` es el valor por
 *         defecto de `POST /api/deliveries/{did}/proof` cuando no se envía
 *         `documentType`; los demás se usan principalmente para
 *         `POST /api/users/{uid}/documents`.
 *       enum: [dni, licencia, comprobante_domicilio, comprobante_entrega, otro]
 *       example: dni
 *
 *     FileMetadata:
 *       type: object
 *       description: >
 *         Metadatos de un archivo cargado con Multer. El archivo en sí vive
 *         en el filesystem del servidor (`uploads/`), nunca en MongoDB.
 *       properties:
 *         _id:
 *           type: string
 *           example: 66f1a2b3c4d5e6f7a8b9c0d5
 *         originalName:
 *           type: string
 *           description: Nombre del archivo tal como lo envió el cliente.
 *           example: dni-frente.pdf
 *         storedName:
 *           type: string
 *           description: Nombre generado por el servidor al guardarlo (evita colisiones).
 *           example: 1735000000000-482913746.pdf
 *         path:
 *           type: string
 *           description: Ruta del archivo relativa a la raíz del proyecto.
 *           example: uploads/users/1735000000000-482913746.pdf
 *         mimeType:
 *           type: string
 *           example: application/pdf
 *         size:
 *           type: integer
 *           description: Tamaño del archivo en bytes.
 *           example: 204800
 *         documentType:
 *           $ref: '***REMOVED***/components/schemas/DocumentType'
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *
 *     UserDocumentUploadResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Documento cargado correctamente
 *         user:
 *           $ref: '***REMOVED***/components/schemas/User'
 *
 *     DeliveryProofUploadResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Comprobante asociado a la entrega correctamente
 *         delivery:
 *           $ref: '***REMOVED***/components/schemas/Delivery'
 *
 *     ErrorResponse:
 *       type: object
 *       description: Forma uniforme de TODA respuesta de error de la API (400, 403, 404, 409, 500).
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               description: Código estable del error, usable por el cliente para lógica condicional.
 *               enum:
 *                 - VALIDATION_ERROR
 *                 - INVALID_STATUS
 *                 - INVALID_ROLE
 *                 - INVALID_ID
 *                 - MALFORMED_JSON
 *                 - FORBIDDEN_ACTION
 *                 - USER_NOT_FOUND
 *                 - ORDER_NOT_FOUND
 *                 - DELIVERY_NOT_FOUND
 *                 - PRODUCT_NOT_FOUND
 *                 - ROUTE_NOT_FOUND
 *                 - DUPLICATE_EMAIL
 *                 - DUPLICATE_KEY
 *                 - ORDER_ALREADY_PROCESSED
 *                 - ORDER_ALREADY_DELIVERED
 *                 - DELIVERY_ALREADY_COMPLETED
 *                 - INVALID_MOCK_QUANTITY
 *                 - MOCK_GENERATION_FAILED
 *                 - FILE_REQUIRED
 *                 - INVALID_FILE_TYPE
 *                 - FILE_TOO_LARGE
 *                 - INVALID_DOCUMENT_TYPE
 *                 - UNEXPECTED_FILE_FIELD
 *                 - FILE_UPLOAD_FAILED
 *                 - INTERNAL_ERROR
 *               example: VALIDATION_ERROR
 *             message:
 *               type: string
 *               example: Los datos enviados no son validos
 *             details:
 *               description: >
 *                 Opcional: solo aparece cuando el error tiene información
 *                 adicional útil para el cliente (valores permitidos de un
 *                 estado inválido, el campo que falló, etc.).
 *               nullable: true
 *               oneOf:
 *                 - type: object
 *                 - type: array
 *                   items:
 *                     type: string
 *
 *     SuccessResponse:
 *       type: object
 *       description: Respuesta genérica de confirmación (usada por los endpoints de baja/DELETE).
 *       properties:
 *         message:
 *           type: string
 *           example: Usuario eliminado
 */
