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
