/**
 * users.docs.js — Documentación OpenAPI del módulo Users (/api/users).
 * Solo comentarios @openapi: no contiene lógica de rutas ni es
 * importado por src/routes/users.routes.js.
 */

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Listar usuarios
 *     description: Devuelve todos los usuarios registrados (sin el campo `password`).
 *     responses:
 *       200:
 *         description: Listado de usuarios.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: INTERNAL_ERROR, message: Error interno del servidor }
 *
 *   post:
 *     tags: [Users]
 *     summary: Crear usuario
 *     description: >
 *       Crea un usuario nuevo. El rol `admin` no puede otorgarse por esta vía
 *       (responde `403`). Si el email ya existe, responde `409`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: Usuario creado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos inválidos (faltan campos obligatorios o el rol enviado no existe).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               camposFaltantes:
 *                 summary: Faltan campos obligatorios
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Faltan datos obligatorios (firstName, lastName, email, password)
 *               rolInvalido:
 *                 summary: Rol fuera del enum permitido
 *                 value:
 *                   success: false
 *                   error:
 *                     code: INVALID_ROLE
 *                     message: 'Rol invalido: "owner". Valores permitidos: admin, customer, driver, store'
 *                     details: { received: owner, allowed: [admin, customer, driver, store] }
 *       403:
 *         description: Intento de crear un usuario con rol `admin` (no permitido vía alta pública).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: FORBIDDEN_ACTION, message: No puedes crear un usuario con rol admin }
 *       409:
 *         description: El email ya está registrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: DUPLICATE_EMAIL
 *                 message: El email ya esta registrado
 *                 details: { email: sofia.gomez@example.com }
 *
 * /api/users/{uid}:
 *   get:
 *     tags: [Users]
 *     summary: Obtener usuario por ID
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: Usuario encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: El `uid` no tiene formato de ObjectId válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: INVALID_ID, message: 'El identificador "123" no tiene un formato valido' }
 *       404:
 *         description: No existe un usuario con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: USER_NOT_FOUND, message: Usuario no encontrado }
 * 
 *   patch:
 *     tags: [Users]
 *     summary: Editar usuario
 *     description: >
 *       Solo `admin`. Cambio parcial de `firstName`, `lastName`, `role`, `password` e
 *       `isActive` (baja lógica). No se puede otorgar el rol `admin`, cambiar el rol
 *       de un admin ni desactivarse a uno mismo (`403`). El email no se edita.
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               role: { $ref: '#/components/schemas/Role' }
 *               password: { type: string, format: password, minLength: 8 }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Usuario actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos inválidos, rol inexistente o id con formato inválido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Operación no permitida sobre ese usuario.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: No existe un usuario con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   delete:
 *     tags: [Users]
 *     summary: Eliminar usuario
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: Usuario eliminado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               message: Usuario eliminado
 *       400:
 *         description: El `uid` no tiene formato de ObjectId válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: INVALID_ID, message: 'El identificador "123" no tiene un formato valido' }
 *       404:
 *         description: No existe un usuario con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: USER_NOT_FOUND, message: Usuario no encontrado }
 */

/**
 * @openapi
 * components:
 *   parameters:
 *     UserId:
 *       name: uid
 *       in: path
 *       required: true
 *       description: ID (ObjectId de Mongo) del usuario.
 *       schema:
 *         type: string
 *       example: 66f1a2b3c4d5e6f7a8b9c0d1
 */
