import config from '../config/env.config.js';
import { DEFAULT_TIMEZONE } from '../utils/dates.js';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const formatMoney = (value) => money.format(value ?? 0);

export const formatMinutes = (minutes) => {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min`;
};

export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const dayMonth = (key) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;
const personName = (user) => (user ? `${user.firstName} ${user.lastName}` : 'Cliente');

/** Layout de email simple: sin imágenes ni CSS externo (lo bloquean muchos clientes). */
export function emailHtml({ heading, paragraphs = [], rows = [], cta = null }) {
  const text = paragraphs.map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${escapeHtml(line)}</p>`).join('');
  const table = rows.length
    ? `<table style="width:100%;border-collapse:collapse;margin:8px 0">${rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:6px 0;color:#4a5866">${escapeHtml(label)}</td><td style="padding:6px 0;text-align:right;font-weight:600">${escapeHtml(value)}</td></tr>`
        )
        .join('')}</table>`
    : '';
  const button = cta
    ? `<p style="margin:20px 0 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#f2c230;color:#141a20;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(cta.label)}</a></p>`
    : '';
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f2f4f6;font-family:'Segoe UI',Arial,sans-serif;color:#1b232b"><div style="max-width:520px;margin:0 auto;padding:24px"><div style="background:#1b232b;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;font-size:18px;font-weight:600">Ruvika</div><div style="background:#fff;padding:24px 20px;border-radius:0 0 10px 10px"><h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(heading)}</h1>${text}${table}${button}</div></div></body></html>`;
}

const trackingLink = (order) =>
  config.notifications.trackingUrl && order.trackingCode ? `${config.notifications.trackingUrl}/seguimiento/${order.trackingCode}` : null;

const CUSTOMER = {
  created: { subject: 'Recibimos tu pedido', text: 'Estamos asignando un repartidor. Te avisamos cuando salga.' },
  in_transit: { subject: 'Tu pedido va en camino', text: 'El repartidor ya salió a entregarlo.' },
  arriving: { subject: 'Tu repartidor está llegando', text: 'En unos minutos llega con tu pedido.' },
  delivered: { subject: 'Tu pedido fue entregado', text: '¡Gracias por elegirnos!' },
  cancelled: { subject: 'Tu pedido fue cancelado', text: 'Si tenés dudas, contactá al comercio.' },
};

/** Aviso al cliente (email). `title` es el asunto. */
export function customerMessage(key, order) {
  const t = CUSTOMER[key];
  const code = order.trackingCode ?? '';
  const link = trackingLink(order);
  const lead = `Hola ${order.customer.firstName}, pedido ${code}.`;
  return {
    title: `${t.subject} ${code}`.trim(),
    body: [lead, t.text, link && `Seguilo acá: ${link}`].filter(Boolean).join(' '),
    data: {
      url: link,
      html: emailHtml({
        heading: t.subject,
        paragraphs: [`Hola ${order.customer.firstName},`, `${t.text} (Pedido ${code})`],
        cta: link ? { label: 'Ver seguimiento', url: link } : null,
      }),
    },
  };
}

const ADMIN_TITLE = { created: 'Nuevo pedido', in_transit: 'Pedido en camino', arriving: 'Repartidor llegando', delivered: 'Pedido entregado', cancelled: 'Pedido cancelado' };

/** Aviso a administración (campana y Telegram). `path` es la ruta dentro del panel. */
export function adminMessage(key, order) {
  const code = order.trackingCode ?? String(order._id);
  return {
    title: `${ADMIN_TITLE[key]} ${code}`,
    body: `${personName(order.customer)} · ${formatMoney(order.total)}`,
    data: {
      path: `/orders/${order._id}`,
      url: config.notifications.adminUrl ? `${config.notifications.adminUrl}/orders/${order._id}` : null,
    },
  };
}

/** Aviso al repartidor (push y campana). La URL es relativa a la PWA. */
export function driverMessage(order, deliveryId) {
  return {
    title: 'Nueva entrega asignada',
    body: `${order.trackingCode ?? ''} · ${order.deliveryAddress}`.trim(),
    data: { url: `/deliveries/${deliveryId}`, deliveryId: String(deliveryId) },
  };
}

/** Resumen semanal para administración. */
export function digestMessage(report) {
  const { summary } = report;
  const period = `${dayMonth(report.from)} al ${dayMonth(report.to)}`;
  const rows = [
    ['Pedidos creados', String(summary.totalOrders)],
    ['Entregados', String(summary.delivered)],
    ['Cancelados', String(summary.cancelled)],
    ['Tasa de cumplimiento', `${summary.fulfillmentRate}%`],
    ['Tiempo promedio de entrega', formatMinutes(summary.avgDeliveryMinutes)],
  ];
  const adminUrl = config.notifications.adminUrl;
  return {
    title: `Reporte semanal (${period})`,
    body: [
      `Pedidos: ${summary.totalOrders} · Entregados: ${summary.delivered} · Cancelados: ${summary.cancelled}`,
      `Cumplimiento: ${summary.fulfillmentRate}% · Tiempo promedio: ${formatMinutes(summary.avgDeliveryMinutes)}`,
    ].join('\n'),
    html: emailHtml({
      heading: `Reporte semanal (${period})`,
      paragraphs: ['Así le fue a la operación en los últimos 7 días.'],
      rows,
      cta: adminUrl ? { label: 'Ver reportes y descargar PDF', url: `${adminUrl}/reports` } : null,
    }),
    path: '/reports',
    url: adminUrl ? `${adminUrl}/reports` : null,
  };
}

/** Cuerpo de un webhook saliente: sin datos personales del cliente. */
export function webhookPayload(eventId, type, status, order) {
  const base = config.notifications.trackingUrl;
  return {
    id: eventId,
    type,
    createdAt: new Date().toISOString(),
    data: {
      order: {
        trackingCode: order.trackingCode ?? null,
        status,
        externalId: order.source?.externalId ?? null,
        trackingUrl: base && order.trackingCode ? `${base}/seguimiento/${order.trackingCode}` : null,
      },
    },
  };
}

export { DEFAULT_TIMEZONE };