import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * swagger.config.js
 *
 * Única configuración de Swagger/OpenAPI de todo el proyecto. Vive en
 * `src/config/`, junto al resto de la configuración de la app (env,
 * logger), y NO conoce ni importa nada de `src/routes/` ni de los
 * Controllers: ningún router llama a `swaggerUi.setup()` por su cuenta.
 *
 * La documentación real de cada endpoint (paths, parámetros, bodies,
 * respuestas) no vive acá: son bloques de comentarios JSDoc `@openapi`
 * en `src/docs/*.docs.js`, que este archivo solo le indica a
 * `swagger-jsdoc` dónde encontrar (`apis`). Esos archivos no exportan
 * lógica ejecutable ni son importados por ninguna otra parte de la app:
 * su único propósito es ser leídos por swagger-jsdoc.
 *
 * `setupSwagger(app)` es la única función que `app.js` necesita llamar
 * para exponer la documentación interactiva en `/api/docs`.
 */

const PORT = process.env.PORT || 3000;

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Ruvika API',
    version: '1.0.0',
    description:
      'API de logística de Ruvika: gestión de usuarios, pedidos, entregas y ' +
      'productos, con un módulo adicional de generación de datos de prueba ' +
      '(mocks) y un endpoint interno de validación del sistema de logging.\n\n' +
      'Arquitectura por capas (Router → Controller → Service → Repository) ' +
      'con manejo centralizado de errores: toda respuesta de error de la API ' +
      'tiene la misma forma (ver el schema `ErrorResponse`).\n\n' +
      '**Autenticación:** `POST /api/auth/login` devuelve un `accessToken` (JWT, 15 min) y ' +
      'un `refreshToken` (rota en cada uso). Enviá el access token en `Authorization: Bearer <token>` ' +
      '(botón *Authorize*). Toda respuesta puede ser `401` (sin token o vencido) o `403` (sin permiso ' +
      'para ese rol o recurso). Excepto `/api/auth/*` y `/api/health`, todos los endpoints requieren token; ' +
      '`/api/mocks` y `/api/logs` son solo para `admin`.',
    contact: {
      name: 'Ruvika',
    },
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Servidor local de desarrollo',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  security: [{ bearerAuth: [] }],  
  tags: [
    {
      name: 'Health',
      description: 'Verificación del estado del servidor (uptime, entorno). Disponible en cualquier entorno.',
    },    
    {
      name: 'Users',
      description: 'Alta, consulta y baja de usuarios (clientes, repartidores, tiendas y administradores).',
    },
    {
      name: 'Orders',
      description: 'Ciclo de vida de los pedidos: creación, consulta, cambio de estado y eliminación.',
    },
    {
      name: 'Deliveries',
      description: 'Entregas asignadas a repartidores sobre pedidos existentes.',
    },
    {
      name: 'Products',
      description: 'Catálogo de productos de las tiendas.',
    },
    {
      name: 'Mocks',
      description:
        'Generación de datos simulados (en memoria) y carga controlada de datos de ' +
        'prueba reales en MongoDB, reutilizando las mismas reglas de negocio que ' +
        'los endpoints normales.',
    },
    {
      name: 'Logger',
      description:
        'Endpoint interno de validación del sistema de logging (Winston). ' +
        'Es una herramienta de testing/observabilidad, no una funcionalidad de negocio.',
    },
    {
      name: 'Uploads',
      description:
        'Carga de archivos (documentos de usuario y comprobantes de entrega) vía ' +
        'multipart/form-data con Multer. Los archivos se guardan en el filesystem ' +
        'del servidor; en MongoDB solo se persisten sus metadatos.',
    },
    {
      name: 'Auth',
      description: 'Inicio y cierre de sesión, renovación de tokens y perfil del usuario autenticado.',
    },    
  ],
};

const options = {
  definition: swaggerDefinition,
  // Todos los bloques @openapi (schemas reutilizables + paths por módulo)
  // viven en src/docs/, separados de src/routes/ y src/controllers/.
  apis: ['./src/docs/*.docs.js'],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Monta Swagger UI en /api/docs. Se llama una única vez desde app.js.
 * @param {import('express').Express} app
 */
export function setupSwagger(app) {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Ruvika API - Documentación',
    })
  );
}

export default swaggerSpec;
