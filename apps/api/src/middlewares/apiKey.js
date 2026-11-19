import integrationService from '../services/integration.service.js';
import { UnauthorizedError } from '../errors/index.js';

/** Acepta `X-API-Key: rvk_...` o `Authorization: Bearer rvk_...`. Deja la integración en `req.integration`. */
export async function requireApiKey(req, _res, next) {
  try {
    const bearer = (req.headers.authorization ?? '').match(/^Bearer\s+(.+)$/i)?.[1];
    const key = req.get('x-api-key') ?? bearer;
    if (!key) throw new UnauthorizedError('Falta la API key (header X-API-Key)');
    req.integration = await integrationService.authenticate(key.trim());
    next();
  } catch (error) {
    next(error);
  }
}