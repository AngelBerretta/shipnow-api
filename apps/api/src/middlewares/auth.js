import userRepository from '../repositories/user.repository.js';
import { verifyAccessToken } from '../utils/token.js';
import { UnauthorizedError, ForbiddenActionError } from '../errors/index.js';

/**
 * Exige `Authorization: Bearer <accessToken>` y deja el usuario actual en
 * `req.user`. El usuario se lee de la base en cada request (no se confia
 * solo en el token), asi que una baja logica o un cambio de rol rigen
 * al instante.
 */
export async function authenticate(req, _res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedError('Falta el token de acceso (Authorization: Bearer <token>)');
    }

    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);
    if (!user || user.isActive === false) {
      throw new UnauthorizedError('La cuenta ya no esta disponible');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/** Solo deja pasar a los roles indicados. Va SIEMPRE despues de `authenticate`. */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenActionError('No tenes permisos para realizar esta accion'));
    }
    return next();
  };

/**
 * Deja pasar a los roles indicados, o al usuario que es "dueño" del recurso
 * (su `_id` coincide con `req.params[param]`). Para rutas /users/:uid.
 */
export const authorizeSelfOr =
  (param, ...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (roles.includes(req.user.role) || String(req.user._id) === req.params[param]) {
      return next();
    }
    return next(new ForbiddenActionError('Solo podes acceder a tu propio perfil'));
  };