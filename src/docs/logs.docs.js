/**
 * logs.docs.js — Documentación OpenAPI del módulo Logger (/api/logs).
 * Solo comentarios @openapi: no contiene lógica de rutas ni es
 * importado por src/routes/logs.routes.js.
 */

/**
 * @openapi
 * /api/logs/test:
 *   get:
 *     tags: [Logger]
 *     summary: Probar los niveles del logger (Winston)
 *     description: >
 *       **Herramienta de validación interna, no es funcionalidad de
 *       negocio de ShipNow.** Dispara un mensaje de ejemplo en cada uno de
 *       los 6 niveles configurados (`debug, http, info, warning, error,
 *       fatal`) para verificar rápidamente que Winston está bien
 *       configurado (consola, archivos y rotación). El nivel `fatal` se
 *       registra únicamente con fines de prueba: a diferencia de una falla
 *       real de arranque, este endpoint **no** termina el proceso. Este
 *       endpoint no tiene reglas de negocio propias, por lo que no expone
 *       errores de dominio (400/404/409); solo podría fallar con un
 *       `500 INTERNAL_ERROR` genérico ante un error no anticipado.
 *     responses:
 *       200:
 *         description: Prueba ejecutada. Revisar la consola y los archivos en `logs/`.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Prueba de logger ejecutada. Revisa la consola y los archivos en /logs.
 *                 note:
 *                   type: string
 *                   example: El nivel "fatal" se registro sin detener el servidor, unicamente con fines de prueba.
 *                 levelsTriggered:
 *                   type: array
 *                   items:
 *                     type: string
 *                     enum: [debug, http, info, warning, error, fatal]
 *                   example: [debug, http, info, warning, error, fatal]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Error interno no anticipado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 */
