import express from 'express';
import cors from 'cors';
import compression from 'compression';

import usersRouter from './routes/users.routes.js';
import ordersRouter from './routes/orders.routes.js';
import deliveriesRouter from './routes/deliveries.routes.js';
import productsRouter from './routes/products.routes.js';
import mocksRouter from './routes/mocks.routes.js';
import logsRouter from './routes/logs.routes.js';
import healthRouter from './routes/health.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { setupSwagger } from './config/swagger.config.js';
import config from './config/index.js';
import logger from './config/logger.config.js';

const app = express();

// CORS_ORIGIN por env (default "*" en desarrollo). En produccion se
// espera que apunte al dominio real del frontend, no a "*".
app.use(cors({ origin: config.corsOrigin }));

// Comprime las respuestas (gzip) antes de enviarlas: los listados de
// pedidos/usuarios/entregas con populate pueden ser pesados, y esto
// reduce el payload real en la red sin cambiar el body que recibe el
// cliente.
app.use(compression());

// Limite explicito de tamaño de body: evita que un JSON gigantesco
// (accidental o intencional) consuma memoria del proceso antes de
// llegar a ninguna validacion de negocio. Los uploads de archivos van
// por multipart/form-data (Multer), no por aca (ver multer.config.js).
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check: SIEMPRE disponible, en cualquier entorno (incluida
// produccion). No requiere base de datos ni expone informacion sensible.
app.use('/api/health', healthRouter);

/**
 * Endpoints internos: Swagger UI (/api/docs), generacion de datos de
 * prueba (/api/mocks) y el endpoint de testing del logger (/api/logs).
 *
 * Criterio aplicado: en `development` y `test` quedan siempre montados
 * (son herramientas de trabajo diario del equipo). En `production` se
 * DESACTIVAN por defecto: no son funcionalidad de negocio real de
 * ShipNow, y en particular /api/mocks puede escribir datos falsos en la
 * base de produccion si alguien lo llama por error. Se pueden reactivar
 * explicitamente en un ambiente productivo (ej. staging) con la
 * variable de entorno ENABLE_INTERNAL_ROUTES=true.
 */
const shouldExposeInternalRoutes = !config.isProduction || config.enableInternalRoutes;

if (shouldExposeInternalRoutes) {
  setupSwagger(app);
  app.use('/api/mocks', mocksRouter);
  app.use('/api/logs', logsRouter);
} else {
  logger.info('Rutas internas (Swagger, /api/mocks, /api/logs) deshabilitadas en produccion.');
}

// Rutas de negocio de la API
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/products', productsRouter);

// 404 para rutas no definidas
app.use(notFoundHandler);

// Manejador central de errores (siempre al final)
app.use(errorHandler);

export default app;
