import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DeliveryStatus } from '../lib/types';

interface Base {
  id?: number;
  userId: string;
  createdAt: number;
}

/** Acciones que el repartidor hizo y todavía no llegaron al servidor. */
export type QueuedAction =
  | (Base & { type: 'status'; deliveryId: string; status: DeliveryStatus })
  | (Base & { type: 'proof'; deliveryId: string; blob: Blob; filename: string; mimeType: string })
  | (Base & { type: 'availability'; isAvailable: boolean });

interface RuvikaDB extends DBSchema {
  queue: { key: number; value: QueuedAction; indexes: { 'by-user': string } };
  cache: { key: string; value: { key: string; data: unknown; savedAt: number } };
}

let dbPromise: Promise<IDBPDatabase<RuvikaDB>> | null = null;

export const getDb = () =>
  (dbPromise ??= openDB<RuvikaDB>('ruvika-driver', 1, {
    upgrade(db) {
      const queue = db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      queue.createIndex('by-user', 'userId');
      db.createObjectStore('cache', { keyPath: 'key' });
    },
  }));