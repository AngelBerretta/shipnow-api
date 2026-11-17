import type { Tracking } from './types';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export const NOT_FOUND_MESSAGE = 'No encontramos un pedido con ese código. Revisalo e intentá de nuevo.';

/** Error de la API con el formato uniforme { success:false, error:{ code, message } }. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchTracking(code: string): Promise<Tracking> {
  const response = await fetch(`${BASE}/api/public/tracking/${encodeURIComponent(code)}`);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? 'UNKNOWN_ERROR',
      payload?.error?.message ?? `Error ${response.status}`,
    );
  }
  return payload as Tracking;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return NOT_FOUND_MESSAGE;
    if (error.status === 429) return 'Hiciste demasiadas consultas. Esperá unos minutos y volvé a probar.';
    return error.message;
  }
  if (error instanceof TypeError) return 'No hay conexión con el servidor.';
  return 'Ocurrió un error inesperado.';
}