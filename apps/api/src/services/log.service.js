import logger from '../config/logger.config.js';

/**
 * LogService
 *
 * Servicio exclusivamente de testing/observabilidad, no de negocio.
 * Dispara un mensaje de ejemplo en cada uno de los 6 niveles definidos
 * en logger.config.js, para poder verificar de un vistazo que la
 * configuracion completa (consola + archivos + rotacion + filtro por
 * entorno) esta funcionando como se espera.
 *
 * No accede a ningun Repository ni Model: no hay estado de negocio
 * involucrado.
 */
class LogService {
  runLoggerTest() {
    const timestamp = new Date().toISOString();

    logger.debug(`[TEST] Nivel debug - detalle interno de desarrollo (${timestamp})`);
    logger.http(`[TEST] Nivel http - ejemplo de trafico HTTP (${timestamp})`);
    logger.info(`[TEST] Nivel info - evento informativo normal (${timestamp})`);
    logger.warning(`[TEST] Nivel warning - situacion inesperada pero no critica (${timestamp})`);
    logger.error(`[TEST] Nivel error - fallo controlado del servidor (${timestamp})`);
    // No se llama a process.exit() a proposito: este endpoint es de
    // testing, y tumbar el servidor en cada prueba lo haria inutilizable.
    logger.fatal(`[TEST] Nivel fatal - simulacion de falla critica, sin terminar el proceso (${timestamp})`);

    return {
      levelsTriggered: ['debug', 'http', 'info', 'warning', 'error', 'fatal'],
      timestamp,
    };
  }
}

export default new LogService();