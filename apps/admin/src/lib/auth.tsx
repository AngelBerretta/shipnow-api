import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ROLES } from '@ruvika/shared';
import { clearSession, getStoredRefreshToken, login as apiLogin, logout as apiLogout, refreshSession, setSessionLostHandler } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(getStoredRefreshToken()));

  const dropSession = useCallback(() => {
    clearSession();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setSessionLostHandler(dropSession);
    if (!getStoredRefreshToken()) return;
    refreshSession()
      .then((session) => (session.user.role === ROLES.ADMIN ? setUser(session.user) : dropSession()))
      .catch(dropSession)
      .finally(() => setLoading(false));
  }, [dropSession]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const session = await apiLogin(email, password);
        // Este panel es solo para administradores: el resto de los roles tiene sus propias apps.
        if (session.user.role !== ROLES.ADMIN) {
          await apiLogout();
          throw new Error('Este panel es solo para administradores.');
        }
        setUser(session.user);
      },
      async logout() {
        await apiLogout();
        dropSession();
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
