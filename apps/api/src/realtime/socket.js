import { Server } from 'socket.io';
import config from '../config/env.config.js';
import userRepository from '../repositories/user.repository.js';
import deliveryRepository from '../repositories/delivery.repository.js';
import { verifyAccessToken } from '../utils/token.js';
import { canAccessDelivery } from '../policies/access.policy.js';
import { UnauthorizedError } from '../errors/index.js';
import { DELIVERY_STATUS, ROLES } from '../constants/index.js';

let io = null;

/**
 * Socket.IO autenticado con el mismo JWT de acceso (handshake.auth.token). Salas:
 *  - `admins`: todos los admin reciben todas las posiciones.
 *  - `delivery:<id>`: quien tenga acceso a esa entrega (el cliente solo mientras va en camino).
 * El socket se cierra cuando vence el token: el cliente renueva la sesión y reconecta.
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: config.corsOrigins }, serveClient: false });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) throw new UnauthorizedError('Falta el token de acceso');
      const payload = verifyAccessToken(token);
      const user = await userRepository.findById(payload.sub);
      if (!user || user.isActive === false) throw new UnauthorizedError('La cuenta ya no esta disponible');
      socket.data.user = { _id: String(user._id), role: user.role };
      socket.data.expiresAt = payload.exp * 1000;
      next();
    } catch (error) {
      next(new Error(error.code ?? 'UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const actor = socket.data.user;
    if (actor.role === ROLES.ADMIN) socket.join('admins');

    const timer = setTimeout(() => socket.disconnect(true), Math.max(socket.data.expiresAt - Date.now(), 0));
    socket.on('disconnect', () => clearTimeout(timer));

    socket.on('delivery:subscribe', async (deliveryId, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const delivery = await deliveryRepository.findById(String(deliveryId));
        const allowed =
          delivery &&
          canAccessDelivery(actor, delivery) &&
          (actor.role === ROLES.ADMIN || actor.role === ROLES.DRIVER || delivery.status === DELIVERY_STATUS.IN_TRANSIT);
        if (!allowed) return reply({ ok: false, error: 'FORBIDDEN' });
        await socket.join(`delivery:${delivery._id}`);
        return reply({ ok: true });
      } catch {
        return reply({ ok: false, error: 'INVALID' });
      }
    });
  });
  return io;
}

/** No hace nada si el socket no está iniciado (tests de REST, scripts). */
export function emitLocation(payload) {
  io?.to('admins').to(`delivery:${payload.deliveryId}`).emit('location:update', payload);
}

export function disconnectAllSockets() {
  io?.disconnectSockets(true);
}

export async function closeSocket() {
  if (!io) return;
  const server = io;
  io = null;
  await server.close();
}