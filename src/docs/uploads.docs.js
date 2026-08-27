/**
 * uploads.docs.js — Documentación OpenAPI del módulo de carga de
 * archivos (Multer). Solo comentarios @openapi: no contiene lógica de
 * rutas ni es importado por src/routes/users.routes.js ni
 * src/routes/deliveries.routes.js.
 *
 * Los límites (tamaño máximo, tipos MIME permitidos) documentados acá
 * son los mismos que aplica `src/config/multer.config.js`
 * (`UPLOAD_LIMITS`): si ese archivo cambia, esta documentación debe
 * actualizarse a mano.
 */

/**
 * @openapi
 * /api/users/{uid}/documents:
 *   post:
 *     tags: [Uploads]
 *     summary: Cargar un documento de usuario
 *     description: >
 *       Sube un documento (DNI, licencia, comprobante de domicilio, etc.)
 *       asociado a un usuario existente. El archivo se guarda en
 *       `uploads/users/` en el servidor; en la base solo queda registrado
 *       su metadato dentro de `user.documents`.
 *
 *
 *       **Límites:** máximo 5MB por archivo. Tipos permitidos:
 *       `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
 *     parameters:
 *       - $ref: '***REMOVED***/components/parameters/UserId'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, documentType]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo a cargar (campo obligatorio, debe llamarse exactamente `file`).
 *               documentType:
 *                 allOf:
 *                   - $ref: '***REMOVED***/components/schemas/DocumentType'
 *                 description: Tipo de documento. Obligatorio en este endpoint.
 *           encoding:
 *             file:
 *               contentType: application/pdf, image/jpeg, image/png, image/webp
 *     responses:
 *       201:
 *         description: Documento cargado y asociado al usuario.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/UserDocumentUploadResponse'
 *       400:
 *         description: >
 *           Falta el archivo, falta o es inválido `documentType`, el tipo de
 *           archivo no está permitido, o el archivo supera el tamaño máximo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             examples:
 *               archivoFaltante:
 *                 summary: No se envió ningún archivo
 *                 value:
 *                   success: false
 *                   error: { code: FILE_REQUIRED, message: El archivo es obligatorio (campo "file") }
 *               tipoDocumentoFaltante:
 *                 summary: Falta documentType
 *                 value:
 *                   success: false
 *                   error: { code: VALIDATION_ERROR, message: El tipo de documento es obligatorio }
 *               tipoDocumentoInvalido:
 *                 summary: documentType fuera del enum
 *                 value:
 *                   success: false
 *                   error:
 *                     code: INVALID_DOCUMENT_TYPE
 *                     message: 'Tipo de documento invalido: "pasaporte". Valores permitidos: dni, licencia, comprobante_domicilio, comprobante_entrega, otro'
 *                     details: { received: pasaporte, allowed: [dni, licencia, comprobante_domicilio, comprobante_entrega, otro] }
 *               tipoArchivoInvalido:
 *                 summary: mimetype no permitido
 *                 value:
 *                   success: false
 *                   error:
 *                     code: INVALID_FILE_TYPE
 *                     message: 'Tipo de archivo no permitido: "text/plain". Tipos permitidos: application/pdf, image/jpeg, image/png, image/webp'
 *                     details: { received: text/plain, allowed: [application/pdf, image/jpeg, image/png, image/webp] }
 *               archivoDemasiadoGrande:
 *                 summary: Supera el tamaño máximo
 *                 value:
 *                   success: false
 *                   error:
 *                     code: FILE_TOO_LARGE
 *                     message: El archivo supera el tamaño maximo permitido (5.0MB)
 *                     details: { maxSizeBytes: 5242880 }
 *               campoInesperado:
 *                 summary: El archivo se envió en un campo distinto a "file"
 *                 value:
 *                   success: false
 *                   error: { code: UNEXPECTED_FILE_FIELD, message: 'El archivo debe enviarse en el campo "file"' }
 *       404:
 *         description: No existe un usuario con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: USER_NOT_FOUND, message: Usuario no encontrado }
 *
 * /api/deliveries/{did}/proof:
 *   post:
 *     tags: [Uploads]
 *     summary: Cargar un comprobante de entrega
 *     description: >
 *       Sube un comprobante (foto, firma del cliente, etc.) asociado a una
 *       entrega existente. El archivo se guarda en `uploads/deliveries/` en
 *       el servidor; en la base solo queda registrado su metadato dentro de
 *       `delivery.documents`.
 *
 *
 *       **Límites:** máximo 5MB por archivo. Tipos permitidos:
 *       `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
 *     parameters:
 *       - $ref: '***REMOVED***/components/parameters/DeliveryId'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo a cargar (campo obligatorio, debe llamarse exactamente `file`).
 *               documentType:
 *                 allOf:
 *                   - $ref: '***REMOVED***/components/schemas/DocumentType'
 *                 description: >
 *                   Opcional. Si no se envía, se guarda como
 *                   `comprobante_entrega`. Si se envía, debe pertenecer al enum.
 *           encoding:
 *             file:
 *               contentType: application/pdf, image/jpeg, image/png, image/webp
 *     responses:
 *       201:
 *         description: Comprobante cargado y asociado a la entrega.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/DeliveryProofUploadResponse'
 *       400:
 *         description: >
 *           Falta el archivo, `documentType` es inválido, el tipo de archivo
 *           no está permitido, o el archivo supera el tamaño máximo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             examples:
 *               archivoFaltante:
 *                 summary: No se envió ningún archivo
 *                 value:
 *                   success: false
 *                   error: { code: FILE_REQUIRED, message: El archivo es obligatorio (campo "file") }
 *               tipoArchivoInvalido:
 *                 summary: mimetype no permitido
 *                 value:
 *                   success: false
 *                   error:
 *                     code: INVALID_FILE_TYPE
 *                     message: 'Tipo de archivo no permitido: "text/plain". Tipos permitidos: application/pdf, image/jpeg, image/png, image/webp'
 *                     details: { received: text/plain, allowed: [application/pdf, image/jpeg, image/png, image/webp] }
 *       404:
 *         description: No existe una entrega con ese ID.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '***REMOVED***/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: { code: DELIVERY_NOT_FOUND, message: Entrega no encontrada }
 */
