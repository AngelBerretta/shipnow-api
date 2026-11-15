import statsRepository from '../repositories/stats.repository.js';
import { ORDER_STATUS } from '../constants/index.js';
import { DEFAULT_TIMEZONE, dayKey, lastDayKeys } from '../utils/dates.js';

const DEFAULT_DAYS = 14;
const MAX_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Igual que la paginacion: un `days` invalido cae al default en vez de dar error. */
function parseDays(raw) {
  const days = Math.trunc(Number(raw));
  if (!Number.isFinite(days) || days < 1) return DEFAULT_DAYS;
  return Math.min(days, MAX_DAYS);
}

const toMap = (rows) => new Map(rows.map((row) => [row._id, row.count]));

class StatsService {
  /**
   * Resumen para el dashboard administrativo: KPIs, pedidos por estado y
   * pedidos creados/entregados por dia (los ultimos `days` dias, con los
   * dias sin movimiento en cero para que el grafico no tenga huecos).
   */
  async getOverview(query = {}) {
    const days = parseDays(query.days);
    const timezone = DEFAULT_TIMEZONE;
    const now = new Date();
    const dayKeys = lastDayKeys(days, timezone, now);
    // Filtro holgado (1 dia extra): el recorte exacto lo hacen las claves de dia.
    const since = new Date(now.getTime() - (days + 1) * DAY_MS);

    const [statusRows, createdRows, deliveredRows] = await Promise.all([
      statsRepository.countOrdersByStatus(),
      statsRepository.countOrdersCreatedByDay(since, timezone),
      statsRepository.countDeliveredByDay(since, timezone),
    ]);

    const statusCounts = toMap(statusRows);
    const createdByDay = toMap(createdRows);
    const deliveredByDay = toMap(deliveredRows);

    const byStatus = Object.values(ORDER_STATUS).map((status) => ({ status, count: statusCounts.get(status) ?? 0 }));
    const totalOrders = byStatus.reduce((sum, row) => sum + row.count, 0);
    const delivered = statusCounts.get(ORDER_STATUS.DELIVERED) ?? 0;
    const cancelled = statusCounts.get(ORDER_STATUS.CANCELLED) ?? 0;
    const notCancelled = totalOrders - cancelled;

    return {
      generatedAt: now.toISOString(),
      timezone,
      days,
      kpis: {
        ordersToday: createdByDay.get(dayKey(now, timezone)) ?? 0,
        inTransit: statusCounts.get(ORDER_STATUS.IN_TRANSIT) ?? 0,
        delivered,
        cancelled,
        totalOrders,
        // Entregados sobre pedidos no cancelados, con un decimal.
        deliveryRate: notCancelled > 0 ? Math.round((delivered / notCancelled) * 1000) / 10 : 0,
      },
      byStatus,
      perDay: dayKeys.map((date) => ({
        date,
        created: createdByDay.get(date) ?? 0,
        delivered: deliveredByDay.get(date) ?? 0,
      })),
    };
  }
}

export default new StatsService();
