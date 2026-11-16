import { useQuery } from '@tanstack/react-query';
import { loadCache, saveCache } from '../offline/cache';
import { api, isNetworkError, type Query } from './api';
import { useAuth } from './auth';

/**
 * GET con caché offline: cada respuesta buena se guarda en IndexedDB (por usuario) y, si la
 * red falla, se devuelve la última copia guardada en vez de un error.
 */
export function useApiQuery<T>(
  key: readonly unknown[],
  path: string,
  query?: Query,
  options: { refetchInterval?: number } = {},
) {
  const { user } = useAuth();
  const userId = user?._id;
  const cacheKey = `${userId}|${path}|${JSON.stringify(query ?? {})}`;

  return useQuery<T>({
    queryKey: [...key, userId],
    enabled: Boolean(userId),
    refetchInterval: options.refetchInterval,
    queryFn: async () => {
      try {
        const data = await api<T>(path, { query });
        void saveCache(cacheKey, data);
        return data;
      } catch (error) {
        if (isNetworkError(error)) {
          const cached = await loadCache<T>(cacheKey);
          if (cached !== undefined) return cached;
        }
        throw error;
      }
    },
  });
}