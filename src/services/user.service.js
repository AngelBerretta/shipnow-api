import userRepository from '../repositories/user.repository.js';
import ApiError from '../utils/ApiError.js';
import { ROLES } from '../constants/index.js';

class UserService {
  async getAllUsers() {
    return userRepository.findAll();
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new ApiError(404, 'Usuario no encontrado');
    }
    return user;
  }

  async createUser({ firstName, lastName, email, password, role }) {
    if (!firstName || !lastName || !email || !password) {
      throw new ApiError(400, 'Faltan datos obligatorios');
    }

    // Regla de negocio: el rol ADMIN no puede otorgarse via alta publica.
    if (role === ROLES.ADMIN) {
      throw new ApiError(403, 'No puedes crear un usuario con rol admin');
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ApiError(409, 'El email ya esta registrado');
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
      throw new ApiError(404, 'Usuario no encontrado');
    }
    return deleted;
  }
}

export default new UserService();
