import mongoose from 'mongoose';

import app from './app.js';
import config from './config/index.js';
import logger from './config/logger.config.js';

mongoose
  .connect(config.mongoUri)
  .then(() => {
    logger.info('Conexión a MongoDB establecida');
    app.listen(config.port, () => {
      logger.info(`Servidor ShipNow escuchando en el puerto ${config.port} [${config.nodeEnv}]`);
    });
  })
  .catch((error) => {
    // Fallo critico de arranque: la app no puede funcionar sin base de
    // datos. Es el unico punto de todo el proyecto donde se usa el
    // nivel "fatal", justamente porque el proceso termina a continuacion.
    logger.fatal(`No se pudo conectar a MongoDB. La aplicacion no puede arrancar: ${error.message}`, {
      stack: error.stack,
    });
    process.exit(1);
  });

// Red de seguridad: si algo escapa a todo el manejo de errores de
// Express (por ejemplo, una excepcion sincrona fuera de un request, o
// una promesa rechazada sin catch en algun lugar del codigo), se
// registra como fallo critico antes de que Node mate el proceso.
process.on('uncaughtException', (error) => {
  logger.fatal(`Excepcion no capturada: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal(`Promesa rechazada sin manejar: ${reason}`, {
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});