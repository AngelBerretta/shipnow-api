/**
 * products.docs.js — Documentación OpenAPI del módulo Products (/api/products).
 * Módulo montado en app.js pero no pedido explícitamente en el enunciado
 * (tags requeridos: Users, Orders, Deliveries, Mocks, Logger). Se agrega
 * igual, con su propio tag "Products", para que Swagger refleje el 100%
 * de la API real y no deje una ruta viva sin documentar.
 * Solo comentarios @openapi: no contiene lógica de rutas.
 */

/**
 * @openapi
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Listar productos
 *     description: Admite filtrar por `category` y/o `status`.
 *     parameters:
 *       - name: category
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         example: Electronica
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           $ref: '***REMOVED***/components/schemas/ProductStatus'
 *     responses:
 *       200:
 *         description: Listado de productos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '***REMOVED***/components/schemas/Product'
 *
 *   post:
 *     tags: [Products]
 *     summary: Crear producto
 *     description: >
 *       Si `stock` es 0, el producto se crea con `status: out_of_stock` sin
 *       importar el `status` enviado.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '***REMOVED***/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Producto creado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/Product'
 *       400:
 *         description: Faltan datos obligatorios, o `price`/`stock` son negativos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             examples:
 *               camposFaltantes:
 *                 summary: Faltan campos obligatorios
 *                 value:
 *                   success: false
 *                   error: { code: VALIDATION_ERROR, message: Faltan datos obligatorios (name, price, stock) }
 *               precioNegativo:
 *                 summary: Precio negativo
 *                 value:
 *                   success: false
 *                   error: { code: VALIDATION_ERROR, message: El precio no puede ser negativo }
 *
 * /api/products/{pid}:
 *   get:
 *     tags: [Products]
 *     summary: Obtener producto por ID
 *     parameters:
 *       - $ref: '***REMOVED***/components/parameters/ProductId'
 *     responses:
 *       200:
 *         description: Producto encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/Product'
 *       400:
 *         description: El `pid` no tiene formato de ObjectId válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *       404:
 *         description: No existe un producto con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: PRODUCT_NOT_FOUND, message: Producto no encontrado }
 *
 *   put:
 *     tags: [Products]
 *     summary: Actualizar producto
 *     description: >
 *       Actualización parcial: solo se modifican los campos enviados. Si se
 *       envía `stock`, `status` se recalcula automáticamente (mismo criterio
 *       que en la creación).
 *     parameters:
 *       - $ref: '***REMOVED***/components/parameters/ProductId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '***REMOVED***/components/schemas/ProductInput'
 *     responses:
 *       200:
 *         description: Producto actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/Product'
 *       400:
 *         description: '`price`/`stock` son negativos.'
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *       404:
 *         description: No existe un producto con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: PRODUCT_NOT_FOUND, message: Producto no encontrado }
 *
 *   delete:
 *     tags: [Products]
 *     summary: Eliminar producto
 *     parameters:
 *       - $ref: '***REMOVED***/components/parameters/ProductId'
 *     responses:
 *       200:
 *         description: Producto eliminado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/SuccessResponse'
 *             example:
 *               message: Producto eliminado
 *       404:
 *         description: No existe un producto con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: PRODUCT_NOT_FOUND, message: Producto no encontrado }
 */

/**
 * @openapi
 * components:
 *   parameters:
 *     ProductId:
 *       name: pid
 *       in: path
 *       required: true
 *       description: ID (ObjectId de Mongo) del producto.
 *       schema:
 *         type: string
 *       example: 66f1a2b3c4d5e6f7a8b9c0d4
 */
