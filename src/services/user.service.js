import userRepository from '../repositories/user.repository.js';
import { ROLES } from '../constants/index.js';
import {
  UserNotFoundError,
  ValidationError,
  InvalidRoleError,
  ForbiddenActionError,
  DuplicateEmailError,
} from '../errors/index.js';

class UserService {
  async getAllUsers() {
    return userRepository.findAll();
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
