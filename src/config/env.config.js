import dotenv from 'dotenv';

dotenv.config();

/**
 * Variables de entorno criticas sin las cuales la aplicacion
 * no puede arrancar de forma segura.
 */
const REQUIRED_ENV_VARS = ['PORT', 'MONGODB_URI', 'NODE_ENV'];

/**
 * Valida que todas las variables criticas esten presentes.
 * Si falta alguna, lanza un error descriptivo y detiene el arranque
 * de la aplicacion antes de que intente conectarse a la base de datos
 * o levantar el servidor.
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
}

validateEnv();

/**
 * Objeto de configuracion unico y congelado. Este es el UNICO lugar
 * de la aplicacion que debe leer directamente de `process.env`.
 * El resto del codigo debe importar y usar este objeto.
 */
const config = Object.freeze({
  port: Number(process.env.PORT),
  mongoUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === 'production',
});

export default config;
