# Etapa 2 — Dashboard administrativo

Panel web para operar toda la plataforma sin Postman: `apps/admin` (React + Vite + TypeScript).

## Qué incluye

| Sección | Qué hace |
|---|---|
| Login | Email y contraseña contra `/api/auth/login`. Solo entran administradores. Access token en memoria, refresh token en `localStorage`, renovación automática y única (una sola petición de refresh a la vez: la API revoca la sesión si ve reusar un token rotado). Aviso de "despertando el servidor" si la API tarda (Render Free). |
| Resumen | KPIs (pedidos de hoy, en camino, entregados, cancelados, tasa de entrega), pedidos creados/entregados por día, pedidos por estado, y botón de datos de demostración (`POST /api/mocks/generate`). |
| Pedidos | Tabla paginada con filtro por estado, alta de pedidos, detalle con historial (`/events`), asignar repartidor, avanzar/quitar la entrega, cancelar y eliminar. |
| Entregas | Tabla paginada con filtros por estado y repartidor, alta, avance de estado y baja. |
| Usuarios | Listado por rol, alta, edición (nombre, rol, contraseña), activar/desactivar y baja. |
| Productos | Listado con filtros, alta, edición y baja, con tienda dueña. |

## Cambios en la API

- `GET /api/stats/overview?days=14` (solo admin): KPIs + `byStatus` + `perDay`, con aggregation pipelines. Agrupa por día en `America/Argentina/Buenos_Aires` (`utils/dates.js`). Los pedidos entregados por día salen de los eventos `toStatus: delivered` del historial.
- `PATCH /api/users/:uid` (solo admin): nombre, rol, contraseña e `isActive` (baja lógica). Reglas: no se otorga el rol `admin`, no se cambia el rol de un admin ni el propio, un admin no se desactiva a sí mismo. El email no se edita.
- `npm run openapi:export -w @ruvika/api` escribe `apps/api/docs/openapi.json`; `npm run gen:api -w @ruvika/admin` genera `src/lib/api-schema.d.ts` con `openapi-typescript`. Los tipos de dominio que usa el panel hoy están en `src/lib/types.ts` (a mano); el esquema generado queda disponible para migrarlos gradualmente.
- `@ruvika/shared` ahora trae tipos (`index.d.ts`) para los frontends en TypeScript.

## Puesta en marcha

```bash
npm install
npm run dev            # API en :3000
npm run dev:admin      # panel en :5173 (Vite hace proxy de /api a :3000)
```

Entrá con el admin creado con `npm run seed:admin`. Para ver gráficos con datos, usá "Generar datos" en el Resumen.

## Despliegue (Cloudflare Pages)

1. Proyecto con raíz `apps/admin`, comando `npm run build -w @ruvika/admin` (desde la raíz del repo), salida `apps/admin/dist`.
2. Variable `API_URL` = URL de la API en Render. La Function `functions/api/[[path]].js` hace de proxy de `/api/*`, así que `VITE_API_URL` queda vacía (mismo origen).
3. `public/_redirects` resuelve las rutas del SPA.
4. Alternativa sin proxy: `VITE_API_URL=https://tu-api.onrender.com` y `CORS_ORIGIN=https://tu-panel.pages.dev` en la API.

## Decisiones y límites

- Los selectores (clientes, repartidores, tiendas) cargan hasta 100 usuarios por rol (tope de la paginación de la API). Con más, hay que pasar a un buscador.
- La tabla es propia, con paginación del servidor; TanStack Table no aporta nada mientras no haya ordenamiento ni filtros del lado del cliente.
- Los componentes de UI son propios y livianos (Tailwind 4), no shadcn/ui.
- El refresh token en `localStorage` es vulnerable a XSS; pasarlo a cookie `httpOnly` es el siguiente paso cuando exista el proxy (ver `docs/etapa-1.md`).
- Un pedido con entrega se avanza desde la entrega (el pedido la sigue); el panel solo permite cancelar pedidos sin entrega.
- Los pedidos no se pueden editar (la API no lo expone): se cancelan o eliminan.
