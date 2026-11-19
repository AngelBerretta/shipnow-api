import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken, refreshSession } from './api';
import type { LivePosition } from './types';

// Vacío = mismo origen (dev). En producción: la URL de la API (Pages Functions no sirve para WebSocket).
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL ?? '').replace(/\/$/, '') || window.location.origin;

/** Posiciones en vivo. `onUpdate` y `onState` tienen que ser estables (useCallback / setState). */
export function useLiveSocket(onUpdate: (position: LivePosition) => void, onState?: (connected: boolean) => void) {
  useEffect(() => {
    // El token se lee en cada (re)conexión: nunca se envía uno vencido.
    const socket = io(SOCKET_URL, { auth: (cb) => cb({ token: getAccessToken() }), transports: ['websocket'] });
    let retry: ReturnType<typeof setTimeout> | undefined;

    // El servidor corta el socket cuando vence el token (o lo rechaza): se renueva la sesión y se reconecta.
    const reauthenticate = () => {
      clearTimeout(retry);
      retry = setTimeout(() => {
        refreshSession()
          .then(() => socket.connect())
          .catch(() => {});
      }, 1500);
    };

    socket.on('connect', () => onState?.(true));
    socket.on('disconnect', (reason) => {
      onState?.(false);
      if (reason === 'io server disconnect') reauthenticate();
    });
    socket.on('connect_error', (error) => {
      onState?.(false);
      if (error.message === 'UNAUTHORIZED' || error.message === 'TOKEN_EXPIRED') reauthenticate();
    });
    socket.on('location:update', onUpdate);

    return () => {
      clearTimeout(retry);
      socket.close();
    };
  }, [onUpdate, onState]);
}