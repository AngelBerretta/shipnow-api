# Etapa 3 — PWA para repartidores

App instalable en el celular: `apps/driver` (React + Vite + TypeScript + vite-plugin-pwa).

## Qué incluye

| Tema | Resultado |
|---|---|
| Instalable | Manifest, íconos (generados desde `public/icon.svg`), service worker con precache del shell y aviso de instalación (Android) / instrucciones (iOS). |
| Mis entregas | `GET /api/deliveries/me` (`?active=true\|false`). Pestañas "Activas" (ordenadas por prioridad) e "Historial". |
| Detalle | Dirección, cliente, ítems, botones "Google Maps" y "Waze", avance `assigned → picked_up → in_transit → delivered` con `DELIVERY_TRANSITIONS` de `@ruvika/shared`. |
| Comprobante | `<input capture="environment">`, compresión previa (`browser-image-compression`, máx. ~1 MB) y subida a `POST /api/deliveries/:did/proof`. |
| Disponibilidad | Interruptor en el encabezado → `PATCH /api/users/me/availability`. El admin lo ve al asignar. |
| Offline | Cola en IndexedDB (`idb`) de cambios de estado, fotos y disponibilidad. Se envía en orden al volver la conexión. Listas y detalle se cachean en IndexedDB por usuario. |
| R2 | Con `R2_*` definidas, los archivos van a Cloudflare R2; sin ellas, a `uploads/` como antes. |
| Permisos | Ya resueltos en la Etapa 1: un repartidor solo ve y modifica lo suyo. |

## Puesta en marcha

```bash
npm install
npm run pwa:assets -w @ruvika/driver   # genera los PNG de apps/driver/public desde icon.svg (una vez)
npm run dev                            # API :3000
npm run dev:driver                     # app :5174 (proxy de /api)
```

Entrá con un usuario con rol `driver` (se crea desde el panel admin → Usuarios). Para probar sin datos: Resumen → "Generar datos", y asigná entregas al repartidor.

El service worker solo se registra en el build (`npm run build:driver && npm run preview -w @ruvika/driver`). En un celular hace falta HTTPS: lo más simple es desplegar en Cloudflare Pages o usar `cloudflared tunnel --url http://localhost:4173`.

## Cola offline: reglas

- Cada acción se guarda con el `userId`; solo se envían las del usuario logueado.
- Se envían en orden (FIFO). Ante error de red, 5xx, 429 o sesión vencida se corta y se reintenta luego (al volver `online`, al volver a primer plano, y cada 30 s si hay pendientes).
- Ante 400/403/404/409 la acción se descarta y se avisa: la entrega ya cambió (por ejemplo, el cambio se aplicó pero la respuesta se perdió, o un admin la movió).
- La disponibilidad se compacta: solo importa el último valor.
- Background Sync no existe en iOS, por eso no se usa: la cola corre mientras la app está abierta.

## Cloudflare R2

1. Crear un bucket (ej. `ruvika-uploads`) y un API token con permiso *Object Read & Write* sobre ese bucket.
2. En Render, definir `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
3. En `FileMetadata.path` queda la **clave del objeto** (`deliveries/1735…-ab12.jpg`) en vez de una ruta de disco.

## Despliegue (Cloudflare Pages)

Segundo proyecto de Pages: raíz `apps/driver`, build `npm run build -w @ruvika/driver` (desde la raíz del repo), salida `apps/driver/dist`, variable `API_URL`. La Function `functions/api/[[path]].js` hace de proxy, igual que en el panel.

## Pendiente / límites conocidos

- Los comprobantes ya subidos no se pueden ver todavía (no hay endpoint de lectura; en R2 serviría una URL firmada). Entra con el reporte de entregas de la Etapa 5.
- La disponibilidad es informativa: la API no bloquea asignar un repartidor "no disponible".
- Si el servidor aplica un refresh de sesión y la respuesta se pierde, la sesión se revoca por reuso del token (protección de la Etapa 1): hay que volver a ingresar.
- El refresh token vive en `localStorage` (igual que el panel); pasa a cookie `httpOnly` con el proxy.
- Los archivos viejos de `uploads/` locales no se migran a R2 automáticamente.