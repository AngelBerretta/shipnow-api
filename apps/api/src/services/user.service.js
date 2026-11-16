import userRepository from '../repositories/user.repository.js';
import { ROLES } from '../constants/index.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import { hashPassword } from '../utils/password.js';
import {
  UserNotFoundError,
  ValidationError,
  InvalidRoleError,
  ForbiddenActionError,
  DuplicateEmailError,
} from '../errors/index.js';
import { parseOrThrow } from '../validators/auth.validator.js';
import { updateUserSchema, availabilitySchema } from '../validators/user.validator.js';

class UserService {
  /**
   * Listado paginado de usuarios. Nunca devuelve la colección completa
   * sin control: si no se especifica `page`/`limit` por query string, se
   * aplican los defaults de utils/pagination.js (page=1, limit=20, tope
   * 100). Admite filtrar por `role` (?role=driver).
   */
  async getAllUsers(query = {}) {
    const pagination = parsePagination(query);
    const filter = {};
    if (query.role) {
      if (!Object.values(ROLES).includes(query.role)) {
        throw new InvalidRoleError(query.role, Object.values(ROLES));
      }
      filter.role = query.role;
    }

    const [users, total] = await Promise.all([
      userRepository.findAll(filter, { skip: pagination.skip, limit: pagination.limit }),
      userRepository.countAll(filter),
    ]);

    return { data: users, pagination: buildPaginationMeta(pagination, total) };
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }

  /**
   * Alta publica de usuarios (POST /api/users). El rol `admin` NO puede
   * otorgarse por esta via; para crear el primer administrador existe
   * `createAdminUser`, usado unicamente por `npm run seed:admin`.
   */
  async createUser({ firstName, lastName, email, password, role }) {
    this.#assertRequiredFields({ firstName, lastName, email, password });

    if (role && !Object.values(ROLES).includes(role)) {
      throw new InvalidRoleError(role, Object.values(ROLES));
    }

    // Regla de negocio: el rol ADMIN no puede otorgarse via alta publica.
    if (role === ROLES.ADMIN) {
      throw new ForbiddenActionError('No puedes crear un usuario con rol admin');
    }

    return this.#persistUser({ firstName, lastName, email, password, role: role || ROLES.CUSTOMER });
  }

  /**
   * Crea un usuario con rol `admin`. A proposito NO esta expuesto por
   * ningun Controller ni ruta: solo lo llama el script `seed:admin`
   * (scripts/seed-admin.js), que es la unica forma de crear el primer
   * administrador sin abrir una puerta publica.
   */
  async createAdminUser({ firstName, lastName, email, password }) {
    this.#assertRequiredFields({ firstName, lastName, email, password });
    return this.#persistUser({ firstName, lastName, email, password, role: ROLES.ADMIN });
  }

  /**
   * Edicion parcial (PATCH /api/users/:uid). No se otorga el rol admin, no se
   * cambia el rol de un admin ni el propio, y un admin no se desactiva a si mismo.
   */
  async updateUser(id, body, actor) {
    const { firstName, lastName, password, isActive, role } = parseOrThrow(updateUserSchema, body);

    const user = await userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }
    const isSelf = Boolean(actor) && String(actor._id) === String(id);
    const data = {};

    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;

    if (isActive !== undefined && isActive !== user.isActive) {
      if (isSelf) {
        throw new ForbiddenActionError('No podes desactivar tu propia cuenta');
      }
      data.isActive = isActive;
    }

    if (role !== undefined && role !== user.role) {
      if (!Object.values(ROLES).includes(role)) {
        throw new InvalidRoleError(role, Object.values(ROLES));
      }
      if (role === ROLES.ADMIN) {
        throw new ForbiddenActionError('No puedes otorgar el rol admin');
      }
      if (user.role === ROLES.ADMIN || isSelf) {
        throw new ForbiddenActionError('No se puede cambiar el rol de un administrador');
      }
      data.role = role;
    }

    if (password !== undefined) data.password = await hashPassword(password);

    if (Object.keys(data).length === 0) {
      return user;
    }
    return userRepository.updateById(id, data);
  }

  /** El repartidor autenticado marca si esta disponible para recibir entregas nuevas. */
  async setAvailability(actor, body) {
    const { isAvailable } = parseOrThrow(availabilitySchema, body);
    return userRepository.updateById(actor._id, { isAvailable });
  }

  async deleteUser(id, actor) {
    if (actor && String(actor._id) === String(id)) {
      throw new ForbiddenActionError('No podes eliminar tu propia cuenta');
    }
    const deleted = await userRepository.deleteById(id);
    if (!deleted) {
      throw new UserNotFoundError();
    }
    return deleted;
  }

  #assertRequiredFields({ firstName, lastName, email, password }) {
    if (!firstName || !lastName || !email || !password) {
      throw new ValidationError('Faltan datos obligatorios (firstName, lastName, email, password)');
    }
    if (typeof password !== 'string') {
      throw new ValidationError('La contrasena debe ser un texto');
    }
  }

  /**
   * Unico punto por el que un usuario llega a la base: verifica email
   * duplicado y guarda SIEMPRE el hash de la contrasena, nunca el texto
   * plano.
   */
  async #persistUser({ firstName, lastName, email, password, role }) {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new DuplicateEmailError(email);
    }

    return userRepository.create({
      firstName,
      lastName,
      email,
      password: await hashPassword(password),
      role,
    });
  }
}

export default new UserService();
