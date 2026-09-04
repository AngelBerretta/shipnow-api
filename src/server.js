import mongoose from 'mongoose';

import app from './app.js';
import config from './config/index.js';
import logger from './config/logger.config.js';

let httpServer;

mongoose
  .connect(config.mongoUri)
  .then(() => {
    logger.info('Conexión a MongoDB establecida');
    httpServer = app.listen(config.port, () => {
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

/**
 * Apagado ordenado (graceful shutdown).
 *
 * Docker envia SIGTERM al contenedor al hacer `docker stop` (y despues
 * de un tiempo de gracia, SIGKILL si el proceso no termino solo). Sin
 * este handler, Node corta las conexiones HTTP en curso de golpe. Con
 * el: se deja de aceptar conexiones nuevas, se espera a que las
 * peticiones en vuelo terminen, y recien despues se cierra la conexion
 * a Mongo y el proceso.
 */
function gracefulShutdown(signal) {
  logger.info(`${signal} recibido: iniciando apagado ordenado...`);

  if (!httpServer) {
    process.exit(0);
    return;
  }

  httpServer.close(async () => {
    try {
      await mongoose.connection.close();
      logger.info('Servidor y conexion a MongoDB cerrados correctamente.');
      process.exit(0);
    } catch (error) {
      logger.error(`Error cerrando la conexion a MongoDB: ${error.message}`);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
