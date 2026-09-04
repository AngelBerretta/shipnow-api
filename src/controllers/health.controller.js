import config from '../config/index.js';

/**
 * health.controller.js
 *
 * Health check simple para orquestadores/monitoreo (healthcheck de
 * Docker, balanceadores, uptime checks externos). A propósito NO expone
 * nada sensible: ni la URI de Mongo, ni detalle de la conexión, ni
 * secretos, ni stack traces. Solo lo mínimo para saber "el proceso está
 * vivo y respondiendo". Disponible en cualquier entorno (incluida
 * producción), a diferencia de los endpoints internos (ver app.js).
 */
export function getHealth(req, res) {
  res.status(200).json({
    status: 'ok',
    environment: config.nodeEnv,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
