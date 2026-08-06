import express from 'express';
import cors from 'cors';

import usersRouter from './routes/users.routes.js';
import ordersRouter from './routes/orders.routes.js';
import deliveriesRouter from './routes/deliveries.routes.js';
import productsRouter from './routes/products.routes.js';
import mocksRouter from './routes/mocks.routes.js';
import logsRouter from './routes/logs.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas de la API
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/mocks', mocksRouter);
// Endpoint de testing interno del sistema de logging (no es negocio real)
app.use('/api/logs', logsRouter);

// 404 para rutas no definidas
app.use(notFoundHandler);

// Manejador central de errores (siempre al final)
app.use(errorHandler);

export default app;
