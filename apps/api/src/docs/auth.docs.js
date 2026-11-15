/**
 * auth.docs.js — Documentación OpenAPI del módulo Auth (/api/auth).
 * Solo comentarios @openapi: no contiene lógica de rutas.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     LoginInput:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, format: email, example: admin@ruvika.com }
 *         password: { type: string, format: password }
 *     RefreshInput:
 *       type: object
 *       required: [refreshToken]
 *       properties:
 *         refreshToken: { type: string }
 *     AuthSession:
 *       type: object
 *       properties:
 *         tokenType: { type: string, example: Bearer }
 *         accessToken: { type: string, description: JWT de vida corta. }
 *         expiresIn: { type: integer, description: Segundos de vida del access token., example: 900 }
 *         refreshToken:
 *           type: string
 *           description: Token opaco de un solo uso. Cada refresh devuelve uno nuevo e invalida el anterior.
 *         user:
 *           $ref: '#/components/schemas/User'
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Sesión iniciada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSession'
 *       400:
 *         description: Faltan campos o el email no tiene formato válido.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Email o contraseña incorrectos (mismo mensaje para ambos casos).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: INVALID_CREDENTIALS, message: Email o contrasena incorrectos }
 *       403:
 *         description: La cuenta está desactivada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Demasiados intentos desde la misma IP.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renovar tokens
 *     description: >
 *       Rotación: el refresh token enviado queda invalidado y se devuelve uno nuevo.
 *       Si se reutiliza un refresh token ya usado, se revoca toda la sesión.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshInput'
 *     responses:
 *       200:
 *         description: Nuevos tokens.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSession'
 *       401:
 *         description: Refresh token inválido, vencido o reutilizado (`UNAUTHORIZED` o `TOKEN_EXPIRED`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesión
 *     description: Revoca la sesión del refresh token enviado. Es idempotente.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshInput'
 *     responses:
 *       200:
 *         description: Sesión cerrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Usuario autenticado
 *     responses:
 *       200:
 *         description: Perfil del usuario del token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Sin token, token inválido o vencido (`UNAUTHORIZED` / `TOKEN_EXPIRED`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */