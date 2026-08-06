import logService from '../services/log.service.js';

/**
 * LogController
 * Endpoint de testing interno: no representa una funcionalidad de
 * negocio de ShipNow. Su unico proposito es permitir verificar
 * rapidamente, desde afuera, que el logger esta correctamente
 * configurado (niveles, formato, consola, archivos y rotacion).
 */
export async function testLogger(req, res, next) {
  try {
    const result = logService.runLoggerTest();
    res.json({
      message: 'Prueba de logger ejecutada. Revisa la consola y los archivos en /logs.',
      note: 'El nivel "fatal" se registro sin detener el servidor, unicamente con fines de prueba.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}