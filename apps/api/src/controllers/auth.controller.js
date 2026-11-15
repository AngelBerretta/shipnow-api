import authService from '../services/auth.service.js';

export async function login(req, res, next) {
  try {
    res.json(await authService.login(req.body));
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    res.json(await authService.refresh(req.body));
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logout(req.body);
    res.json({ message: 'Sesion cerrada' });
  } catch (error) {
    next(error);
  }
}

/** `req.user` ya lo cargo `authenticate` (sin password). */
export function me(req, res) {
  res.json(req.user);
}