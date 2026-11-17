import notificationService from '../services/notification.service.js';
import reportService from '../services/report.service.js';

export async function processNotifications(req, res, next) {
  try {
    res.json(await notificationService.processDue({ limit: 50 }));
  } catch (error) {
    next(error);
  }
}

export async function weeklyReport(req, res, next) {
  try {
    res.json(await reportService.sendWeeklyDigest());
  } catch (error) {
    next(error);
  }
}