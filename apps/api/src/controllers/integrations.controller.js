import integrationService from '../services/integration.service.js';

const handle = (action, status = 200) => async (req, res, next) => {
  try {
    res.status(status).json(await action(req));
  } catch (error) {
    next(error);
  }
};

export const list = handle(() => integrationService.list());
export const create = handle((req) => integrationService.create(req.body), 201);
export const update = handle((req) => integrationService.update(req.params.iid, req.body));
export const rotateKey = handle((req) => integrationService.rotateKey(req.params.iid));
export const rotateSecret = handle((req) => integrationService.rotateSecret(req.params.iid));
export const remove = handle((req) => integrationService.remove(req.params.iid));