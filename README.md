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
├── services/          ***REMOVED*** Lógica de negocio
├── controllers/       ***REMOVED*** Única puerta de entrada HTTP (req/res)
├── routes/            ***REMOVED*** Solo conectan path + método HTTP con el Controller
├── middlewares/       ***REMOVED*** Manejo central de errores y 404
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
