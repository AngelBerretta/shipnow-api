import locationService from '../services/location.service.js';

export async function postMine(req, res, next) {
  try {
    res.json(await locationService.recordDriverPosition(req.user, req.body));
  } catch (error) {
    next(error);
  }
}

export async function live(req, res, next) {
  try {
    res.json(await locationService.getLive());
  } catch (error) {
    next(error);
  }
}

export async function trail(req, res, next) {
  try {
    res.json(await locationService.getTrail(req.params.did));
  } catch (error) {
    next(error);
  }
}