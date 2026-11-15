import dotenv from 'dotenv';

dotenv.config();

/**
 * Variables de entorno criticas sin las cuales la aplicacion no puede
 * arrancar de forma segura. Son las UNICAS que detienen el arranque si
 * faltan. JWT_SECRET es obligatoria desde la Etapa 1 (autenticacion).
 */
const REQUIRED_ENV_VARS = ['PORT', 'MONGODB_URI', 'NODE_ENV', 'JWT_SECRET'];

const MIN_JWT_SECRET_LENGTH = 32;

const VALID_NODE_ENVS = ['development', 'production', 'test'];

/** Rango aceptado para el costo (rounds) de bcrypt. Menos de 4 no es valido para bcrypt; mas de 15 vuelve inusable el login. */
const MIN_BCRYPT_ROUNDS = 4;
const MAX_BCRYPT_ROUNDS = 15;
const DEFAULT_BCRYPT_ROUNDS = 10;
/** En tests el hash se abarata (la suite crea decenas de usuarios); no afecta a ningun otro entorno. */
const TEST_BCRYPT_ROUNDS = MIN_BCRYPT_ROUNDS;

/**
 * Valida que todas las variables criticas esten presentes y que las que
 * tienen forma conocida (NODE_ENV, PORT, BCRYPT_ROUNDS) tengan un valor
 * valido. Si algo falla, lanza un error descriptivo y detiene el
 * arranque de la aplicacion antes de que intente conectarse a la base de
 * datos o levantar el servidor.
 */
function validateEnv() {
  const missingVars = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === '';
  });

  if (missingVars.length > 0) {
    throw new Error(
      `[config] Faltan variables de entorno obligatorias: ${missingVars.join(', ')}. ` +
        'Revisa tu archivo .env (podes tomar como referencia .env.example).'
    );
  }

  if (!VALID_NODE_ENVS.includes(process.env.NODE_ENV)) {
    throw new Error(
      `[config] NODE_ENV="${process.env.NODE_ENV}" no es valido. Valores permitidos: ${VALID_NODE_ENVS.join(', ')}.`
    );
  }

  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`[config] PORT="${process.env.PORT}" no es un numero de puerto valido.`);
  }

  if (process.env.JWT_SECRET.trim().length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `[config] JWT_SECRET debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres. ` +
        `Generá uno con: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
    );
  }  

  const rawRounds = process.env.BCRYPT_ROUNDS;
  if (rawRounds !== undefined && rawRounds.trim() !== '') {
    const rounds = Number(rawRounds);
    if (!Number.isInteger(rounds) || rounds < MIN_BCRYPT_ROUNDS || rounds > MAX_BCRYPT_ROUNDS) {
      throw new Error(
        `[config] BCRYPT_ROUNDS="${rawRounds}" no es valido. Debe ser un entero entre ${MIN_BCRYPT_ROUNDS} y ${MAX_BCRYPT_ROUNDS}.`
      );
    }
  }
}

validateEnv();

function resolveBcryptRounds() {
  const rawRounds = process.env.BCRYPT_ROUNDS;
  if (rawRounds !== undefined && rawRounds.trim() !== '') {
    return Number(rawRounds);
  }
  return process.env.NODE_ENV === 'test' ? TEST_BCRYPT_ROUNDS : DEFAULT_BCRYPT_ROUNDS;
}

function readPositiveInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`[config] ${name}="${raw}" no es valido. Debe ser un entero positivo.`);
  }
  return value;
}

/**
 * Objeto de configuracion unico y congelado. Este es el UNICO lugar de
 * la aplicacion que debe leer directamente de `process.env`. El resto
 * del codigo debe importar y usar este objeto.
 *
 * Las claves de abajo que NO estan en REQUIRED_ENV_VARS son opcionales:
 * si no se definen, quedan en `null`/su default y la app arranca igual
 * (ver .env.example para el detalle de cada una).
 */
const config = Object.freeze({
  port: Number(process.env.PORT),
  mongoUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Nivel de log explícito (ver logger.config.js). Si no se define, el
  // logger decide automáticamente según nodeEnv.
  logLevel: process.env.LOG_LEVEL || null,

  // Costo (rounds) de bcrypt para hashear contraseñas (ver utils/password.js).
  bcryptRounds: resolveBcryptRounds(),

  // Autenticacion (Etapa 1).
  jwtSecret: process.env.JWT_SECRET,
  auth: Object.freeze({
    accessTokenTtlSeconds: readPositiveInt('ACCESS_TOKEN_TTL_MINUTES', 15) * 60,
    refreshTokenTtlDays: readPositiveInt('REFRESH_TOKEN_TTL_DAYS', 7),
    rateLimitWindowMinutes: 15,
    // En tests el limite se sube para no interferir con la suite.
    rateLimitMax: readPositiveInt('AUTH_RATE_LIMIT_MAX', process.env.NODE_ENV === 'test' ? 10000 : 20),
  }),

  // Cantidad de proxies delante de la API (Render = 1). Necesario para que
  // el rate limit vea la IP real del cliente y no la del proxy.
  trustProxy: Number(process.env.TRUST_PROXY || 0),

  // Origen(es) permitido(s) por CORS. "*" (todos) por default, pensado
  // para desarrollo; en producción se espera un dominio explícito.
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // URL de un proveedor externo de email. Hoy el envío de confirmación
  // de pedido está SIMULADO con logs (ver order.service.js); se deja
  // preparada la variable para cuando se integre un proveedor real.
  emailServiceUrl: process.env.EMAIL_SERVICE_URL || null,

  // Fuerza a exponer Swagger, /api/mocks y /api/logs/test aunque
  // NODE_ENV sea "production" (ver criterio completo en app.js).
  enableInternalRoutes: process.env.ENABLE_INTERNAL_ROUTES === 'true',

  // Datos del primer administrador, usados UNICAMENTE por el script
  // `npm run seed:admin` (scripts/seed-admin.js). La API en si no los
  // lee. Sin ADMIN_EMAIL / ADMIN_PASSWORD el script se niega a correr:
  // no hay credenciales por defecto en el codigo.
  seedAdmin: Object.freeze({
    email: process.env.ADMIN_EMAIL || null,
    password: process.env.ADMIN_PASSWORD || null,
    firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
    lastName: process.env.ADMIN_LAST_NAME || 'Ruvika',
  }),
});

export default config;
