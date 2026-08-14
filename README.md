***REMOVED*** ShipNow API

API de logística de ShipNow, refactorizada a una arquitectura profesional
por capas (**Controller → Service → Repository**) con configuración de
entorno validada al arranque.

> 📋 **Este proyecto usa [Winston](https://github.com/winstonjs/winston) para logging** — ver sección [Sistema de logging](***REMOVED***sistema-de-logging).
>
> 📖 **La API está documentada con Swagger/OpenAPI** en `/api/docs` — ver sección [Documentación de la API (Swagger)](***REMOVED***documentación-de-la-api-swagger).

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
├── config/          ***REMOVED*** Configuración de entorno, logger (Winston) y Swagger
├── constants/        ***REMOVED*** Diccionario de roles y estados (Object.freeze)
├── docs/              ***REMOVED*** Documentación OpenAPI (@openapi), separada de routes/
├── models/            ***REMOVED*** Esquemas de Mongoose (sin lógica de negocio)
├── repositories/     ***REMOVED*** Único lugar que conoce Mongoose/MongoDB
├── services/          ***REMOVED*** Lógica de negocio (incluye mock.service.js)
├── controllers/       ***REMOVED*** Única puerta de entrada HTTP (req/res)
├── routes/            ***REMOVED*** Solo conectan path + método HTTP con el Controller
├── errors/            ***REMOVED*** Capa de manejo de errores (codigos, diccionario, clases de dominio)
├── middlewares/       ***REMOVED*** Manejo central de errores y 404
├── utils/             ***REMOVED*** Helpers puros (mock.generator.js)
├── app.js             ***REMOVED*** Configuración de Express, Swagger y montaje de rutas
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

***REMOVED******REMOVED*** Documentación de la API (Swagger)

Con el servidor levantado, la documentación interactiva está disponible en:

```
http://localhost:3000/api/docs
```

Desde ahí se puede ver cada endpoint agrupado por módulo y probarlo directamente
con el botón **"Try it out"** (Swagger UI arma y ejecuta el `curl` real contra
el servidor local).

***REMOVED******REMOVED******REMOVED*** Qué está documentado

Todos los endpoints montados en `app.js`, agrupados por tag:

| Tag           | Cubre                                                              |
|---------------|---------------------------------------------------------------------|
| **Users**       | `/api/users` — alta, consulta y baja de usuarios                    |
| **Orders**      | `/api/orders` — alta, consulta, cambio de estado y baja de pedidos  |
| **Deliveries**  | `/api/deliveries` — alta, consulta, cambio de estado y baja de entregas |
| **Products**    | `/api/products` — alta, consulta, actualización y baja de productos (módulo real de la API; no pedido explícitamente en el enunciado, se agregó igual para no dejar una ruta viva sin documentar) |
| **Mocks**       | `/api/mocks` — generación de datos simulados (preview) y carga de datos de prueba reales en MongoDB (seed) |
| **Logger**      | `/api/logs/test` — endpoint interno de validación del logger (aclarado explícitamente como herramienta de testing, no funcionalidad de negocio) |

Cada endpoint documenta método HTTP, ruta, parámetros de ruta/query (cuando
aplica), el `body` esperado y todas las respuestas reales (éxito y error),
con ejemplos concretos tomados del comportamiento real de los Services (no
hay respuestas ni errores "inventados": lo que se ve en `/api/docs` es lo que
la API efectivamente devuelve).

***REMOVED******REMOVED******REMOVED*** Schemas reutilizables

En vez de repetir la forma de cada entidad en cada endpoint, `/api/docs`
define schemas reutilizables (`components.schemas`) que se referencian con
`$ref` en todas las rutas que los necesitan:

- `User` / `UserInput` — y `UserSummary`, la versión reducida que queda
  populada dentro de un pedido o una entrega.
- `Order` / `OrderInput` / `OrderStatusUpdate`.
- `Delivery` / `DeliveryInput` / `DeliveryStatusUpdate`.
- `OrderItem` (item individual de un pedido).
- `ErrorResponse` — forma uniforme de **toda** respuesta de error de la API
  (ver [Manejo centralizado de errores](***REMOVED***manejo-centralizado-de-errores)),
  con el `code` documentado como enum con los 19 códigos reales de
  `errorCodes.js`.
- `SuccessResponse` — respuesta genérica `{ "message": "..." }` que devuelven
  los endpoints de baja (`DELETE`).
- Además: `Product` / `ProductInput`, y los schemas propios del módulo de
  mocks (`MockUser`, `MockOrder`, `MockDelivery`, `MockSeedRequest`,
  `MockSeedResponse`).

***REMOVED******REMOVED******REMOVED*** Cómo está organizado el código de la documentación

La configuración de Swagger está **separada de la lógica de rutas**, en dos
carpetas distintas:

```
src/
├── config/
│   └── swagger.config.js   ***REMOVED*** Arma el spec con swagger-jsdoc y expone
│                              setupSwagger(app), la única función que
│                              app.js llama para montar Swagger UI en
│                              /api/docs. No conoce routes/ ni controllers/.
└── docs/
    ├── schemas.docs.js      ***REMOVED*** components.schemas reutilizables
    ├── users.docs.js        ***REMOVED*** paths de /api/users (tag Users)
    ├── orders.docs.js       ***REMOVED*** paths de /api/orders (tag Orders)
    ├── deliveries.docs.js   ***REMOVED*** paths de /api/deliveries (tag Deliveries)
    ├── products.docs.js     ***REMOVED*** paths de /api/products (tag Products)
    ├── mocks.docs.js        ***REMOVED*** paths de /api/mocks (tag Mocks) + sus schemas
    └── logs.docs.js         ***REMOVED*** path de /api/logs/test (tag Logger)
```

Los archivos de `src/docs/` **solo contienen bloques de comentarios
`@openapi`**: no exportan nada ejecutable ni son importados por
`src/routes/` ni por los Controllers. `swagger-jsdoc` los lee directamente
mediante el glob `apis: ['./src/docs/*.docs.js']` configurado en
`swagger.config.js`. `app.js` no arma la documentación: solo importa
`setupSwagger` y la llama una vez, igual que monta cualquier otro router.

***REMOVED******REMOVED******REMOVED*** Aclaraciones para probar los endpoints

- La API **no implementa autenticación**: todos los endpoints de `/api/docs`
  son de acceso libre, sin token ni API key.
- Para probar endpoints que dependen de datos existentes (por ejemplo,
  crear una entrega necesita un pedido en estado `created` y un usuario con
  rol `driver`), lo más rápido es sembrar la base primero con
  `POST /api/mocks/generate` (ver
  [Mocking y carga de datos de prueba](***REMOVED***mocking-y-carga-de-datos-de-prueba))
  y después copiar los `_id` reales de la respuesta.
- Los ejemplos de error que se ven en cada endpoint (`400`, `403`, `404`,
  `409`, `500`) son los mensajes y `code` reales que devuelve
  `errorDictionary.js`, no texto genérico.

***REMOVED******REMOVED*** Manejo centralizado de errores

Ninguna ruta ni controller arma una respuesta de error a mano. El flujo es
siempre el mismo:

```
Service detecta el problema → throw <ErrorDeDominio>
Controller → catch (error) { next(error) }        (nunca responde el error el mismo)
Middleware global (errorHandler) → arma la respuesta HTTP final
```

Vive en dos carpetas:

```
src/
├── errors/
│   ├── errorCodes.js        ***REMOVED*** Enum de codigos de error (VALIDATION_ERROR, USER_NOT_FOUND, ...)
│   ├── errorDictionary.js   ***REMOVED*** codigo -> { statusCode, message por defecto }
│   ├── ApiError.js          ***REMOVED*** Clase base: toda excepcion de dominio nace de un codigo del diccionario
│   ├── notFound.errors.js   ***REMOVED*** UserNotFoundError, OrderNotFoundError, DeliveryNotFoundError, ProductNotFoundError
│   ├── conflict.errors.js   ***REMOVED*** DuplicateEmailError, OrderAlreadyProcessedError, OrderAlreadyDeliveredError, DeliveryAlreadyCompletedError
│   ├── mock.errors.js       ***REMOVED*** InvalidMockQuantityError, MockGenerationError
│   ├── ValidationError.js / InvalidStatusError.js / InvalidRoleError.js / ForbiddenActionError.js
│   └── index.js             ***REMOVED*** Barrel: unico punto de import para el resto de la app
└── middlewares/
    └── errorHandler.js      ***REMOVED*** errorHandler (siempre al final de app.js) + notFoundHandler (404 de ruta)
```

***REMOVED******REMOVED******REMOVED*** Por que un diccionario en vez de un `statusCode` en cada `throw`

Antes, cada Service decidia el status HTTP a mano: `new ApiError(404, 'Usuario no encontrado')`,
`new ApiError(409, 'El email ya esta registrado')`, repitiendo el numero y el mensaje en cada
lugar que necesitaba lanzar ese error. Ahora `ERROR_DICTIONARY` es la unica fuente de verdad
sobre "que status y que mensaje por defecto le corresponde a cada codigo", y las clases de
`src/errors/` son atajos con nombre para lanzar esos codigos (`throw new UserNotFoundError()`).
Sumar un caso de error nuevo es: (1) agregar la constante en `errorCodes.js`, (2) agregar su
entrada en `errorDictionary.js`, (3) opcionalmente crear una clase con nombre en `src/errors/`
para que el Service no tenga que conocer el codigo exacto.

***REMOVED******REMOVED******REMOVED*** Formato de respuesta

Toda respuesta de error de la API (400, 403, 404, 409, 500) tiene la misma forma:

```json
{
  "success": false,
  "error": {
    "code": "ORDER_ALREADY_PROCESSED",
    "message": "El pedido ya fue asignado o procesado (estado actual: assigned)",
    "details": { "currentStatus": "assigned" }
  }
}
```

`details` es opcional: solo aparece cuando el error tiene informacion adicional util para el
cliente (valores permitidos de un estado invalido, el campo que fallo una validacion, etc.).

***REMOVED******REMOVED******REMOVED*** Errores que el middleware traduce aunque no los haya lanzado un Service

`errorHandler` tambien normaliza errores "externos" que Mongoose o Express pueden tirar antes
de que la logica de negocio llegue a evaluarse, para que la respuesta sea igual de uniforme:

| Origen | Ejemplo | Se traduce a |
|---|---|---|
| Mongoose `CastError` | `GET /api/orders/123` (ID con formato invalido) | `400 INVALID_ID` |
| Mongoose `ValidationError` de esquema | Falta un campo requerido que el Service no llego a chequear | `400 VALIDATION_ERROR` con el detalle de cada campo |
| MongoDB `E11000` (clave duplicada) | Condicion de carrera con el mismo email | `409 DUPLICATE_EMAIL` / `409 DUPLICATE_KEY` |
| `express.json()` | Body con JSON malformado | `400 MALFORMED_JSON` |
| Cualquier otro error no reconocido | Bug o falla inesperada | `500 INTERNAL_ERROR` (se loguea completo en el servidor, nunca se expone el detalle interno al cliente) |

***REMOVED******REMOVED******REMOVED*** Validaciones del módulo de mocks

`mock.service.js` usa la misma capa de errores para sus dos responsabilidades:

- **Cantidad invalida** (`count`, `users`, `orders`, `deliveries`): si el valor no es numerico o
  es negativo, se rechaza con `400 INVALID_MOCK_QUANTITY`, indicando en `details` cual parametro
  fallo y que valor se recibio. Un valor valido mayor al maximo permitido no es un error: se
  recorta (`clamp`) al tope, como ya hacia antes.
- **Rol invalido** en `/api/mocks/users?role=...`: `400 INVALID_ROLE`.
- **Fallas durante la carga en MongoDB** (`POST /api/mocks/generate`): si algo inesperado
  interrumpe el seeding (conexion caida, error de escritura no controlado, etc.), no se deja
  escapar el error crudo de Mongoose: se loguea completo en el servidor y se responde
  `500 MOCK_GENERATION_FAILED` con un mensaje controlado. Si en cambio la falla es una regla de
  negocio ya controlada (por ejemplo, `400 VALIDATION_ERROR` porque no hay usuarios "customer"
  para asociar pedidos), ese error se propaga tal cual, sin envolverlo.

***REMOVED******REMOVED*** Sistema de logging

ShipNow reemplaza el uso de `console.log`/`console.error` sueltos por un
logger centralizado construido sobre **Winston**, integrado con la capa de
manejo de errores y con persistencia en archivos rotados.

```
src/config/
└── logger.config.js   ***REMOVED*** Unica configuracion de Winston de todo el proyecto
```

Ningún otro archivo crea una instancia propia de `winston.createLogger()`:
todos importan el logger ya configurado desde `src/config/logger.config.js`
(o desde el barrel `src/config/index.js`, como `{ logger }`).

***REMOVED******REMOVED******REMOVED*** Niveles de log

Se definieron 6 niveles personalizados (no los niveles npm por defecto de
Winston), de más a menos severo:

| Nivel | Severidad | Uso en ShipNow |
|---|---|---|
| `fatal` | 0 (máxima) | Fallas que impiden que la app funcione (ej: no se pudo conectar a MongoDB al arrancar) |
| `error` | 1 | Errores inesperados o de servidor (5xx) que el servidor logra responder igual |
| `warning` | 2 | Errores de negocio esperados (4xx): validaciones, recursos no encontrados, conflictos, rutas inexistentes |
| `info` | 3 | Eventos normales y exitosos: arranque del servidor, conexión a Mongo, creación de pedidos/entregas, resultado de un seed de mocks |
| `http` | 4 | Reservado para tráfico HTTP (usado hoy solo por el endpoint de prueba del logger) |
| `debug` | 5 (mínima) | Detalle de desarrollo: simulación de envío de email, generación de datos mock en memoria (preview) |

***REMOVED******REMOVED******REMOVED*** Comportamiento según el entorno

El nivel mínimo que efectivamente se registra depende de `NODE_ENV`
(variable ya validada por `src/config/env.config.js`, ver sección
[Variables de entorno](***REMOVED***variables-de-entorno)):

| `NODE_ENV` | Nivel mínimo | Niveles visibles |
|---|---|---|
| `development` | `debug` | Todos: `debug, http, info, warning, error, fatal` |
| `production` | `info` | `info, warning, error, fatal` (se ocultan `debug` y `http`, más ruidosos y de menor valor fuera de desarrollo) |
| `test` | `warning` | `warning, error, fatal` |

Esto aplica tanto a la consola como al archivo `combined-*.log`. El archivo
`error-*.log`, en cambio, **siempre** registra únicamente `error` y `fatal`,
sin importar el entorno (ver más abajo).

***REMOVED******REMOVED******REMOVED*** Integración con el manejo de errores

El middleware global (`src/middlewares/errorHandler.js`) usa el logger para
dejar registro de cada error que pasa por él, sin cambiar la respuesta HTTP
que recibe el cliente:

- Errores de negocio (4xx: `ValidationError`, `*NotFoundError`, conflictos
  409, ruta inexistente) → se registran como **`warning`**.
- Errores de servidor (5xx, reconocidos o no) → se registran como
  **`error`**, incluyendo el stack trace completo.
- Fallas críticas de arranque (ej: no se pudo conectar a MongoDB) → se
  registran como **`fatal`** en `src/server.js`, antes de que el proceso
  termine con `process.exit(1)`.

El logger **complementa** el manejo de errores, no lo reemplaza: la
respuesta al cliente sigue siendo siempre la misma estructura uniforme
descrita en la sección anterior, se haya podido loguear o no.

***REMOVED******REMOVED******REMOVED*** Persistencia en archivos y rotación

Los logs se persisten en la carpeta `logs/` (creada automáticamente al
arrancar la app si no existe), usando `winston-daily-rotate-file`:

```
logs/
├── .gitkeep                      ***REMOVED*** unico archivo versionado en Git
├── combined-YYYY-MM-DD.log       ***REMOVED*** todos los niveles que pasen el filtro del entorno
├── error-YYYY-MM-DD.log          ***REMOVED*** SOLO niveles error y fatal, sin importar el entorno
└── error-YYYY-MM-DD.log.N.gz     ***REMOVED*** archivos rotados y comprimidos automaticamente
```

Política de rotación:

| Archivo | Rota por fecha | Rota por tamaño | Retención | Compresión |
|---|---|---|---|---|
| `error-*.log` | Un archivo por día | Sí, al superar 20MB (`error-YYYY-MM-DD.log.1`, `.log.2`, ...) | 30 días | Los archivos rotados se comprimen a `.gz` |
| `combined-*.log` | Un archivo por día | Sí, al superar 20MB | 14 días | Los archivos rotados se comprimen a `.gz` |

> **Nota:** el nombre de archivo incluye la fecha (`error-2026-08-01.log`),
> a diferencia de un nombre fijo como `error.log`. Es el comportamiento
> esperado de la rotación por fecha: el contenido —solo `error`/`fatal`—
> se mantiene igual sin importar el nombre exacto del archivo del día.

***REMOVED******REMOVED******REMOVED*** Qué se ignora en Git

```gitignore
logs/*
!logs/.gitkeep
*.log
```

Solo `logs/.gitkeep` se versiona (documenta que la carpeta existe y es
parte del diseño del proyecto). Todo el resto del contenido de `logs/`
—incluidos los `.log`, `.log.N` y `.log.N.gz`— se genera en tiempo de
ejecución y nunca se sube al repositorio.

***REMOVED******REMOVED******REMOVED*** Endpoint de prueba del logger

Existe un endpoint exclusivamente de testing interno (no representa
ninguna funcionalidad de negocio de ShipNow) para verificar rápidamente
que los 6 niveles funcionan en consola y en archivo:

```
GET /api/logs/test
```

```bash
curl http://localhost:3000/api/logs/test
```

Dispara un mensaje de ejemplo en cada nivel (`debug`, `http`, `info`,
`warning`, `error`, `fatal`) y devuelve un JSON confirmando cuáles se
ejecutaron:

```json
{
  "message": "Prueba de logger ejecutada. Revisa la consola y los archivos en /logs.",
  "note": "El nivel \"fatal\" se registro sin detener el servidor, unicamente con fines de prueba.",
  "levelsTriggered": ["debug", "http", "info", "warning", "error", "fatal"],
  "timestamp": "2026-08-05T23:50:00.000Z"
}
```

El nivel `fatal` se registra únicamente con fines de prueba: a diferencia
de la falla real de conexión a MongoDB en `server.js`, este endpoint
**no** llama a `process.exit()`, para no tumbar el servidor en cada
prueba.

Qué revisar según el entorno:

```bash
***REMOVED*** En desarrollo: deberias ver los 6 niveles en consola
npm run dev
curl http://localhost:3000/api/logs/test

***REMOVED*** En produccion: solo deberian verse info, warning, error y fatal
NODE_ENV=production npm start
curl http://localhost:3000/api/logs/test

***REMOVED*** El archivo de errores solo debe tener error y fatal, en cualquier entorno
cat logs/error-$(date +%Y-%m-%d).log
```

***REMOVED******REMOVED*** Variables de entorno

| Variable      | Descripción                                   | Ejemplo                              |
|---------------|------------------------------------------------|---------------------------------------|
| `PORT`        | Puerto HTTP del servidor                        | `3000`                                |
| `MONGODB_URI` | Cadena de conexión a MongoDB                    | `mongodb://localhost:27017/shipnow`   |
| `NODE_ENV`    | Entorno de ejecución                            | `development`                         |

***REMOVED******REMOVED*** Endpoints

| Método | Ruta                          | Descripción                |
|--------|-------------------------------|-----------------------------|
| GET    | /api/docs                     | Documentación interactiva (Swagger UI) — ver [Documentación de la API (Swagger)](***REMOVED***documentación-de-la-api-swagger) |
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
| GET    | /api/logs/test                   | Endpoint interno de testing: dispara los 6 niveles del logger |

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
