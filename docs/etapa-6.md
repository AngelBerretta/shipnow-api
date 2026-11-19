# Etapa 6 — GPS en tiempo real e integraciones externas

## Flujo
1. La PWA (`apps/driver`) usa `watchPosition` y manda `POST /api/locations/me` cada 10 s, solo si hay una
   entrega activa (`assigned`/`picked_up`/`in_transit`) y el repartidor no apagó el interruptor. Mantiene la
   pantalla encendida con Wake Lock.
2. La API aplica la posición a todas las entregas activas del repartidor, la guarda en memoria, la emite por
   Socket.IO a la sala `admins` (y `delivery:<id>`) y persiste un punto cada 15 s (colección `locations`,
   índice `2dsphere`, TTL de 48 h).
3. El panel (`/live`) muestra el mapa (Leaflet + OSM), la lista, el ETA y el recorrido. Carga inicial y
   reconciliación con `GET /api/locations/live` cada minuto.
4. El portal del cliente consulta `GET /api/public/tracking/:code` cada 15 s: con el pedido `in_transit` y una
   posición de menos de 5 min suma `location` y `eta` (nunca el destino exacto).
5. Al crear un pedido, la dirección se geocodifica en segundo plano (Nominatim, 1 req/s). Con el destino
   conocido hay ETA (OSRM, con estimación como respaldo) y geocerca: a menos de 300 m del destino y en camino
   se avisa una sola vez ("tu repartidor está llegando": email al cliente, campana a admins y webhook
   `order.arriving`).

## Integraciones
- **Admin → Integraciones**: cada integración pertenece a una tienda. Al crearla se muestran una vez la
  **API key** (`rvk_<prefijo>_<secreto>`, se guarda solo su hash) y el **secreto de firma**.
- **Entrante:** `POST /api/inbound/orders` con `X-API-Key`. Idempotente por `externalId`. El cliente se busca
  o crea por email y recibe los emails de la etapa 5.
- **WooCommerce:** webhook "Pedido actualizado" → `https://TU_API/api/inbound/woocommerce/<id integración>`,
  Secret = secreto de firma. Solo crea pedidos en `processing` (pagados).
- **Saliente:** eventos `order.created|assigned|picked_up|in_transit|delivered|cancelled|arriving` por POST
  firmado. Viajan por el outbox de notificaciones: mismos reintentos (1, 5, 15, 60 y 180 min) y mismo cron.
  Verificación en el receptor:
  `HMAC-SHA256(secreto, t + "." + cuerpo)` == `v1` de `X-Ruvika-Signature: t=…,v1=…`, y rechazar `t` viejos.
- Los webhooks solo llevan `trackingCode`, estado, `externalId` y enlace de seguimiento (sin datos personales).

## Puesta en marcha
```bash
npm install
npm run dev && npm run dev:admin && npm run dev:driver
# Demo sin celular (el repartidor necesita una entrega activa):
DRIVER_EMAIL=... DRIVER_PASSWORD=... npm run simulate:driver -w @ruvika/api -- "-34.9100,-60.0300" "-34.8956,-60.0189"
```
La Geolocation API solo funciona en HTTPS (o localhost): para probar en el celular usa Pages o `cloudflared`.

## Despliegue
- API: define `GEO_USER_AGENT` con un email real (Nominatim lo exige) y `CORS_ORIGIN` con el panel (varios
  orígenes separados por coma). Render Free soporta WebSocket.
- Panel: `VITE_SOCKET_URL=https://tu-api.onrender.com`. El WebSocket va directo a la API: Pages Functions no
  sirve de proxy para WS. No hay cookies, la autenticación es el JWT del handshake.

## Límites conocidos
- Una PWA no rastrea de forma confiable con la pantalla bloqueada: Wake Lock alcanza para un demo. Para
  producción real, envolver la app con Capacitor (GPS en segundo plano).
- El estado en vivo (última posición, ETA en caché) está en memoria: una sola instancia de la API. Con varias
  hay que mover el estado a Redis y usar el adaptador de Socket.IO.
- Nominatim y OSRM públicos son para uso liviano (política de uso justo); los tiles de OSM igual. Con volumen
  real: instancia propia o proveedor.
- Un webhook a un dominio público que resuelva a una IP privada no se detecta (no se resuelve DNS).
- El secreto de firma queda guardado en claro (hace falta para firmar); la API key solo como hash.
- Los pedidos creados antes de esta etapa no tienen destino geocodificado: no tienen ETA ni geocerca.
- El socket de un usuario desactivado se cierra al vencer su token (máx. 15 min).
- Pendiente: conector de Tienda Nube / Mercado Libre (solo WooCommerce incluido).