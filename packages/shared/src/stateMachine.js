import { ORDER_STATUS, DELIVERY_STATUS } from './constants.js';

/**
 * Maquinas de estados de pedidos y entregas: para cada estado, la lista
 * de estados a los que se puede pasar. Todo lo que no figure aca es una
 * transicion invalida (ej: created -> delivered).
 *
 * Viven en `shared` porque no son solo una regla del servidor: la app
 * del repartidor las usa para saber que boton mostrar en cada momento.
 */
const freezeMap = (map) =>
  Object.freeze(Object.fromEntries(Object.entries(map).map(([from, to]) => [from, Object.freeze(to)])));

export const ORDER_TRANSITIONS = freezeMap({
  [ORDER_STATUS.CREATED]: [ORDER_STATUS.ASSIGNED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ASSIGNED]: [ORDER_STATUS.PICKED_UP, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PICKED_UP]: [ORDER_STATUS.IN_TRANSIT, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.IN_TRANSIT]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
});

export const DELIVERY_TRANSITIONS = freezeMap({
  [DELIVERY_STATUS.PENDING]: [DELIVERY_STATUS.ASSIGNED],
  [DELIVERY_STATUS.ASSIGNED]: [DELIVERY_STATUS.PICKED_UP],
  [DELIVERY_STATUS.PICKED_UP]: [DELIVERY_STATUS.IN_TRANSIT],
  [DELIVERY_STATUS.IN_TRANSIT]: [DELIVERY_STATUS.DELIVERED],
  [DELIVERY_STATUS.DELIVERED]: [],
});

/** Estados a los que se puede pasar desde `from` (vacio si es final o desconocido). */
export function getAllowedTransitions(transitions, from) {
  return transitions[from] ?? [];
}

/** `true` si pasar de `from` a `to` esta permitido por el mapa `transitions`. */
export function canTransition(transitions, from, to) {
  return getAllowedTransitions(transitions, from).includes(to);
}

/** `true` si desde `status` ya no se puede pasar a ningun otro estado. */
export function isFinalStatus(transitions, status) {
  return getAllowedTransitions(transitions, status).length === 0;
}
