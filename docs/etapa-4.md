# Etapa 4 — Portal de seguimiento para clientes

Portal público, sin cuenta: `apps/tracking` (React + Vite + TypeScript).

## Qué incluye

| Tema | Resultado |
|---|---|
| Página pública | `/seguimiento/:code`: estado, progreso, historial, zona de entrega y repartidor. Se actualiza sola cada 30 s hasta que el pedido llega a un estado final. |
| Endpoint | `GET /api/public/tracking/:code` (sin token). Devuelve `trackingCode`, `status`, `createdAt`, `address` parcial, `driver` (nombre + inicial) y `events` (`status` + fecha). |
| Datos sanitizados | Sin ids internos, sin datos del cliente (nombre, email), sin ítems ni montos. La dirección no lleva el número de calle (`maskAddress`). |
| Códigos | Aleatorios y no secuenciales (Etapa 0). Un formato inválido, un código inexistente o un `_id` interno responden el mismo 404. |
| Rate limiting | General: 120 consultas / 15 min por IP (`TRACKING_RATE_LIMIT_MAX`). Fallidas: 20 / 15 min por IP (`TRACKING_MISS_LIMIT_MAX`), que es lo que frena el barrido de códigos. |
| Compartir | QR del enlace (`qrcode`), botón de WhatsApp (`wa.me`) y copiar enlace. El panel admin muestra el enlace en el detalle del pedido. |

## Puesta en marcha

    npm install
    npm run dev            # API :3000
    npm run dev:tracking   # portal :5175 (proxy de /api)

Crea un pedido desde el panel admin, copia su código (`RV-…`) y abre `http://localhost:5175/seguimiento/<código>`.

## Despliegue (Cloudflare Pages)

1. Tercer proyecto de Pages: raíz `apps/tracking`, build `npm run build -w @ruvika/tracking` (desde la raíz del repo), salida `apps/tracking/dist`.
2. Variable `VITE_API_URL=https://tu-api.onrender.com` y, en la API, `CORS_ORIGIN=https://tu-portal.pages.dev`.
3. En el panel admin: `VITE_TRACKING_URL=https://tu-portal.pages.dev`.

A diferencia del panel y de la PWA, el portal llama **directo a la API** en vez de usar el proxy de Pages Functions. No hay cookies que resolver (el endpoint es público) y así la API ve la IP real del cliente, que es lo que usan los límites. Con el proxy, todas las consultas llegarían con la IP de Cloudflare y los clientes compartirían el mismo cupo.

## Límites conocidos

- Los pedidos anteriores a `migrate:stage0` no tienen `trackingCode` y por lo tanto no tienen enlace.
- El portal no muestra mapa ni ubicación (Etapa 6) ni notificaciones (Etapa 5).
- Pendiente (opcional en el roadmap): login de customer con "Mis pedidos".