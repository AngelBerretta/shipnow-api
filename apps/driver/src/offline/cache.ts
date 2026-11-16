import { getDb } from './db';

// IndexedDB puede no estar disponible (modo privado de algunos navegadores): el caché es
// una mejora, nunca debe romper la app.
export async function saveCache(key: string, data: unknown) {
  try {
    await (await getDb()).put('cache', { key, data, savedAt: Date.now() });
  } catch {
    /* sin caché */
  }
}

export async function loadCache<T>(key: string): Promise<T | undefined> {
  try {
    const row = await (await getDb()).get('cache', key);
    return row?.data as T | undefined;
  } catch {
    return undefined;
  }
}

export async function clearCache() {
  try {
    await (await getDb()).clear('cache');
  } catch {
    /* sin caché */
  }
}