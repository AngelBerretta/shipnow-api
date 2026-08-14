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
    title: 'ShipNow API',
    version: '1.0.0',
    description:
      'API de logística de ShipNow: gestión de usuarios, pedidos, entregas y ' +
      'productos, con un módulo adicional de generación de datos de prueba ' +
      '(mocks) y un endpoint interno de validación del sistema de logging.\n\n' +
      'Arquitectura por capas (Router → Controller → Service → Repository) ' +
      'con manejo centralizado de errores: toda respuesta de error de la API ' +
      'tiene la misma forma (ver el schema `ErrorResponse`).\n\n' +
      '**Autenticación:** esta versión de la API no implementa autenticación ' +
      'ni autorización por token; todos los endpoints son de acceso libre.',
    contact: {
      name: 'ShipNow',
    },
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Servidor local de desarrollo',
    },
  ],
  tags: [
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
      customSiteTitle: 'ShipNow API - Documentación',
    })
  );
}

export default swaggerSpec;
