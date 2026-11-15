import userRepository from '../repositories/user.repository.js';
import refreshTokenRepository from '../repositories/refreshToken.repository.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signAccessToken, generateRefreshToken, generateTokenFamily, hashToken } from '../utils/token.js';
import { loginSchema, refreshSchema, parseOrThrow } from '../validators/auth.validator.js';
import config from '../config/env.config.js';
import logger from '../config/logger.config.js';
import {
  InvalidCredentialsError,
  UnauthorizedError,
  TokenExpiredError,
  ForbiddenActionError,
} from '../errors/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Si el email no existe igual se corre bcrypt contra este hash, para que el
// tiempo de respuesta no delate que emails estan registrados.
let dummyHash;
const getDummyHash = () => (dummyHash ??= hashPassword('ruvika-dummy-password'));

class AuthService {
  async login(body) {
    const { email, password } = parseOrThrow(loginSchema, body);

    const user = await userRepository.findAuthByEmail(email);
    const passwordMatches = await comparePassword(password, user?.password ?? (await getDummyHash()));
    if (!user || !passwordMatches) {
      throw new InvalidCredentialsError();
    }
    // Recien con la contrasena verificada se avisa que la cuenta esta baja.
    if (user.isActive === false) {
      throw new ForbiddenActionError('La cuenta esta desactivada');
    }

    logger.info(`Login correcto: ${user.email} (${user.role})`);
    return this.#openSession(user, generateTokenFamily());
  }

  /** Rotacion: el refresh token usado se invalida y se emite uno nuevo de la misma sesion. */
  async refresh(body) {
    const { refreshToken } = parseOrThrow(refreshSchema, body);
    const tokenHash = hashToken(refreshToken);

    const current = await refreshTokenRepository.consume(tokenHash);
    if (!current) {
      return this.#rejectRefresh(tokenHash);
    }

    const user = await userRepository.findById(current.user);
    if (!user || user.isActive === false) {
      await refreshTokenRepository.revokeFamily(current.family);
      throw new UnauthorizedError('La cuenta ya no esta disponible');
    }

    return this.#openSession(user, current.family);
  }

  /** Cierra la sesion (toda la familia de tokens). Es idempotente: un token desconocido no es error. */
  async logout(body) {
    const { refreshToken } = parseOrThrow(refreshSchema, body);
    const existing = await refreshTokenRepository.findByHash(hashToken(refreshToken));
    if (existing) {
      await refreshTokenRepository.revokeFamily(existing.family);
    }
  }

  async #openSession(user, family) {
    const refreshToken = generateRefreshToken();
    await refreshTokenRepository.create({
      user: user._id,
      family,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + config.auth.refreshTokenTtlDays * DAY_MS),
    });

    const plain = typeof user.toObject === 'function' ? user.toObject() : user;
    const { password, ...safeUser } = plain;

    return {
      tokenType: 'Bearer',
      accessToken: signAccessToken(user),
      expiresIn: config.auth.accessTokenTtlSeconds,
      refreshToken,
      user: safeUser,
    };
  }

  async #rejectRefresh(tokenHash) {
    const existing = await refreshTokenRepository.findByHash(tokenHash);

    if (existing?.revokedAt) {
      // Un token ya rotado/revocado volvio a usarse: puede estar robado.
      await refreshTokenRepository.revokeFamily(existing.family);
      logger.warning(`Reuso de refresh token detectado (usuario ${existing.user}): sesion revocada`);
      throw new UnauthorizedError('Refresh token invalido: la sesion fue cerrada');
    }
    if (existing) {
      throw new TokenExpiredError('El refresh token expiro: inicia sesion de nuevo');
    }
    throw new UnauthorizedError('Refresh token invalido');
  }
}

export default new AuthService();