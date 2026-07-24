***REMOVED*** ShipNow API

API de logística de ShipNow, refactorizada a una arquitectura profesional
por capas (**Controller → Service → Repository**) con configuración de
entorno validada al arranque.

***REMOVED******REMOVED*** Instalación y ejecución local

1. Clonar el repositorio e instalar dependencias:

   ```bash
   npm install
   ```

2. Crear el archivo de variables de entorno a partir del ejemplo:

   ```bash
   cp .env.example .env
   ```

   Y completar los valores reales, especialmente `MONGODB_URI` apuntando
   a tu instancia de MongoDB (local o Atlas).

3. Levantar el servidor en modo desarrollo (con recarga automática):

   ```bash
   npm run dev
   ```

   O en modo producción:

   ```bash
   npm start
   ```

Si falta alguna variable crítica (`PORT`, `MONGODB_URI` o `NODE_ENV`), la
aplicación **no arranca** y muestra un error descriptivo indicando qué
variable falta, en lugar de fallar de forma silenciosa o más adelante al
intentar usarla.

***REMOVED******REMOVED*** Arquitectura

```
src/
├── config/          ***REMOVED*** Configuración de entorno (única fuente de process.env)
├── constants/        ***REMOVED*** Diccionario de roles y estados (Object.freeze)
├── models/            ***REMOVED*** Esquemas de Mongoose (sin lógica de negocio)
├── repositories/     ***REMOVED*** Único lugar que conoce Mongoose/MongoDB
├── services/          ***REMOVED*** Lógica de negocio (incluye mock.service.js)
├── controllers/       ***REMOVED*** Única puerta de entrada HTTP (req/res)
├── routes/            ***REMOVED*** Solo conectan path + método HTTP con el Controller
├── middlewares/       ***REMOVED*** Manejo central de errores y 404
├── utils/             ***REMOVED*** Helpers puros (ApiError, mock.generator.js)
├── app.js             ***REMOVED*** Configuración de Express y montaje de rutas
└── server.js          ***REMOVED*** Composition root: conecta a Mongo y levanta el server
```

**Flujo de una petición:** `Router → Controller → Service → Repository → Mongoose`

El Controller nunca importa `mongoose` ni los modelos directamente; solo
conoce el Service correspondiente. El Repository nunca contiene reglas de
negocio: solo sabe buscar y persistir datos.

***REMOVED******REMOVED******REMOVED*** ¿Por qué separar la lógica entre Service y Repository?

La regla que seguí fue: **el Repository responde "¿cómo se guarda/busca
esto en MongoDB?" y el Service responde "¿qué debe pasar según las reglas
del negocio?"**.

Por ejemplo, en `ProductService.updateProduct`, decidir que un producto con
`stock <= 0` siempre debe quedar en estado `out_of_stock` —sin importar
qué status venga en el body— es una **regla de negocio**: no depende de
Mongoose, sería la misma regla si mañana cambiamos de base de datos. Por
eso vive en el Service. El Repository, en cambio, solo sabe ejecutar
`Product.findByIdAndUpdate(...)` con los datos que ya vienen resueltos.

Mantener esta separación permite:

- Testear la lógica de negocio (Service) simulando el Repository, sin
  necesidad de una base de datos real.
- Cambiar el motor de persistencia (por ejemplo, de MongoDB a otra base)
  tocando solo la capa de Repository, sin modificar reglas de negocio.
- Evitar "repositorios pasamanos": cada método de Repository encapsula
  proyecciones y filtros por defecto (por ejemplo, `UserRepository` nunca
  devuelve el campo `password`), en vez de ser un `return Model.find()`
  desnudo.

***REMOVED******REMOVED*** Variables de entorno

| Variable      | Descripción                                   | Ejemplo                              |
|---------------|------------------------------------------------|---------------------------------------|
| `PORT`        | Puerto HTTP del servidor                        | `3000`                                |
| `MONGODB_URI` | Cadena de conexión a MongoDB                    | `mongodb://localhost:27017/shipnow`   |
| `NODE_ENV`    | Entorno de ejecución                            | `development`                         |

***REMOVED******REMOVED*** Endpoints

| Método | Ruta                          | Descripción                |
|--------|-------------------------------|-----------------------------|
| GET    | /api/users                    | Listar usuarios              |
| GET    | /api/users/:uid                | Obtener usuario por ID        |
| POST   | /api/users                    | Crear usuario                |
| DELETE | /api/users/:uid                | Eliminar usuario              |
| GET    | /api/products                  | Listar productos              |
| GET    | /api/products/:pid              | Obtener producto por ID        |
| POST   | /api/products                  | Crear producto                |
| PUT    | /api/products/:pid              | Actualizar producto            |
| DELETE | /api/products/:pid              | Eliminar producto              |
| GET    | /api/orders                    | Listar pedidos                |
| GET    | /api/orders/:oid                | Obtener pedido por ID          |
| POST   | /api/orders                    | Crear pedido                  |
| PATCH  | /api/orders/:oid/status          | Actualizar estado pedido       |
| DELETE | /api/orders/:oid                | Eliminar pedido                |
| GET    | /api/deliveries                | Listar entregas                |
| GET    | /api/deliveries/:did             | Obtener entrega por ID          |
| POST   | /api/deliveries                | Crear entrega                  |
| PATCH  | /api/deliveries/:did/status       | Actualizar estado entrega       |
| DELETE | /api/deliveries/:did             | Eliminar entrega                |
| GET    | /api/mocks/users                | Simular usuarios (no se guardan) |
| GET    | /api/mocks/orders                | Simular pedidos (no se guardan) |
| GET    | /api/mocks/deliveries            | Simular entregas (no se guardan)|
| GET    | /api/mocks/full                  | Simular dataset completo relacionado (no se guarda) |
| POST   | /api/mocks/generate              | Insertar datos de prueba reales en MongoDB |

Ver la sección [Mocking y carga de datos de prueba](***REMOVED***mocking-y-carga-de-datos-de-prueba) para el detalle de cada endpoint.

***REMOVED******REMOVED*** Constantes de dominio

Los roles de usuario y los estados de productos, pedidos y entregas están
centralizados en `src/constants/index.js` como objetos congelados
(`Object.freeze`), en vez de usarse como strings sueltos a lo largo del
código:

- `ROLES`: `ADMIN`, `CUSTOMER`, `DRIVER`, `STORE`
- `PRODUCT_STATUS`: `AVAILABLE`, `OUT_OF_STOCK`
- `ORDER_STATUS`: `CREATED`, `ASSIGNED`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`
- `DELIVERY_STATUS`: `PENDING`, `ASSIGNED`, `IN_TRANSIT`, `DELIVERED`
- `PRIORITY`: `LOW`, `NORMAL`, `HIGH`

***REMOVED******REMOVED*** Mocking y carga de datos de prueba

El módulo de mocking permite generar usuarios (incluidos repartidores),
pedidos y entregas simulados, sin necesidad de cargarlos a mano, para
poder probar la API o poblar una base de desarrollo rápidamente.

Vive en su propio router (`/api/mocks`) y respeta la misma arquitectura
por capas que el resto del proyecto:

```
src/
├── utils/mock.generator.js     ***REMOVED*** Genera los datos falsos (nombres, emails,
│                                  direcciones, items, etc). No conoce
│                                  Express ni Mongoose. Usa ROLES,
│                                  ORDER_STATUS, DELIVERY_STATUS y PRIORITY
│                                  de constants/index.js: no hay strings
│                                  sueltos ni valores escritos a mano.
├── services/mock.service.js    ***REMOVED*** Orquesta la generación y decide qué se
│                                  guarda y qué no.
├── controllers/mock.controller.js  ***REMOVED*** Capa HTTP: lee req, llama al service.
└── routes/mocks.routes.js      ***REMOVED*** Router montado en /api/mocks.
```

`mock.service.js` no reinventa las reglas de negocio: para insertar datos
reales reutiliza `UserService`, `OrderService` y `DeliveryService` (los
mismos que usan los endpoints normales de `/api/users`, `/api/orders` y
`/api/deliveries`). Esto garantiza que un pedido de prueba nace en estado
`created` igual que uno real, que una entrega solo puede crearse sobre un
pedido `created` y un usuario con rol `driver`, etc. Los repositorios
(`userRepository`, `orderRepository`) solo se usan para **leer** usuarios o
pedidos existentes y elegir con cuáles relacionar los nuevos datos.

***REMOVED******REMOVED******REMOVED*** 1. Generar datos simulados sin guardarlos (preview)

Estos endpoints solo devuelven JSON en la respuesta; no escriben nada en
MongoDB. Sirven para inspeccionar rápidamente la forma de los datos o para
alimentar un frontend/mock sin depender de una base levantada.

| Método | Ruta                | Query params                                  | Qué devuelve |
|--------|----------------------|------------------------------------------------|---------------|
| GET    | `/api/mocks/users`       | `count` (default 10, máx. 100), `role` (opcional: `admin`\|`customer`\|`driver`\|`store`) | Usuarios simulados |
| GET    | `/api/mocks/orders`      | `count` (default 10, máx. 100)                  | Pedidos simulados (customer con ID simulado) |
| GET    | `/api/mocks/deliveries`  | `count` (default 10, máx. 100)                  | Entregas simuladas (order y driver con ID simulado) |
| GET    | `/api/mocks/full`        | `users`, `orders`, `deliveries` (default 5 c/u, máx. 100 c/u) | Dataset completo **relacionado entre sí**: los pedidos usan como `customer` un `_id` de los usuarios simulados en la misma respuesta, y las entregas usan como `order`/`driver` un `_id` de esos mismos pedidos/usuarios. |

Ejemplos:

```bash
***REMOVED*** 5 usuarios simulados, cualquier rol
curl "http://localhost:3000/api/mocks/users?count=5"

***REMOVED*** 3 repartidores simulados
curl "http://localhost:3000/api/mocks/users?count=3&role=driver"

***REMOVED*** 10 pedidos simulados
curl "http://localhost:3000/api/mocks/orders?count=10"

***REMOVED*** Dataset chico y coherente para revisar relaciones de un vistazo
curl "http://localhost:3000/api/mocks/full?users=4&orders=3&deliveries=2"
```

Notas sobre el preview:

- `role=driver` (o cualquier otro rol) filtra el rol generado; si se manda
  un valor fuera de `ROLES` responde `400`.
- En `/users`, `/orders` y `/deliveries` (a diferencia de `/full`) cada
  entidad se genera de forma independiente, así que las referencias
  (`customer`, `order`, `driver`) son IDs con formato válido de Mongo pero
  **no corresponden a documentos reales**. Para ver relaciones consistentes
  sin tocar la base, usar `/full`.
- La respuesta siempre incluye `"persisted": false` para dejar explícito
  que nada se guardó.

***REMOVED******REMOVED******REMOVED*** 2. Insertar datos de prueba reales en MongoDB (seed)

```
POST /api/mocks/generate
Content-Type: application/json

{
  "users": 10,
  "orders": 10,
  "deliveries": 5
}
```

Los tres campos son opcionales (default `users: 10`, `orders: 10`,
`deliveries: 5`) y tienen un tope de 200 cada uno para evitar cargas
accidentales enormes.

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/mocks/generate \
  -H "Content-Type: application/json" \
  -d '{"users": 8, "orders": 6, "deliveries": 4}'
```

Qué hace, en orden:

1. **Usuarios**: crea `users` usuarios repartidos en un ciclo de roles
   (`customer, customer, driver, store, ...`) que asegura tener clientes y
   repartidores disponibles. El rol `admin` **no se genera acá a propósito**:
   `UserService.createUser` rechaza el alta pública de administradores, y el
   seeding respeta esa regla en vez de saltearla con un insert directo.
2. **Pedidos**: crea `orders` pedidos, cada uno asignado a un `customer` real
   (uno de los recién creados o, si `users` fue `0`, uno ya existente en la
   base). Si no hay ningún `customer` disponible, responde `400` con un
   mensaje explicando que hay que generar usuarios primero.
3. **Entregas**: crea `deliveries` entregas, cada una asociada a un pedido
   real en estado `created` y a un usuario real con rol `driver`. Si se piden
   más entregas que pedidos `created` disponibles, se crean todas las que se
   puedan y la respuesta incluye un `warning` explicando cuántas se crearon y
   por qué. Si no hay ningún `driver` disponible, no se crea ninguna entrega
   y se informa por `warning` (no corta la carga de usuarios/pedidos que sí
   se pudo hacer).

La respuesta (`201`) incluye un resumen y los documentos creados:

```json
{
  "persisted": true,
  "summary": {
    "users": { "requested": 8, "created": 8 },
    "orders": { "requested": 6, "created": 6 },
    "deliveries": { "requested": 4, "created": 4 },
    "warnings": []
  },
  "data": {
    "users": [ /* usuarios creados */ ],
    "orders": [ /* pedidos creados */ ],
    "deliveries": [ /* entregas creadas */ ]
  }
}
```

Cómo probar rápido que las relaciones quedaron bien armadas:

```bash
***REMOVED*** 1. Sembrar datos
curl -X POST http://localhost:3000/api/mocks/generate \
  -H "Content-Type: application/json" -d '{"users": 8, "orders": 6, "deliveries": 4}'

***REMOVED*** 2. Verificar en los endpoints normales de la API
curl http://localhost:3000/api/users
curl http://localhost:3000/api/orders      ***REMOVED*** cada pedido trae el customer populado
curl http://localhost:3000/api/deliveries  ***REMOVED*** cada entrega trae order y driver populados
```

Este endpoint es **aditivo**: no borra datos existentes, solo agrega. Para
limpiar la base de prueba entre corridas, hacerlo manualmente (por ejemplo
`mongosh` contra la base de desarrollo) — el módulo de mocking
deliberadamente no expone un endpoint de borrado masivo.
