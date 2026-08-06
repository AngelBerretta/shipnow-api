import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';
import config from './env.config.js';

const LOGS_DIR = path.resolve('logs');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const LOG_LEVELS = {
  fatal: 0,
  error: 1,
  warning: 2,
  info: 3,
  http: 4,
  debug: 5,
};

const LOG_COLORS = {
  fatal: 'red bold',
  error: 'red',
  warning: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Mapa propio de codigos ANSI, aplicado manualmente DESPUES de calcular
// el padding sobre texto plano (ver buildLevelTag). Reemplaza al uso de
// winston.format.colorize(), que rompe el padding porque cuenta los
// codigos de color como caracteres visibles.
const ANSI_RESET = '\x1b[0m';
const LEVEL_ANSI_CODES = {
  fatal: '\x1b[1m\x1b[31m',
  error: '\x1b[31m',
  warning: '\x1b[33m',
  info: '\x1b[32m',
  http: '\x1b[35m',
  debug: '\x1b[34m',
};

function buildLevelTag(level) {
  return `[${level}]`.padEnd(10);
}

const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const levelTag = buildLevelTag(level);
    return stack
      ? `${timestamp} ${levelTag}${message}\n${stack}`
      : `${timestamp} ${levelTag}${message}`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const levelTag = buildLevelTag(level);
    const color = LEVEL_ANSI_CODES[level] || '';
    const coloredTag = color ? `${color}${levelTag}${ANSI_RESET}` : levelTag;
    return stack
      ? `${timestamp} ${coloredTag}${message}\n${stack}`
      : `${timestamp} ${coloredTag}${message}`;
  })
);

/**
 * Transporte rotativo para errores (solo "error" y "fatal").
 * Un archivo nuevo por dia; si un mismo dia supera 20MB, rota igual.
 * Se conservan 30 dias de historial; los mas viejos se comprimen a
 * .gz al rotar y se borran automaticamente al superar la retencion.
 */
const errorRotateTransport = new DailyRotateFile({
  level: 'error',
  dirname: LOGS_DIR,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: baseFormat,
});

/**
 * Transporte rotativo para el log combinado (todos los niveles que
 * pasen el filtro del entorno). Retencion mas corta (14 dias): es mas
 * verboso y de menor valor a largo plazo que el log de errores.
 */
const combinedRotateTransport = new DailyRotateFile({
  dirname: LOGS_DIR,
  filename: 'combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: baseFormat,
});

function resolveLevel() {
  const env = config.nodeEnv || 'development';
  const levels = {
    development: 'debug',
    production: 'info',
    test: 'warning',
  };
  return levels[env] || 'info';
}

const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: resolveLevel(),
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    errorRotateTransport,
    combinedRotateTransport,
  ],
  exitOnError: false,
});

// Deja registro de cada rotacion real (por fecha o por tamaño), util
// para auditar el ciclo de vida de los archivos sin ir al filesystem.
errorRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info(`Rotacion de logs/error: ${path.basename(oldFilename)} -> ${path.basename(newFilename)}`);
});
combinedRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info(`Rotacion de logs/combined: ${path.basename(oldFilename)} -> ${path.basename(newFilename)}`);
});

export default logger;