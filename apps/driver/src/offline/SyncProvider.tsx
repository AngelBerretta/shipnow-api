import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import type { QueuedAction } from './db';
import { enqueue, listPending, subscribe, type DraftAction, type NewAction } from './queue';
import { syncQueue } from './sync';

interface SyncState {
  pending: QueuedAction[];
  syncing: boolean;
  /** Cambios que el servidor rechazó (la entrega ya había cambiado). */
  dropped: number;
  clearDropped: () => void;
  syncNow: () => Promise<void>;
  queueAction: (action: DraftAction) => Promise<void>;
}

const SyncContext = createContext<SyncState | null>(null);

const RETRY_MS = 30_000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?._id;
  const [pending, setPending] = useState<QueuedAction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [dropped, setDropped] = useState(0);

  const refreshPending = useCallback(async () => {
    setPending(userId ? await listPending(userId) : []);
  }, [userId]);

  useEffect(() => {
    void refreshPending();
    return subscribe(() => void refreshPending());
  }, [refreshPending]);

  const syncNow = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const result = await syncQueue(userId);
      if (result.dropped > 0) setDropped((count) => count + result.dropped);
      if (result.sent + result.dropped > 0) await queryClient.invalidateQueries();
    } finally {
      setSyncing(false);
    }
  }, [userId, queryClient]);

  // Background Sync no existe en iOS: se reintenta al abrir, al volver la conexión
  // y al volver a primer plano.
  useEffect(() => {
    if (!userId) return;
    void syncNow();
    const onOnline = () => void syncNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, syncNow]);

  // "online" no cubre wifi sin internet ni el arranque en frío de la API: mientras haya
  // pendientes, se reintenta cada 30 s.
  useEffect(() => {
    if (pending.length === 0) return;
    const timer = setInterval(() => void syncNow(), RETRY_MS);
    return () => clearInterval(timer);
  }, [pending.length, syncNow]);

  const queueAction = useCallback(
    async (action: DraftAction) => {
      if (!userId) return;
      await enqueue({ ...action, userId } as NewAction);
      if (navigator.onLine) void syncNow();
    },
    [userId, syncNow],
  );

  const value = useMemo<SyncState>(
    () => ({ pending, syncing, dropped, clearDropped: () => setDropped(0), syncNow, queueAction }),
    [pending, syncing, dropped, syncNow, queueAction],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync debe usarse dentro de <SyncProvider>');
  return ctx;
}