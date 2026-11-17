/**
 * Utilidades de fechas por "dia calendario" en una zona horaria. Los reportes
 * agrupan por el dia local del negocio (no por dia UTC): un pedido creado a
 * las 22:00 en Argentina pertenece a ese dia, aunque en UTC ya sea "mañana".
 */
export const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dia calendario de `date` en `timeZone`, formato "YYYY-MM-DD" (el locale en-CA ya lo produce asi). */
export function dayKey(date, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Las ultimas `days` claves de dia (la ultima es "hoy" en `timeZone`), en orden cronologico. */
export function lastDayKeys(days, timeZone = DEFAULT_TIMEZONE, now = new Date()) {
  const [year, month, day] = dayKey(now, timeZone).split('-').map(Number);
  const today = Date.UTC(year, month - 1, day);
  return Array.from({ length: days }, (_, index) => new Date(today - (days - 1 - index) * DAY_MS).toISOString().slice(0, 10));
}

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** `true` si es un "YYYY-MM-DD" que existe en el calendario (rechaza 2026-02-30). */
export function isDayKey(value) {
  if (typeof value !== 'string' || !DAY_KEY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const dayKeyToMs = (key) => Date.parse(`${key}T00:00:00Z`);

export const addDays = (key, days) => new Date(dayKeyToMs(key) + days * DAY_MS).toISOString().slice(0, 10);

/** Cantidad de días de [from, to], ambos inclusive. */
export const daysBetween = (from, to) => Math.round((dayKeyToMs(to) - dayKeyToMs(from)) / DAY_MS) + 1;

export const dayKeysBetween = (from, to) => Array.from({ length: daysBetween(from, to) }, (_, index) => addDays(from, index));