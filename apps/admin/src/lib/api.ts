import type { AuthSession } from './types';

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const REFRESH_KEY = 'ruvika.admin.refreshToken';

/** Error de la API con el formato uniforme { success:false, error:{ code, message, details } }. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let onSessionLost: () => void = () => {};

export const setSessionLostHandler = (handler: () => void) => {
  onSessionLost = handler;
};
export const getStoredRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export function storeSession(session: Pick<AuthSession, 'accessToken' | 'refreshToken'>) {
  accessToken = session.accessToken;
  localStorage.setItem(REFRESH_KEY, session.refreshToken);
}

export function clearSession() {
  accessToken = null;
  localStorage.removeItem(REFRESH_KEY);
}

type Query = Record<string, string | number | undefined | null>;
interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  auth?: boolean;
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return `${BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function send(path: string, { method = 'GET', body, query, auth = true }: Options) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function parse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? `Error ${response.status}`,
      error?.details,
    );
  }
  return payload as T;
}

/**
 * Renovar sesion con UNA sola peticion en vuelo. Es importante: la API rota
 * el refresh token en cada uso y, si ve reutilizar uno ya rotado, revoca toda
 * la sesion. Dos refresh simultaneos (por ejemplo el doble efecto de
 * React.StrictMode, o varias consultas que vencen a la vez) compartiran esta
 * misma promesa en lugar de gastar el token dos veces.
 */
let refreshing: Promise<AuthSession> | null = null;

export function refreshSession(): Promise<AuthSession> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return Promise.reject(new ApiError(401, 'UNAUTHORIZED', 'No hay sesion'));
  refreshing ??= send('/api/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false })
    .then((response) => parse<AuthSession>(response))
    .then((session) => {
      storeSession(session);
      return session;
    })
    .catch((error) => {
      clearSession();
      throw error;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  let response = await send(path, options);

  // Access token vencido: se renueva una vez y se reintenta.
  if (response.status === 401 && options.auth !== false && getStoredRefreshToken()) {
    try {
      await refreshSession();
      response = await send(path, options);
    } catch {
      onSessionLost();
    }
  }
  return parse<T>(response);
}

export const login = async (email: string, password: string) => {
  const session = await parse<AuthSession>(
    await send('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  );
  storeSession(session);
  return session;
};

export async function logout() {
  const refreshToken = getStoredRefreshToken();
  clearSession();
  if (refreshToken) {
    await send('/api/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => {});
  }
}

/** Mensaje legible para mostrar en pantalla, con el detalle de validacion si existe. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (Array.isArray(error.details) && error.details.length > 0) {
      const lines = error.details.map((d) => (typeof d === 'string' ? d : `${d.field}: ${d.message}`));
      return `${error.message} (${lines.join('; ')})`;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : 'Ocurrio un error inesperado';
}
