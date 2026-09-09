***REMOVED*** ShipNow API

API de logística de ShipNow, refactorizada a una arquitectura profesional
por capas (**Controller → Service → Repository**) con configuración de
entorno validada al arranque.

> 📋 **Este proyecto usa [Winston](https://github.com/winstonjs/winston) para logging** — ver sección [Sistema de logging](***REMOVED***sistema-de-logging).
>
> 📖 **La API está documentada con Swagger/OpenAPI** en `/api/docs` — ver sección [Documentación de la API (Swagger)](***REMOVED***documentación-de-la-api-swagger).
>
> 🧪 **Hay una suite de tests funcionales con Mocha, Chai y Supertest** — ver sección [Testing funcional](***REMOVED***testing-funcional-mocha-chai-y-supertest).

***REMOVED******REMOVED*** Tecnologías

- **Node.js** + **Express** — servidor HTTP y enrutamiento.
- **MongoDB** + **Mongoose** — persistencia y modelado de datos.
- **Winston** + **winston-daily-rotate-file** — logging centralizado con rotación.
- **Multer** — carga de archivos multipart/form-data.
- **Swagger** (`swagger-jsdoc` + `swagger-ui-express`) — documentación interactiva.
- **Mocha** + **Chai** + **Supertest** — testing funcional end-to-end.
- **Docker** + **docker-compose** — contenerización y entorno reproducible.
- **ESLint** — linting de código.

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
├── app.js             ***REMOVED*** Configuración de Express, Swagger y montaje de rutas (SIN levantar el server)
└── server.js          ***REMOVED*** Composition root: conecta a Mongo y levanta el server

test/
├── setup.js           ***REMOVED*** Entorno de testing + conexión/limpieza de Mongo (ver Testing funcional)
├── helpers/
│   └── fixtures.js    ***REMOVED*** Datos de prueba controlados, creados via la propia API
└── *.test.js          ***REMOVED*** Un archivo por módulo (users, orders, mocks, logs, docs, 404)
```

`app.js` exporta la app de Express ya configurada pero **sin** llamar a
`app.listen(...)` (eso vive únicamente en `server.js`). Por eso Supertest
puede importar `app.js` directamente en los tests y hacerle peticiones sin
abrir un puerto real.

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
| Multer `MulterError` (`LIMIT_FILE_SIZE`) | Archivo mas pesado que el limite configurado | `400 FILE_TOO_LARGE` |
| Multer `MulterError` (`LIMIT_UNEXPECTED_FILE`) | El archivo llego en un campo distinto a `file` | `400 UNEXPECTED_FILE_FIELD` |
| Cualquier otro error no reconocido | Bug o falla inesperada | `500 INTERNAL_ERROR` (se loguea completo en el servidor, nunca se expone el detalle interno al cliente) |

***REMOVED******REMOVED******REMOVED*** Validaciones del módulo de carga de archivos

`upload.service.js` combina dos fuentes de error distintas, ambas terminando en el mismo
`ApiError`: las que detecta Multer mecanicamente (antes de que el archivo llegue al Service) y las
que son reglas de negocio (despues):

- **Archivo con tipo no permitido**: lo rechaza el `fileFilter` de `multer.config.js` lanzando
  `400 INVALID_FILE_TYPE` directamente (nunca llega a guardarse en disco).
- **Archivo faltante**: Multer no lo considera un error (un campo de archivo vacio simplemente no
  llena `req.file`), asi que lo valida el Service: `400 FILE_REQUIRED`.
- **Tipo de documento invalido o faltante**: `400 INVALID_DOCUMENT_TYPE` (no pertenece al enum
  `DOCUMENT_TYPES`) o `400 VALIDATION_ERROR` (falta en el endpoint de documentos de usuario, donde
  es obligatorio).
- **Entidad destino inexistente**: `404 USER_NOT_FOUND` / `404 DELIVERY_NOT_FOUND`.
- **Limpieza de archivos huerfanos**: como Multer ya escribio el archivo en disco antes de que el
  Service pueda validar el tipo de documento o la existencia de la entidad, si cualquiera de esas
  dos validaciones falla el Service borra el archivo recien guardado (`removeUploadedFile`) antes
  de propagar el error. Un archivo nunca queda en `uploads/` sin su metadato asociado en Mongo.

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

***REMOVED******REMOVED*** Performance

- **Paginación en los listados grandes.** `GET /api/users`,
  `GET /api/orders`, `GET /api/deliveries` y `GET /api/products` ya NO
  devuelven la colección completa: aceptan `?page` y `?limit` (por
  defecto `page=1`, `limit=20`, tope `limit=100`) y responden
  `{ data: [...], pagination: { page, limit, total, totalPages } }`.
  Sin parámetros, igual se aplica el límite por defecto — nunca se
  devuelve todo sin control. Además admiten filtros: `role` en users,
  `status`/`customer` en orders, `status`/`driver` en deliveries,
  `category`/`status` en products (ya existía).

  ```bash
  curl "http://localhost:3000/api/orders?status=created&page=2&limit=10"
  ```

  > Nota de compatibilidad: esto cambia el shape de la respuesta de esos
  > cuatro endpoints (antes era un arreglo plano). Cualquier frontend o
  > script que consuma `/api/users`, `/api/orders`, `/api/deliveries` o
  > `/api/products` debe leer `response.data` en vez del body completo.
  > Las llamadas internas del proyecto (ej. `mock.service.js` buscando
  > "todos los customers disponibles" para el seeding) siguen trayendo
  > el set completo: la paginación se aplica en la capa de Service que
  > atiende peticiones HTTP, no en el Repository.

- **Carga de archivos con límites, ya presente y sin cambios de fondo**:
  tamaño máximo 5MB, tipos MIME restringidos
  (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`), errores
  controlados (`FILE_TOO_LARGE`, `INVALID_FILE_TYPE`, etc.), archivos
  guardados fuera del repo (`uploads/`, en `.gitignore`) y limpieza de
  archivos huérfanos si la validación de negocio falla después de que
  Multer ya escribió en disco (ver `src/services/upload.service.js`).
  Sigue siendo almacenamiento en disco local: para un ambiente
  productivo con múltiples réplicas conviene migrar a un storage externo
  (S3 o similar) — queda fuera del alcance de esta entrega, documentado
  como limitación conocida.

- **Compresión de respuestas.** Se agregó el middleware `compression`
  (gzip) en `src/app.js`: los listados con `populate` (pedidos con
  cliente y entrega, entregas con pedido y repartidor) pueden pesar
  varios KB por respuesta: comprimirlos reduce el tráfico real sin tocar
  el body que recibe el cliente.

- **Límite de tamaño de body JSON.** `express.json()` y
  `express.urlencoded()` ahora tienen `limit: '1mb'` explícito, para que
  un body inusualmente grande no llegue a consumir memoria antes de
  cualquier validación de negocio. Los uploads de archivos van por
  `multipart/form-data` (Multer), que tiene su propio límite de 5MB.

- **Sin queries sin filtro ni operaciones sincrónicas por request.** Los
  repositorios nunca hacen `Model.find({})` sin acotar en los endpoints
  HTTP de listado (ver paginación arriba). Las únicas operaciones
  síncronas del proyecto (`fs.existsSync`/`fs.mkdirSync` en
  `logger.config.js` y `multer.config.js`) corren una sola vez al
  arrancar el proceso, antes de levantar el servidor — no ocurren en el
  Event Loop de ningún request, así que no lo bloquean.

***REMOVED******REMOVED*** Preparación para producción

***REMOVED******REMOVED******REMOVED*** Variables de entorno

Hay tres plantillas, una por entorno, todas fuera del repo real (el
`.gitignore` ya ignora `.env`, `.env.local` y `.env.test`; el `.env`
real de producción tampoco debe subirse nunca):

| Archivo                    | Uso                                                |
|-----------------------------|-----------------------------------------------------|
| `.env.example`               | Desarrollo local (`npm run dev`)                     |
| `.env.test.example`           | Suite de tests (Mocha/Chai/Supertest, ver `test/setup.js`) |
| `.env.production.example`     | Plantilla para un despliegue real                    |

Variables cubiertas (mínimo pedido: puerto, URI de base de datos,
entorno, secreto JWT, nivel de logs, URL de servicios externos):

| Variable                  | Obligatoria | Descripción |
|-----------------------------|:-----------:|--------------|
| `PORT`                       | Sí          | Puerto HTTP del servidor |
| `MONGODB_URI`                 | Sí          | Cadena de conexión a MongoDB |
| `NODE_ENV`                    | Sí          | `development` \| `production` \| `test` |
| `LOG_LEVEL`                   | No          | Nivel mínimo de log; si se omite, se infiere de `NODE_ENV` |
| `JWT_SECRET`                  | No*         | Reservado para cuando se agregue autenticación (esta versión de la API no implementa auth) |
| `CORS_ORIGIN`                 | No          | Origen(es) permitido(s) por CORS (`*` en dev, dominio real en producción) |
| `EMAIL_SERVICE_URL`           | No          | URL de un proveedor real de email (hoy el envío está simulado con logs) |
| `ENABLE_INTERNAL_ROUTES`      | No          | Fuerza Swagger/`/api/mocks`/`/api/logs` en producción (ver más abajo) |

\* `JWT_SECRET` no es obligatoria hoy porque no hay autenticación
implementada. El día que se agregue login/JWT, debe sumarse a la lista
de variables críticas en `src/config/env.config.js`.

Ningún valor sensible está escrito en el código: todo se lee desde
`process.env` a través de `src/config/env.config.js`, el único archivo
del proyecto que debe tocar `process.env` directamente.

***REMOVED******REMOVED******REMOVED*** Validación al arrancar

`src/config/env.config.js` valida, antes de conectar a Mongo o levantar
el servidor:

- Que `PORT`, `MONGODB_URI` y `NODE_ENV` estén definidas.
- Que `NODE_ENV` sea uno de `development`/`production`/`test`.
- Que `PORT` sea un número de puerto válido.

Si algo falla, lanza un error descriptivo y el proceso no arranca (no
hay ningún camino en el que la app quede "a medias" sirviendo tráfico
sin su configuración completa).

```bash
$ PORT= npm start
***REMOVED*** [config] Faltan variables de entorno obligatorias: PORT. Revisa tu
***REMOVED*** archivo .env (podes tomar como referencia .env.example).
```

***REMOVED******REMOVED******REMOVED*** Health check

```
GET /api/health
```

Disponible en cualquier entorno (incluida producción), no depende de que
Mongo esté conectado y no expone nada sensible (ni la URI de Mongo, ni
secretos, ni stack traces):

```json
{
  "status": "ok",
  "environment": "production",
  "uptime": 128.4,
  "timestamp": "2026-09-02T15:30:00.000Z"
}
```

***REMOVED******REMOVED******REMOVED*** Endpoints internos en producción (criterio aplicado)

Swagger (`/api/docs`), `/api/mocks` y `/api/logs/test` **se deshabilitan
por defecto cuando `NODE_ENV=production`**. Razón: no son funcionalidad
de negocio real de ShipNow (son herramientas de desarrollo/QA), y en
particular `/api/mocks` puede escribir datos falsos directamente en la
base si alguien lo llama por error en producción.

En `development` y `test` quedan siempre disponibles.

Si un ambiente productivo real igual los necesita (por ejemplo, un
staging donde el equipo todavía usa Swagger para probar), se pueden
reactivar explícitamente con `ENABLE_INTERNAL_ROUTES=true`. La lógica
completa vive en `src/app.js`.

***REMOVED******REMOVED******REMOVED*** Apagado ordenado (graceful shutdown)

`src/server.js` escucha `SIGTERM`/`SIGINT` (las señales que Docker envía
al hacer `docker stop`): deja de aceptar conexiones nuevas, espera a que
terminen las peticiones en curso, cierra la conexión a MongoDB y recién
ahí termina el proceso — en vez de cortar conexiones HTTP de golpe.

***REMOVED******REMOVED*** Docker

***REMOVED******REMOVED******REMOVED*** Construir la imagen

```bash
docker build -t shipnow-api .
```

***REMOVED******REMOVED******REMOVED*** Ejecutar el contenedor

Con variables sueltas:

```bash
docker run -d \
  --name shipnow-api \
  -p 3000:3000 \
  -e PORT=3000 \
  -e MONGODB_URI="mongodb://host.docker.internal:27017/shipnow" \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  -e CORS_ORIGIN="https://tu-frontend-real.com" \
  shipnow-api
```

O pasando un archivo `.env` externo (copiar `.env.production.example`
como `.env.production`, completarlo, y NO commitearlo):

```bash
docker run -d \
  --name shipnow-api \
  -p 3000:3000 \
  --env-file .env.production \
  shipnow-api
```

Con `docker-compose` (levanta también una instancia de MongoDB para
probar todo junto):

```bash
docker compose up --build
```

***REMOVED******REMOVED******REMOVED*** Probar que quedó levantada

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/docs         ***REMOVED*** solo si ENABLE_INTERNAL_ROUTES=true en producción, o NODE_ENV != production
curl http://localhost:3000/api/products
```

***REMOVED******REMOVED******REMOVED*** Detalles de la imagen

- Base: `node:20-alpine`.
- Solo dependencias de producción (`npm ci --omit=dev`): eslint, mocha,
  chai, supertest y nodemon no viajan dentro de la imagen final.
- Corre como usuario no-root (`USER node`), no como root.
- Puerto expuesto: `3000` (mismo que `PORT` por defecto). Si se cambia
  `PORT` en runtime, hay que publicar ese otro puerto con `-p`.
- `logs/` y `uploads/` se pre-crean dentro de la imagen con el dueño
  correcto para que el usuario `node` pueda escribir ahí. Como el
  filesystem del contenedor es efímero, si se necesita conservar esos
  datos entre recreaciones del contenedor hay que montarlos como volumen
  (ver ejemplo en `docker-compose.yml`):

  ```bash
  docker run -d -p 3000:3000 --env-file .env.production \
    -v $(pwd)/logs:/app/logs \
    -v $(pwd)/uploads:/app/uploads \
    shipnow-api
  ```

***REMOVED******REMOVED******REMOVED*** Qué NO debe subirse al repo ni entrar a la imagen

- `.env`, `.env.local`, `.env.test`, `.env.production` (cualquier `.env`
  real, con valores verdaderos).
- `node_modules/` (se reinstala dentro de la imagen).
- `logs/` y `uploads/` (contenido generado en runtime; solo se versionan
  los `.gitkeep`).
- `.git/`, `coverage/`, archivos temporales (`*.log`, `.DS_Store`, etc.).
- `eslint.config.js` — excluido de la imagen final: es una dependencia de
  desarrollo (lint), no hace falta para correr la API en producción.

Todo esto está reflejado en `.gitignore` (repo) y `.dockerignore`
(imagen).

***REMOVED******REMOVED*** Resumen rápido de comandos

```bash
***REMOVED*** Desarrollo local
cp .env.example .env            ***REMOVED*** completar valores
npm install
npm run dev

***REMOVED*** Tests
cp .env.test.example .env.test  ***REMOVED*** completar valores (Mongo de testing)
npm test

***REMOVED*** Swagger (con el server corriendo)
open http://localhost:3000/api/docs

***REMOVED*** Docker
docker build -t shipnow-api .
docker run -d -p 3000:3000 --env-file .env.production shipnow-api
curl http://localhost:3000/api/health
```

***REMOVED******REMOVED*** Variables de entorno

| Variable      | Descripción                                   | Ejemplo                              |
|---------------|------------------------------------------------|---------------------------------------|
| `PORT`        | Puerto HTTP del servidor                        | `3000`                                |
| `MONGODB_URI` | Cadena de conexión a MongoDB                    | `mongodb://localhost:27017/shipnow`   |
| `NODE_ENV`    | Entorno de ejecución                            | `development`                         |

> Ver también [Preparación para producción → Variables de entorno](***REMOVED***variables-de-entorno-1)
> para el detalle completo de variables opcionales (`LOG_LEVEL`, `JWT_SECRET`,
> `CORS_ORIGIN`, `EMAIL_SERVICE_URL`, `ENABLE_INTERNAL_ROUTES`) y las plantillas
> por entorno (`.env.example`, `.env.test.example`, `.env.production.example`).

***REMOVED******REMOVED*** Endpoints

> ⚠️ **Nota de compatibilidad:** `GET /api/users`, `GET /api/orders`,
> `GET /api/deliveries` y `GET /api/products` ya no devuelven un arreglo
> plano: ahora devuelven `{ data: [...], pagination: { page, limit, total,
> totalPages } }`, y aceptan `?page`/`?limit` además de sus filtros
> habituales. Ver detalle en [Performance](***REMOVED***performance).

| Método | Ruta                          | Descripción                |
|--------|-------------------------------|-----------------------------|
| GET    | /api/docs                     | Documentación interactiva (Swagger UI) — ver [Documentación de la API (Swagger)](***REMOVED***documentación-de-la-api-swagger) |
| GET    | /api/health                    | Health check — ver [Preparación para producción](***REMOVED***preparación-para-producción) |
| GET    | /api/users                    | Listar usuarios (paginado, ver [Performance](***REMOVED***performance)) |
| GET    | /api/users/:uid                | Obtener usuario por ID        |
| POST   | /api/users                    | Crear usuario                |
| DELETE | /api/users/:uid                | Eliminar usuario              |
| POST   | /api/users/:uid/documents       | Cargar un documento de usuario (DNI, licencia, etc.) |
| GET    | /api/products                  | Listar productos (paginado, ver [Performance](***REMOVED***performance)) |
| GET    | /api/products/:pid              | Obtener producto por ID        |
| POST   | /api/products                  | Crear producto                |
| PUT    | /api/products/:pid              | Actualizar producto            |
| DELETE | /api/products/:pid              | Eliminar producto              |
| GET    | /api/orders                    | Listar pedidos (paginado, ver [Performance](***REMOVED***performance)) |
| GET    | /api/orders/:oid                | Obtener pedido por ID          |
| POST   | /api/orders                    | Crear pedido                  |
| PATCH  | /api/orders/:oid/status          | Actualizar estado pedido       |
| DELETE | /api/orders/:oid                | Eliminar pedido                |
| GET    | /api/deliveries                | Listar entregas (paginado, ver [Performance](***REMOVED***performance)) |
| GET    | /api/deliveries/:did             | Obtener entrega por ID          |
| POST   | /api/deliveries                | Crear entrega                  |
| PATCH  | /api/deliveries/:did/status       | Actualizar estado entrega       |
| DELETE | /api/deliveries/:did             | Eliminar entrega                |
| POST   | /api/deliveries/:did/proof        | Cargar un comprobante de entrega |
| GET    | /api/mocks/users                | Simular usuarios (no se guardan) |
| GET    | /api/mocks/orders                | Simular pedidos (no se guardan) |
| GET    | /api/mocks/deliveries            | Simular entregas (no se guardan)|
| GET    | /api/mocks/full                  | Simular dataset completo relacionado (no se guarda) |
| POST   | /api/mocks/generate              | Insertar datos de prueba reales en MongoDB |
| GET    | /api/logs/test                   | Endpoint interno de testing: dispara los 6 niveles del logger |

Ver la sección [Mocking y carga de datos de prueba](***REMOVED***mocking-y-carga-de-datos-de-prueba) para el
detalle de esos endpoints, y [Carga de archivos (Multer)](***REMOVED***carga-de-archivos-multer) para el
detalle de `/documents` y `/proof`.

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
- `DOCUMENT_TYPES`: `DNI`, `LICENSE`, `PROOF_OF_ADDRESS`, `DELIVERY_PROOF`, `OTHER`

***REMOVED******REMOVED*** Carga de archivos (Multer)

ShipNow permite subir documentos y comprobantes vía `multipart/form-data`, guardarlos en el
filesystem del servidor y asociarlos a una entidad existente (usuario o entrega). El archivo en sí
**nunca** se guarda en MongoDB: solo se persisten sus metadatos.

***REMOVED******REMOVED******REMOVED*** Configuración centralizada

Toda la configuración de Multer vive en `src/config/multer.config.js`, separada de los routers
(igual que Swagger vive separado en `swagger.config.js`). Define:

- **Dónde se guardan los archivos**: destino fijo por recurso, no dinámico por `documentType`. El
  `destination` de `multer.diskStorage` se evalúa mientras el form-data todavía se está
  parseando, así que depender ahí de otro campo del body sería frágil (solo funcionaría si ese
  campo llegó *antes* que el archivo). Para evitar ese acoplamiento al orden de los campos, cada
  endpoint tiene una carpeta fija y el `documentType` viaja como metadato, validado en el Service.
- **Cómo se nombran**: `timestamp-sufijo_aleatorio.extension`, nunca se reutiliza el nombre
  original (evita colisiones y problemas de path traversal).
- **Tipos aceptados**: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
- **Tamaño máximo**: 5MB por archivo.
- **Manejo de errores de carga**: ver [Validaciones del módulo de carga de archivos](***REMOVED***validaciones-del-módulo-de-carga-de-archivos).

***REMOVED******REMOVED******REMOVED*** Estructura de carpetas

```
uploads/
├── .gitkeep
├── users/            ***REMOVED*** Documentos de usuario (DNI, licencia, comprobante de domicilio, etc.)
│   └── .gitkeep
└── deliveries/        ***REMOVED*** Comprobantes de entrega (foto, firma del cliente, etc.)
    └── .gitkeep
```

`uploads/` está en `.gitignore` (mismo patrón que `logs/`): los archivos subidos nunca se suben al
repositorio, solo la estructura de carpetas vacía (`.gitkeep`).

***REMOVED******REMOVED******REMOVED*** Endpoints

**`POST /api/users/:uid/documents`** — campo de archivo `file` (obligatorio) + campo
`documentType` (obligatorio, uno de `DOCUMENT_TYPES`). Verifica que el usuario exista, valida el
archivo y el tipo de documento, y agrega el metadato a `user.documents`.

```bash
curl -X POST http://localhost:3000/api/users/<uid>/documents \
  -F "file=@./dni-frente.pdf" \
  -F "documentType=dni"
```

**`POST /api/deliveries/:did/proof`** — campo de archivo `file` (obligatorio) + campo
`documentType` opcional (si no se envía, se guarda como `comprobante_entrega`). Verifica que la
entrega exista, valida el archivo, y agrega el metadato a `delivery.documents`.

```bash
curl -X POST http://localhost:3000/api/deliveries/<did>/proof \
  -F "file=@./firma-cliente.jpg"
```

Ambas respuestas exitosas devuelven `201` con la entidad actualizada:

```json
{
  "message": "Documento cargado correctamente",
  "user": {
    "_id": "66f1a2b3c4d5e6f7a8b9c0d1",
    "...": "...",
    "documents": [
      {
        "_id": "66f1a2b3c4d5e6f7a8b9c0d5",
        "originalName": "dni-frente.pdf",
        "storedName": "1735000000000-482913746.pdf",
        "path": "uploads/users/1735000000000-482913746.pdf",
        "mimeType": "application/pdf",
        "size": 204800,
        "documentType": "dni",
        "uploadedAt": "2026-08-26T12:00:00.000Z"
      }
    ]
  }
}
```

Ambos endpoints están documentados como `multipart/form-data` en Swagger (`/api/docs`, tag
`Uploads`), con el nombre del campo de archivo, los campos adicionales, los tipos de documento
permitidos y todos los errores posibles con ejemplo.

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

> **Nota:** el seeding sigue usando `UserRepository`/`OrderRepository`
> directamente (no `/api/users` ni `/api/orders` vía HTTP) para leer "todos
> los customers disponibles" y elegir con qué relacionar los datos nuevos:
> esa lectura interna **no está paginada** (ver [Performance](***REMOVED***performance)),
> a diferencia de lo que devuelve `GET /api/users` o `GET /api/orders` cuando
> se los llama directamente por HTTP.

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
curl http://localhost:3000/api/users        ***REMOVED*** respuesta paginada: leer .data
curl http://localhost:3000/api/orders       ***REMOVED*** cada pedido trae el customer populado
curl http://localhost:3000/api/deliveries   ***REMOVED*** cada entrega trae order y driver populados
```

Este endpoint es **aditivo**: no borra datos existentes, solo agrega. Para
limpiar la base de prueba entre corridas, hacerlo manualmente (por ejemplo
`mongosh` contra la base de desarrollo) — el módulo de mocking
deliberadamente no expone un endpoint de borrado masivo.

***REMOVED******REMOVED*** Testing funcional (Mocha, Chai y Supertest)

***REMOVED******REMOVED******REMOVED*** Herramientas

| Herramienta | Rol |
|---|---|
| [Mocha](https://mochajs.org/) | Organiza y ejecuta la suite (`describe`/`it`, hooks, root hooks) |
| [Chai](https://www.chaijs.com/) | Aserciones (`expect(...)`) |
| [Supertest](https://github.com/ladjs/supertest) | Peticiones HTTP contra la app, sin necesidad de un puerto real |

Los tests importan `src/app.js` directamente (no `src/server.js`): como la
app de Express está separada del `app.listen(...)`, Supertest le hace
peticiones en memoria sin levantar ningún servidor.

***REMOVED******REMOVED******REMOVED*** Entorno de testing separado del de desarrollo

La suite usa su **propio archivo de variables de entorno** (`.env.test`,
nunca `.env`) y su **propia base de datos MongoDB**, distinta a la de
desarrollo/producción:

1. Copiar el ejemplo:

   ```bash
   cp .env.test.example .env.test
   ```

2. Completar `.env.test` con una `MONGODB_URI` que apunte a una base
   **exclusiva para tests** (por convención, con `_test` en el nombre —
   puede ser una instancia local o remota, cualquiera a la que ya tengas
   acceso):

   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/shipnow_test
   NODE_ENV=test
   ```

`test/setup.js` carga este archivo (con `dotenv`) **antes** de que
cualquier test importe la app, y corta la ejecución con un error
descriptivo si `MONGODB_URI` no está configurada o no "parece" de testing
— para evitar por accidente correr la limpieza automática (ver más abajo)
contra la base de desarrollo.

***REMOVED******REMOVED******REMOVED*** Cómo ejecutar los tests

```bash
npm test
```

Corre toda la suite una vez y termina. También existe un modo watch para
desarrollo:

```bash
npm run test:watch
```

La configuración de Mocha vive en `.mocharc.json` (patrón de specs,
timeout, y la carga de `test/setup.js` vía `require` antes de cualquier
archivo de test).

***REMOVED******REMOVED******REMOVED*** Qué módulos están cubiertos

| Archivo | Endpoints cubiertos |
|---|---|
| `test/users.test.js` | `GET /api/users`, `GET /api/users/:uid`, `POST /api/users` |
| `test/orders.test.js` | `GET /api/orders`, `GET /api/orders/:oid`, `POST /api/orders`, `PATCH /api/orders/:oid/status` |
| `test/uploads.test.js` | `POST /api/users/:uid/documents`, `POST /api/deliveries/:did/proof` |
| `test/mocks.test.js` | `GET /api/mocks/users\|orders\|deliveries\|full`, `POST /api/mocks/generate` |
| `test/logs.test.js` | `GET /api/logs/test` |
| `test/docs.test.js` | `GET /api/docs` (Swagger UI) |
| `test/notFound.test.js` | Rutas inexistentes y métodos no soportados (404 uniforme) |

Cada archivo cubre casos exitosos **y** de error (datos incompletos,
recurso inexistente, estado inválido, cantidades de mock inválidas, ruta
inexistente), validando siempre el `status` HTTP **y** la forma del body
según `src/errors/` (`{ success: false, error: { code, message, details? } }`),
nunca solo "que responda" o "que falle". El caso de `GET /api/orders/:oid`
con un pedido inexistente, por ejemplo, corrobora el mismo `404` y el mismo
`ORDER_NOT_FOUND` que documenta `src/docs/orders.docs.js` en Swagger.

***REMOVED******REMOVED******REMOVED*** Datos de prueba y limpieza

- Los datos que cada test necesita (un usuario, un pedido) se crean **en
  el propio test**, llamando a la API real a través de los helpers de
  `test/helpers/fixtures.js` (`createUser`, `createCustomer`, `createDriver`,
  `createOrder`) — nunca se depende de datos cargados manualmente de
  antemano.
- **Limpieza automática:** un root hook global en `test/setup.js` (root
  hooks) vacía **todas** las colecciones de la base de testing después de
  **cada test individual** (`afterEach`). Esto garantiza que ningún test
  dependa de datos dejados por otro ni del orden en que Mocha decida
  correrlos — cada test parte siempre de una base vacía.

***REMOVED******REMOVED******REMOVED*** ¿Se necesita una base de datos de testing?

Sí. A diferencia de un mock en memoria, estos tests validan el flujo real
completo (`Router → Controller → Service → Repository → Mongoose`),
incluyendo los errores que traduce Mongoose (`CastError` → `400
INVALID_ID`, índice único de `email` → `409 DUPLICATE_EMAIL`, etc.), así
que necesitan una instancia real de MongoDB — la misma que ya usás para
desarrollo, apuntando a una base distinta.

***REMOVED******REMOVED******REMOVED*** Variables de entorno necesarias para testing

| Variable | Descripción |
|---|---|
| `PORT` | Exigida por `env.config.js` al arrancar, aunque los tests no levantan servidor |
| `MONGODB_URI` | Cadena de conexión a la base de **testing** (distinta a la de desarrollo) |
| `NODE_ENV` | Debe ser `test` — baja el nivel de logs a `warning` (ver [Sistema de logging](***REMOVED***sistema-de-logging)) |