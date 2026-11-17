/**
 * Dirección "parcial" para el seguimiento público: se saca el número de calle
 * y se deja solo la calle y la localidad (último tramo tras la coma).
 *   "Av. Rivadavia 1234, Piso 3, Chivilcoy" -> "Av. Rivadavia, Chivilcoy"
 */
export function maskAddress(address) {
  if (typeof address !== 'string') return '';
  const [street = '', ...rest] = address.split(',').map((part) => part.trim());
  const streetName = street.replace(/\s+\d+\S*$/, '').trim();
  return [streetName, rest.at(-1)].filter(Boolean).join(', ');
}