import { getDb, type QueuedAction } from './db';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type NewAction = DistributiveOmit<QueuedAction, 'id' | 'createdAt'>;
/** Lo que pasan las pantallas: el userId lo agrega el SyncProvider. */
export type DraftAction = DistributiveOmit<NewAction, 'userId'>;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function enqueue(action: NewAction) {
  const db = await getDb();
  const entry = { ...action, createdAt: Date.now() } as QueuedAction;

  if (action.type === 'availability') {
    // Del interruptor solo importa el último valor: se descartan los anteriores sin enviar.
    const tx = db.transaction('queue', 'readwrite');
    for (const old of await tx.store.index('by-user').getAll(action.userId)) {
      if (old.type === 'availability') await tx.store.delete(old.id!);
    }
    await tx.store.add(entry);
    await tx.done;
  } else {
    await db.add('queue', entry);
  }
  notify();
}

/** Pendientes de un usuario, en el orden en que se hicieron. */
export async function listPending(userId: string): Promise<QueuedAction[]> {
  const db = await getDb();
  const items = await db.getAllFromIndex('queue', 'by-user', userId);
  return items.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

export async function removeAction(id: number) {
  await (await getDb()).delete('queue', id);
  notify();
}