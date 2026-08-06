// Punto de entrada unico de la capa de configuracion.
// Permite importar la config como `import config from '../config/index.js'`
// o directamente desde `env.config.js`. La logica de validacion vive
// exclusivamente en env.config.js.
export { default } from './env.config.js';

// Logger centralizado de Winston. El resto de la app lo importa desde
// aca (o directamente desde `logger.config.js`) en vez de crear
// instancias propias de winston.createLogger().
export { default as logger } from './logger.config.js';
