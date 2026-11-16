const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });
export const formatDateTime = (iso?: string | null) => (iso ? dateTime.format(new Date(iso)) : '—');

export const fullName = (person?: { firstName: string; lastName: string } | null) =>
  person ? `${person.firstName} ${person.lastName}` : '—';