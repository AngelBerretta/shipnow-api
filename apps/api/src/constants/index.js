/**
 * Las constantes de dominio (roles, estados, prioridades, tipos de
 * documento, maquinas de estados) viven ahora en el paquete compartido
 * `@ruvika/shared` (packages/shared), para que la API y los frontends
 * usen exactamente las mismas.
 *
 * Este archivo se mantiene solo como re-export, asi todos los
 * `import ... from '../constants/index.js'` existentes siguen
 * funcionando sin cambios.
 */
export * from '@ruvika/shared';
