# Ruvika

Plataforma de gestión logística. Evoluciona la API de ShipNow hacia un
sistema completo (API + panel de administración + app de repartidores +
portal de seguimiento para clientes), siguiendo el roadmap por etapas.

## Estructura

```
ruvika/
├─ apps/
│  └─ api/          # API REST (Express + Mongoose) — ver apps/api/README.md
├─ packages/
│  └─ shared/       # @ruvika/shared: roles, estados, máquinas de estado, formatos
├─ docs/            # Notas de cada etapa
├─ Dockerfile       # Imagen de la API (se construye desde esta raíz)
└─ docker-compose.yml
```

Es un monorepo de **npm workspaces**: una sola instalación en la raíz
enlaza `@ruvika/shared` dentro de la API (y, más adelante, dentro de los
frontends).

## Puesta en marcha

```bash
npm install                                   # instala todo el monorepo
cp apps/api/.env.example apps/api/.env        # completar MONGODB_URI
npm run dev                                   # API en modo desarrollo

# Primer administrador (el alta pública no permite el rol admin)
ADMIN_EMAIL=admin@ruvika.com ADMIN_PASSWORD='una-clave-larga' npm run seed:admin
```

## Comandos (desde la raíz)

| Comando | Qué hace |
|---|---|
| `npm run dev` / `npm start` | Levanta la API |
| `npm test` | Tests de todos los paquetes (la API necesita MongoDB de testing: ver `apps/api/README.md`) |
| `npm run test:api` / `npm run test:shared` | Tests de un solo paquete |
| `npm run lint` | ESLint sobre todo el monorepo |
| `npm run seed:admin` | Crea el primer administrador |
| `npm run migrate:stage0` | Migra datos viejos de MongoDB (ver `docs/etapa-0.md`) |

## Estado del roadmap

- [x] **Etapa 0** — Preparación y deuda técnica (ver [docs/etapa-0.md](docs/etapa-0.md))
- [x] Etapa 1 — Autenticación, autorización y permisos por rol (ver [docs/etapa-1.md](docs/etapa-1.md))
- [x] Etapa 2 — Dashboard administrativo (ver [docs/etapa-2.md](docs/etapa-2.md))
- [x] Etapa 3 — PWA para repartidores (ver [docs/etapa-3.md](docs/etapa-3.md))
- [x] Etapa 4 — Portal de seguimiento para clientes (ver [docs/etapa-4.md](docs/etapa-4.md))
- [ ] Etapa 5 — Notificaciones automáticas y reportes
- [ ] Etapa 6 — GPS en tiempo real e integraciones
