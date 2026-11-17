# Etapa 5 — Notificaciones automáticas y reportes

## Cómo funciona
Todo cambio de estado de un pedido pasa por `orderEventService.record()`, que emite el evento
`order.event`. `notification.service` lo convierte en filas de la colección `notifications`
(bandeja de salida con `dedupeKey`, `attempts` y `nextAttemptAt`). Encolar es parte del request;
enviar ocurre después, con reintentos (1, 5, 15, 60 y 180 min; `NOTIFICATION_MAX_ATTEMPTS`).
Un cron de GitHub Actions llama a `POST /api/internal/notifications/process` cada 10 min.

| Estado | Cliente | Admins | Repartidor |
|---|---|---|---|
| created | email | campana + Telegram | |
| assigned | | | push + campana |
| in_transit | email | campana | |
| delivered | email | campana + Telegram | |
| cancelled | email | campana + Telegram | |

Un canal sin variables de entorno simplemente no se usa (la campana siempre funciona).

## Puesta en marcha
1. **Email:** cuenta en Resend → `RESEND_API_KEY`. Sin dominio verificado solo se puede enviar a la
   dirección de la cuenta (con `onboarding@resend.dev`); para escribirle a clientes reales hay que verificar un dominio.
2. **Push:** `npx web-push generate-vapid-keys` → `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`.
3. **Telegram:** crear el bot con @BotFather → `TELEGRAM_BOT_TOKEN`. Agregarlo al chat de administración,
   escribir un mensaje y abrir `https://api.telegram.org/bot<TOKEN>/getUpdates` → `TELEGRAM_ADMIN_CHAT_ID`.
4. **Enlaces:** `TRACKING_URL` (portal) y `ADMIN_URL` (panel).
5. **Cron:** `INTERNAL_API_SECRET` en Render y, junto con `API_URL`, como secrets del repo en GitHub.

## Reportes
`GET /api/reports/overview?from=AAAA-MM-DD&to=AAAA-MM-DD` (admin), `export.csv?type=days|drivers|stores` y
`export.pdf`. Panel: sección **Reportes**. Reporte semanal: lunes 9:00 (AR), por campana, email y Telegram.

## Límites conocidos
- Resend gratis: 100 emails/día (alcanza para el demo; los avisos pendientes se reintentan al día siguiente).
- Web Push solo en la PWA del repartidor (en iOS, instalada). El panel y el portal no tienen service worker.
- Al cerrar sesión se quita la suscripción push del dispositivo (celulares compartidos): hay que volver a activarla.
- Telegram es un único chat de administración; no hay vinculación de clientes.
- El cron cada 10 min mantiene la API despierta (~720 h/mes de las 750 gratis de Render, suficiente para un servicio).
- Los avisos se borran a los 30 días (índice TTL). No hay preferencias de notificación por usuario.
- Reportes: las entregas eliminadas no cuentan; los datos de demostración no generan emails.
- La serie diaria usa el día local de `America/Argentina/Buenos_Aires`, igual que el Resumen.