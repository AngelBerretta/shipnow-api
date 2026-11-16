import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ROLES } from '@ruvika/shared';
import {
  clearSession,
  getCachedUser,
  getStoredRefreshToken,
  isNetworkError,
  login as apiLogin,
  logout as apiLogout,
  refreshSession,
  setSessionLostHandler,
  storeCachedUser,
} from './api';
import { clearCache } from '../offline/cache';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  patchUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(getStoredRefreshToken()));

  // Cierra la sesión y borra los datos cacheados (el celular puede ser compartido).
  // La cola de cambios pendientes NO se borra: se envía cuando vuelva a entrar el mismo usuario.
  const dropSession = useCallback(() => {
    clearSession();
    setUser(null);
    queryClient.clear();
    void clearCache();
  }, [queryClient]);

  useEffect(() => {
    setSessionLostHandler(dropSession);
    if (!getStoredRefreshToken()) return;

    // Arranque offline-first: si hay un perfil guardado se entra de inmediato y la sesión
    // se valida en segundo plano (la API gratuita puede tardar un minuto en despertar).
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setLoading(false);
    }

    refreshSession()
      .then((session) => (session.user.role === ROLES.DRIVER ? setUser(session.user) : dropSession()))
      .catch((error) => {
        if (!isNetworkError(error)) dropSession();
      })
      .finally(() => setLoading(false));
  }, [dropSession]);

  useEffect(() => {
    if (user) storeCachedUser(user);
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const session = await apiLogin(email, password);
        // Esta app es solo para repartidores: el resto de los roles tiene sus propias apps.
        if (session.user.role !== ROLES.DRIVER) {
          await apiLogout();
          throw new Error('Esta app es solo para repartidores.');
        }
        setUser(session.user);
      },
      async logout() {
        await apiLogout();
        dropSession();
      },
      patchUser(patch) {
        setUser((prev) => (prev ? { ...prev, ...patch } : prev));
      },
    }),
    [user, loading, dropSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}