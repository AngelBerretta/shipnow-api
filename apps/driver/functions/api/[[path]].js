/**
 * Cloudflare Pages Function: proxy de /api/* hacia la API (Render).
 * Definir API_URL en Pages (ej: https://ruvika-api.onrender.com) y dejar VITE_API_URL vacia.
 */
export function onRequest({ request, env }) {
  const url = new URL(request.url);
  return fetch(new Request(`${env.API_URL}${url.pathname}${url.search}`, request));
}