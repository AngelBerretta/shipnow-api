import userRepository from '../repositories/user.repository.js';
import { ROLES } from '../constants/index.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';
import {
  UserNotFoundError,
  ValidationError,
  InvalidRoleError,
  ForbiddenActionError,
  DuplicateEmailError,
} from '../errors/index.js';

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

  async createUser({ firstName, lastName, email, password, role }) {
    if (!firstName || !lastName || !email || !password) {
      throw new ValidationError('Faltan datos obligatorios (firstName, lastName, email, password)');
    }

    if (role && !Object.values(ROLES).includes(role)) {
      throw new InvalidRoleError(role, Object.values(ROLES));
    }

    // Regla de negocio: el rol ADMIN no puede otorgarse via alta publica.
    if (role === ROLES.ADMIN) {
      throw new ForbiddenActionError('No puedes crear un usuario con rol admin');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new DuplicateEmailError(email);
    }

    return userRepository.create({
      firstName,
      lastName,
      email,
      password,
      role: role || ROLES.CUSTOMER,
    });
  }

  async deleteUser(id) {
    const deleted = await userRepository.deleteById(id);
    if (!deleted) {
      throw new UserNotFoundError();
    }
    return deleted;
  }
}

export default new UserService();
