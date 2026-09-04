***REMOVED*** ShipNow API — imagen de producción
***REMOVED***
***REMOVED*** Imagen liviana basada en node:20-alpine. Solo se instalan las
***REMOVED*** dependencias de PRODUCCION (npm ci --omit=dev): eslint, mocha, chai,
***REMOVED*** supertest y nodemon quedan fuera de la imagen final.
FROM node:20-alpine

WORKDIR /app

***REMOVED*** Copiar primero solo los manifests para aprovechar la cache de capas de
***REMOVED*** Docker: si package.json/package-lock.json no cambian, "npm ci" no se
***REMOVED*** vuelve a ejecutar en builds posteriores aunque el código fuente sí
***REMOVED*** haya cambiado.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

***REMOVED*** Recién acá se copia el resto del código. Ver .dockerignore para lo que
***REMOVED*** NUNCA entra a la imagen (node_modules, .env, .git, logs/, uploads/,
***REMOVED*** tests, el propio Dockerfile, etc).
COPY . .

***REMOVED*** logs/ y uploads/ las crea la propia app en tiempo de ejecución si no
***REMOVED*** existen (ver logger.config.js y multer.config.js), pero se pre-crean
***REMOVED*** acá con el dueño correcto para que el usuario no-root "node" (ver
***REMOVED*** USER más abajo) pueda escribir en ellas.
RUN mkdir -p logs uploads/users uploads/deliveries \
    && chown -R node:node /app

***REMOVED*** Mismo puerto que la app expone vía PORT (ver src/config/env.config.js
***REMOVED*** y la variable de entorno PORT). Si se cambia PORT en runtime, hay que
***REMOVED*** publicar ese otro puerto al correr el contenedor (ver README).
EXPOSE 3000

***REMOVED*** Corre como usuario no-root: la imagen base node:*-alpine ya trae un
***REMOVED*** usuario "node" creado. Ejecutar como root dentro del contenedor no
***REMOVED*** aporta nada acá y es una mala práctica de seguridad evitable.
USER node

CMD ["node", "src/server.js"]
