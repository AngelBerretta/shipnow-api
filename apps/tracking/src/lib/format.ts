const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });
export const formatDateTime = (iso?: string | null) => (iso ? dateTime.format(new Date(iso)) : '—');

const time = new Intl.DateTimeFormat('es-AR', { timeStyle: 'short' });
export const formatTime = (ms: number) => time.format(new Date(ms));