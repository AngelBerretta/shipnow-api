# Ruvika API — imagen de produccion (monorepo)
#
# Se construye desde la RAIZ del repo (el contexto tiene que incluir
# packages/shared, que la API importa como @ruvika/shared):
#
#   docker build -t ruvika-api .
#
# Imagen liviana basada en node:20-alpine. Solo se instalan las
# dependencias de PRODUCCION de la API (npm ci --omit=dev -w @ruvika/api):
# eslint, mocha, chai, supertest y nodemon quedan fuera de la imagen final.
FROM node:20-alpine

WORKDIR /app

# Primero solo los manifests (cache de capas de Docker): si no cambian
# package.json / package-lock.json, "npm ci" no se vuelve a ejecutar
# aunque el codigo fuente si haya cambiado.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/driver/package.json apps/driver/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev -w @ruvika/api

# Recien aca se copia el codigo. Ver .dockerignore para lo que NUNCA
# entra a la imagen (node_modules, .env, .git, logs/, uploads/, tests, etc).
COPY packages/shared packages/shared
COPY apps/api apps/api

# La app corre desde apps/api: ahi se crean logs/ y uploads/ (rutas
# relativas al directorio de trabajo, ver logger.config.js y
# multer.config.js). Se pre-crean con el duenio correcto para que el
# usuario no-root "node" (ver USER mas abajo) pueda escribir en ellas.
WORKDIR /app/apps/api
RUN mkdir -p logs uploads/users uploads/deliveries \
    && chown -R node:node /app

# Mismo puerto que la app expone via PORT (ver apps/api/src/config/env.config.js).
# Si se cambia PORT en runtime, hay que publicar ese otro puerto (ver README).
EXPOSE 3000

# Corre como usuario no-root: la imagen base node:*-alpine ya trae un
# usuario "node" creado.
USER node

CMD ["node", "src/server.js"]
