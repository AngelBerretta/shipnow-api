import dotenv from 'dotenv';

dotenv.config();

/**
 * Variables de entorno criticas sin las cuales la aplicacion no puede
 * arrancar de forma segura. Son las UNICAS que detienen el arranque si
 * faltan.
 *
 * JWT_SECRET no esta en esta lista porque esta version de la API todavia
 * no implementa autenticacion (ver swagger.config.js: "esta version de
 * la API no implementa autenticacion ni autorizacion por token"). El dia
 * que se agregue login/JWT, JWT_SECRET debe sumarse aca.
 */
const REQUIRED_ENV_VARS = ['PORT', 'MONGODB_URI', 'NODE_ENV'];

const VALID_NODE_ENVS = ['development', 'production', 'test'];

/**
 * Valida que todas las variables criticas esten presentes y que las que
 * tienen forma conocida (NODE_ENV, PORT) tengan un valor valido. Si algo
 * falla, lanza un error descriptivo y detiene el arranque de la
 * aplicacion antes de que intente conectarse a la base de datos o
 * levantar el servidor.
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
}

validateEnv();

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

  // Reservado para cuando se agregue autenticación con JWT.
  jwtSecret: process.env.JWT_SECRET || null,

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
});

export default config;
