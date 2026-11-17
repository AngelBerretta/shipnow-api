import reportService from '../services/report.service.js';

export async function overview(req, res, next) {
  try {
    res.json(await reportService.getOverview(req.query));
  } catch (error) {
    next(error);
  }
}

export async function exportCsv(req, res, next) {
  try {
    const { filename, content } = await reportService.exportCsv(req.query);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });
    res.send(content);
  } catch (error) {
    next(error);
  }
}

export async function exportPdf(req, res, next) {
  try {
    const { filename, buffer } = await reportService.exportPdf(req.query);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}