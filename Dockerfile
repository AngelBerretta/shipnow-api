# ShipNow API — imagen de producción
#
# Imagen liviana basada en node:20-alpine. Solo se instalan las
# dependencias de PRODUCCION (npm ci --omit=dev): eslint, mocha, chai,
# supertest y nodemon quedan fuera de la imagen final.
FROM node:20-alpine

WORKDIR /app

# Copiar primero solo los manifests para aprovechar la cache de capas de
# Docker: si package.json/package-lock.json no cambian, "npm ci" no se
# vuelve a ejecutar en builds posteriores aunque el código fuente sí
# haya cambiado.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Recién acá se copia el resto del código. Ver .dockerignore para lo que
# NUNCA entra a la imagen (node_modules, .env, .git, logs/, uploads/,
# tests, el propio Dockerfile, etc).
COPY . .

# logs/ y uploads/ las crea la propia app en tiempo de ejecución si no
# existen (ver logger.config.js y multer.config.js), pero se pre-crean
# acá con el dueño correcto para que el usuario no-root "node" (ver
# USER más abajo) pueda escribir en ellas.
RUN mkdir -p logs uploads/users uploads/deliveries \
    && chown -R node:node /app

# Mismo puerto que la app expone vía PORT (ver src/config/env.config.js
# y la variable de entorno PORT). Si se cambia PORT en runtime, hay que
# publicar ese otro puerto al correr el contenedor (ver README).
EXPOSE 3000

# Corre como usuario no-root: la imagen base node:*-alpine ya trae un
# usuario "node" creado. Ejecutar como root dentro del contenedor no
# aporta nada acá y es una mala práctica de seguridad evitable.
USER node

CMD ["node", "src/server.js"]
