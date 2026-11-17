import trackingService from '../services/tracking.service.js';

export async function getTracking(req, res, next) {
  try {
    // El estado cambia seguido: que ningún navegador ni proxy lo cachee.
    res.set('Cache-Control', 'no-store');
    res.json(await trackingService.getPublicTracking(req.params.code));
  } catch (error) {
    next(error);
  }
}