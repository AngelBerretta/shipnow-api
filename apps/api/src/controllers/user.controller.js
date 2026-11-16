import userService from '../services/user.service.js';

export async function getAll(req, res, next) {
  try {
    const result = await userService.getAllUsers(req.query);
    res.json(result);
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

export async function update(req, res, next) {
  try {
    res.json(await userService.updateUser(req.params.uid, req.body, req.user));
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await userService.deleteUser(req.params.uid, req.user);
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    next(error);
  }
}

export async function setAvailability(req, res, next) {
  try {
    res.json(await userService.setAvailability(req.user, req.body));
  } catch (error) {
    next(error);
  }
}
