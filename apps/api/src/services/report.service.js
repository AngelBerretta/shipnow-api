import reportRepository from '../repositories/report.repository.js';
import userRepository from '../repositories/user.repository.js';
import notificationService from './notification.service.js';
import { digestMessage } from '../notifications/templates.js';
import { buildReportPdf } from '../utils/reportPdf.js';
import { toCsv } from '../utils/csv.js';
import { DEFAULT_TIMEZONE, addDays, dayKey, dayKeyToMs, dayKeysBetween, daysBetween, isDayKey } from '../utils/dates.js';
import { ORDER_STATUS, ROLES, NOTIFICATION_CHANNELS as CH } from '../constants/index.js';
import { ValidationError } from '../errors/index.js';
import config from '../config/env.config.js';

const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

const toMap = (rows) => new Map(rows.map((row) => [row._id, row.count]));
const percent = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);
const minutes = (ms) => (ms === null || ms === undefined ? null : Math.round((ms / 60000) * 10) / 10);
const nameOf = (row) => (row.firstName ? `${row.firstName} ${row.lastName ?? ''}`.trim() : 'Usuario eliminado');

const CSV_TYPES = {
  days: (report) => ({
    columns: [['Fecha', 'date'], ['Pedidos creados', 'created'], ['Pedidos entregados', 'delivered']],
    rows: report.perDay,
  }),
  drivers: (report) => ({
    columns: [
      ['Repartidor', 'name'],
      ['Entregas', 'deliveries'],
      ['Entregadas', 'delivered'],
      ['Cumplimiento (%)', 'fulfillmentRate'],
      ['Tiempo promedio (min)', 'avgDeliveryMinutes'],
    ],
    rows: report.byDriver,
  }),
  stores: (report) => ({
    columns: [
      ['Tienda', 'name'],
      ['Pedidos', 'orders'],
      ['Entregados', 'delivered'],
      ['Cancelados', 'cancelled'],
      ['Cumplimiento (%)', 'fulfillmentRate'],
      ['Facturación entregada', 'revenue'],
    ],
    rows: report.byStore,
  }),
};

class ReportService {
  /** Período en días locales (AAAA-MM-DD, ambos inclusive). Por defecto, los últimos 30 días. */
  #resolvePeriod(query = {}) {
    const timezone = DEFAULT_TIMEZONE;
    const to = query.to ?? dayKey(new Date(), timezone);
    const from = query.from ?? addDays(to, -(DEFAULT_PERIOD_DAYS - 1));

    if (!isDayKey(from) || !isDayKey(to)) {
      throw new ValidationError('Las fechas deben tener el formato AAAA-MM-DD');
    }
    if (from > to) {
      throw new ValidationError('"from" no puede ser posterior a "to"');
    }
    if (daysBetween(from, to) > MAX_PERIOD_DAYS) {
      throw new ValidationError(`El período no puede superar ${MAX_PERIOD_DAYS} días`);
    }
    // Ventana holgada para usar índices; el recorte exacto lo hace la clave de día local.
    return { from, to, timezone, since: new Date(dayKeyToMs(from) - DAY_MS), until: new Date(dayKeyToMs(to) + 2 * DAY_MS) };
  }

  /**
   * Reporte de operación. Las secciones usan bases distintas a propósito:
   * resumen y tienda = pedidos CREADOS en el período; repartidor = entregas ASIGNADAS
   * en el período; "por día entregados" = fecha real de la entrega; tiempo promedio =
   * entregas COMPLETADAS en el período. Las entregas eliminadas no cuentan.
   */
  async getOverview(query = {}) {
    const period = this.#resolvePeriod(query);

    const [statusRows, createdRows, deliveredRows, times, driverRows, storeRows] = await Promise.all([
      reportRepository.ordersByStatus(period),
      reportRepository.ordersCreatedByDay(period),
      reportRepository.deliveredByDay(period),
      reportRepository.deliveryTimes(period),
      reportRepository.byDriver(period),
      reportRepository.byStore(period),
    ]);

    const statusCounts = toMap(statusRows);
    const totalOrders = [...statusCounts.values()].reduce((sum, count) => sum + count, 0);
    const delivered = statusCounts.get(ORDER_STATUS.DELIVERED) ?? 0;
    const cancelled = statusCounts.get(ORDER_STATUS.CANCELLED) ?? 0;
    const createdByDay = toMap(createdRows);
    const deliveredByDay = toMap(deliveredRows);

    return {
      generatedAt: new Date().toISOString(),
      timezone: period.timezone,
      from: period.from,
      to: period.to,
      summary: {
        totalOrders,
        delivered,
        cancelled,
        inProgress: totalOrders - delivered - cancelled,
        fulfillmentRate: percent(delivered, totalOrders - cancelled),
        avgDeliveryMinutes: minutes(times.avgMs),
        deliveriesCompleted: times.count,
      },
      perDay: dayKeysBetween(period.from, period.to).map((date) => ({
        date,
        created: createdByDay.get(date) ?? 0,
        delivered: deliveredByDay.get(date) ?? 0,
      })),
      byDriver: driverRows.map((row) => ({
        driverId: String(row._id),
        name: nameOf(row),
        deliveries: row.deliveries,
        delivered: row.delivered,
        fulfillmentRate: percent(row.delivered, row.deliveries),
        avgDeliveryMinutes: minutes(row.avgMs),
      })),
      byStore: storeRows.map((row) => ({
        storeId: row._id ? String(row._id) : null,
        name: row._id ? nameOf(row) : 'Sin tienda',
        orders: row.orders,
        delivered: row.delivered,
        cancelled: row.cancelled,
        fulfillmentRate: percent(row.delivered, row.orders - row.cancelled),
        revenue: row.revenue,
      })),
    };
  }

  async exportCsv(query = {}) {
    const type = query.type ?? 'days';
    if (!Object.hasOwn(CSV_TYPES, type)) {
      throw new ValidationError(`"type" inválido: "${type}". Valores permitidos: ${Object.keys(CSV_TYPES).join(', ')}`);
    }
    const report = await this.getOverview(query);
    const { columns, rows } = CSV_TYPES[type](report);
    return { filename: `ruvika-${type}-${report.from}_${report.to}.csv`, content: toCsv(columns, rows) };
  }

  async exportPdf(query = {}) {
    const report = await this.getOverview(query);
    return { filename: `ruvika-reporte-${report.from}_${report.to}.pdf`, buffer: await buildReportPdf(report) };
  }

  /**
   * Reporte semanal automático: los 7 días hasta AYER. Lo llama GitHub Actions (lunes).
   * Es idempotente: el `dedupeKey` lleva la fecha, así un reintento del cron no repite avisos.
   */
  async sendWeeklyDigest() {
    const to = addDays(dayKey(new Date(), DEFAULT_TIMEZONE), -1);
    const from = addDays(to, -6);
    const report = await this.getOverview({ from, to });
    const message = digestMessage(report);
    const admins = await userRepository.findAll({ role: ROLES.ADMIN, isActive: true });

    const base = { type: 'weekly_report', title: message.title, body: message.body };
    const data = { path: message.path, url: message.url };
    const jobs = [{ ...base, user: null, channel: CH.TELEGRAM, data, dedupeKey: `weekly:${to}:telegram` }];
    for (const admin of admins) {
      jobs.push({ ...base, user: admin._id, channel: CH.IN_APP, data, dedupeKey: `weekly:${to}:${admin._id}:in_app` });
      jobs.push({
        ...base,
        user: admin._id,
        channel: CH.EMAIL,
        data: { ...data, to: admin.email, html: message.html },
        dedupeKey: `weekly:${to}:${admin._id}:email`,
      });
    }

    const created = await notificationService.enqueue(jobs);
    return { from, to, enqueued: created.length, adminUrlConfigured: Boolean(config.notifications.adminUrl) };
  }
}

export default new ReportService();