# Etapa 1 — Autenticación, autorización y permisos por rol

## Qué cambió

| Tema | Resultado |
|---|---|
| Endpoints | `POST /api/auth/login`, `/refresh`, `/logout` y `GET /api/auth/me` |
| Access token | JWT HS256, 15 min (`ACCESS_TOKEN_TTL_MINUTES`). `sub` = id de usuario, `role` |
| Refresh token | Opaco, guardado hasheado (colección `RefreshToken`), rotación en cada uso, vence a los 7 días (`REFRESH_TOKEN_TTL_DAYS`) |
| Reuso de refresh | Si un token ya rotado se vuelve a usar se revoca toda la sesión (familia) |
| `JWT_SECRET` | Obligatoria, mínimo 32 caracteres (`env.config.js`) |
| Middlewares | `authenticate`, `authorize(...roles)`, `authorizeSelfOr(param, ...roles)` |
| Propiedad del recurso | `policies/access.policy.js`, aplicada en los Services (reciben `actor`) |
| Seguridad HTTP | `helmet`, rate limit en `/api/auth/*` (`AUTH_RATE_LIMIT_MAX`), `TRUST_PROXY` |
| Errores | `UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS` (401), `TOO_MANY_REQUESTS` (429) |
| Validación | Zod en el módulo de auth (el resto se migra en etapas siguientes) |

## Matriz aplicada

| Recurso | admin | store | driver | customer |
|---|---|---|---|---|
| Usuarios | todo (no puede borrarse a sí mismo) | su perfil | su perfil | su perfil |
| Pedidos | todo | crea (se fuerza su tienda) y ve los de su tienda | ve los asignados | crea (a su nombre) y ve los propios |
| Estado/borrado de pedidos | sí | no | no | no |
| Entregas | todo | ve las de sus pedidos | ve y actualiza las suyas (+ comprobante) | ve las de sus pedidos |
| Productos | todo | CRUD de los suyos | no | lectura |
| `/api/mocks`, `/api/logs` | sí | no | no | no |

Públicos: `/api/health`, `/api/auth/*`, `/api/docs` (solo si las rutas internas están habilitadas).

## Notas

- Alta de usuarios: `POST /api/users` es solo admin. Un autoregistro de customers (Etapa 4) sería un endpoint aparte.
- El refresh token viaja en el body. Con el proxy de Cloudflare Pages Functions puede pasarse a cookie `httpOnly` sin cambiar la lógica.
- Antes de usar el login en una base existente: `npm run migrate:stage0` (las contraseñas deben estar hasheadas).
- Sin tokens (cliente nuevo): `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:admin` y luego `POST /api/auth/login`.