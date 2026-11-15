/**
 * pagination.js
 *
 * Helper de paginación reutilizado por los repositorios y servicios que
 * exponen listados potencialmente grandes (usuarios, pedidos, entregas,
 * productos). Ningún endpoint de listado devuelve la colección completa
 * sin límite: si el cliente no especifica `page`/`limit`, se aplican los
 * valores por defecto de abajo.
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Convierte page/limit de query string a enteros válidos y acotados.
 * Valores inválidos (no numéricos, negativos, cero) caen al default en
 * vez de lanzar error: la paginación es una optimización de performance,
 * no una validación de negocio estricta que deba bloquear la petición.
 */
export function parsePagination(query = {}) {
  let page = Number(query.page);
  let limit = Number(query.limit);

  if (!Number.isFinite(page) || page < 1) page = DEFAULT_PAGE;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  page = Math.trunc(page);
  limit = Math.trunc(limit);

  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Arma el objeto de metadata que acompaña a `data` en toda respuesta
 * paginada: { data: [...], pagination: { page, limit, total, totalPages } }.
 */
export function buildPaginationMeta({ page, limit }, total) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export const PAGINATION_DEFAULTS = Object.freeze({ DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT });
