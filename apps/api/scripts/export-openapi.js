/**
 * export-openapi.js — escribe la especificacion OpenAPI de la API en
 * apps/api/docs/openapi.json, para generar el cliente tipado del panel:
 *
 *   npm run openapi:export -w @ruvika/api
 *   npm run gen:api -w @ruvika/admin
 *
 * Solo lee los comentarios @openapi de src/docs: no necesita MongoDB.
 */
import fs from 'node:fs';
import path from 'node:path';
import swaggerSpec from '../src/config/swagger.config.js';

const outDir = path.resolve('docs');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'openapi.json'), JSON.stringify(swaggerSpec, null, 2));
console.log('[openapi] Especificacion escrita en docs/openapi.json');
