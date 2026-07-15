import userService from '../services/user.service.js';

export async function getAll(req, res, next) {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.uid);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await userService.deleteUser(req.params.uid);
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    next(error);
  }
}
