import statsService from '../services/stats.service.js';

export async function overview(req, res, next) {
  try {
    res.json(await statsService.getOverview(req.query));
  } catch (error) {
    next(error);
  }
}
