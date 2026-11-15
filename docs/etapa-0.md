# Etapa 0 — Preparación y deuda técnica

Cierra la deuda técnica de la API antes de agregar autenticación (Etapa 1).

## Qué cambió

| Tarea del roadmap | Resultado |
|---|---|
| Renombrar ShipNow → Ruvika | `package.json`, Swagger, README, Docker, logs, ejemplos de `.env` y datos de prueba. Las bases de los `.env.example` ahora son `ruvika` / `ruvika_test` (tu `.env` local no se toca). |
| Hashear contraseñas | `user.service.js` guarda un hash **bcrypt** (`bcryptjs`, `utils/password.js`). Costo configurable con `BCRYPT_ROUNDS` (default 10; 4 en tests). |
| Script `seed:admin` | `npm run seed:admin`. Lee `ADMIN_EMAIL` y `ADMIN_PASSWORD` (sin valores por defecto), es idempotente. Usa `userService.createAdminUser`, que **no** está expuesto por ninguna ruta. |
| Máquina de estados | `ORDER_TRANSITIONS` y `DELIVERY_TRANSITIONS` en `@ruvika/shared`. Un salto, retroceso o repetición responde `409 INVALID_STATUS_TRANSITION` con `{ from, to, allowed }`. |
| `OrderEvent` | Colección de solo agregado con el historial del pedido. Se consulta en `GET /api/orders/:oid/events`. |
| Campos nuevos | `Order.trackingCode` (aleatorio, `RV-XXXXXXXXXX`), `Order.store`, `Product.owner`, `User.isActive`. |
| Borrado en cascada | Borrar un pedido borra su entrega y su historial. Borrar una entrega desengancha el pedido y lo devuelve a `created` (si no estaba entregado/cancelado). |
| Monorepo | `apps/api` + `packages/shared` (npm workspaces). Las constantes pasaron a `@ruvika/shared`; `apps/api/src/constants/index.js` queda como re-export. |

## Reglas de negocio que quedaron definidas

**Pedido:** `created → assigned → picked_up → in_transit → delivered`; `cancelled`
se alcanza desde cualquier estado no final. `delivered` y `cancelled` son finales.

**Entrega:** `assigned → picked_up → in_transit → delivered` (se agregó
`picked_up` para que la entrega espeje al pedido y la app del repartidor tenga
los tres pasos *recogido → en camino → entregado*). Cada avance de la entrega
se refleja en el pedido y deja un evento.

**Cancelar:** un pedido con entrega asociada no se puede cancelar
(`409 ORDER_HAS_ACTIVE_DELIVERY`): primero se elimina la entrega.

## Migrar una base existente

Una base nueva no necesita nada. Con datos previos:

```bash
npm run migrate:stage0 -- --dry-run   # informa qué haría
npm run migrate:stage0                # hashea contraseñas, completa isActive,
                                      # asigna trackingCode y crea el evento order_created
```

Es idempotente. Hacelo **antes** de la Etapa 1: el login va a comparar contra el hash.

## Cambios en los tests

Los tests que daban por válido un salto de estado se actualizaron (el roadmap
marca ese comportamiento como deuda): el de `ORDER_ALREADY_DELIVERED` ahora
recorre el camino completo hasta `delivered`, y los de entregas usan
`assigned → picked_up → in_transit → delivered`. Se agregaron tests de
transiciones inválidas, historial, cascada, contraseñas, `createAdminUser`,
`Product.owner`, `Order.store` y `trackingCode`.

## Pendiente / límites conocidos

- Los archivos de `uploads/` de una entrega o pedido borrado quedan en disco (ya pasaba al borrar usuarios). Se resuelve al migrar el storage a R2 (Etapa 3).
- `actor` en `OrderEvent` queda en `null` hasta que exista autenticación.
- Sin CI todavía (GitHub Actions entra con las etapas siguientes).
