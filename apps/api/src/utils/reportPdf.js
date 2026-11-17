import { formatMinutes, formatMoney } from '../notifications/templates.js';

const INK = '#1b232b';
const MUTED = '#4a5866';

function heading(doc, text) {
  doc.moveDown(0.8).font('Helvetica-Bold').fontSize(13).fillColor(INK).text(text).moveDown(0.3);
}

/** columns = [{ header, key, width, align?, format? }]; el ancho útil de A4 con margen 40 es ~515. */
function table(doc, columns, rows) {
  const left = doc.page.margins.left;
  const bottom = doc.page.height - doc.page.margins.bottom - 16;

  const drawRow = (values, bold) => {
    if (doc.y > bottom) doc.addPage();
    const y = doc.y;
    let x = left;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(INK);
    columns.forEach((column, index) => {
      doc.text(String(values[index]), x, y, { width: column.width - 8, height: 12, ellipsis: true, align: column.align ?? 'left' });
      x += column.width;
    });
    doc.x = left;
    doc.y = y + 15;
  };

  drawRow(columns.map((column) => column.header), true);
  if (rows.length === 0) {
    doc.font('Helvetica-Oblique').fillColor(MUTED).text('Sin datos en el período.', left);
    return;
  }
  rows.forEach((row) => drawRow(columns.map((column) => (column.format ? column.format(row[column.key]) : row[column.key])), false));
}

const percent = (value) => `${value}%`;

/** Arma el PDF en memoria (el reporte es chico) y devuelve un Buffer. */
export async function buildReportPdf(report) {
  const { default: PDFDocument } = await import('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: 'Reporte de operación · Ruvika' } });

  const chunks = [];
  const finished = new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const { summary } = report;
  doc.font('Helvetica-Bold').fontSize(20).fillColor(INK).text('Ruvika · Reporte de operación');
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(`Período: ${report.from} al ${report.to} (${report.timezone})`);

  heading(doc, 'Resumen');
  table(
    doc,
    [
      { header: 'Indicador', key: 'label', width: 300 },
      { header: 'Valor', key: 'value', width: 215, align: 'right' },
    ],
    [
      { label: 'Pedidos creados', value: summary.totalOrders },
      { label: 'Entregados', value: summary.delivered },
      { label: 'Cancelados', value: summary.cancelled },
      { label: 'En curso', value: summary.inProgress },
      { label: 'Tasa de cumplimiento (entregados / no cancelados)', value: percent(summary.fulfillmentRate) },
      { label: 'Tiempo promedio de entrega (asignación a entrega)', value: formatMinutes(summary.avgDeliveryMinutes) },
    ],
  );

  heading(doc, 'Por repartidor');
  table(
    doc,
    [
      { header: 'Repartidor', key: 'name', width: 175 },
      { header: 'Entregas', key: 'deliveries', width: 70, align: 'right' },
      { header: 'Entregadas', key: 'delivered', width: 80, align: 'right' },
      { header: 'Cumpl.', key: 'fulfillmentRate', width: 70, align: 'right', format: percent },
      { header: 'Tiempo prom.', key: 'avgDeliveryMinutes', width: 120, align: 'right', format: formatMinutes },
    ],
    report.byDriver,
  );

  heading(doc, 'Por tienda');
  table(
    doc,
    [
      { header: 'Tienda', key: 'name', width: 165 },
      { header: 'Pedidos', key: 'orders', width: 60, align: 'right' },
      { header: 'Entregados', key: 'delivered', width: 75, align: 'right' },
      { header: 'Cancelados', key: 'cancelled', width: 75, align: 'right' },
      { header: 'Cumpl.', key: 'fulfillmentRate', width: 55, align: 'right', format: percent },
      { header: 'Facturación', key: 'revenue', width: 85, align: 'right', format: formatMoney },
    ],
    report.byStore,
  );

  heading(doc, 'Pedidos por día');
  table(
    doc,
    [
      { header: 'Fecha', key: 'date', width: 175 },
      { header: 'Creados', key: 'created', width: 170, align: 'right' },
      { header: 'Entregados', key: 'delivered', width: 170, align: 'right' },
    ],
    report.perDay,
  );

  doc.end();
  return finished;
}