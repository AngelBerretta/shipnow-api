import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, EmptyState, ErrorBanner, Field, Input, Loading, PageHeader, Panel, Table, Td, Th } from '../components/ui';
import { api, download, errorMessage } from '../lib/api';
import { formatDayKey, formatMinutes, formatMoney } from '../lib/format';
import type { ReportOverview } from '../lib/types';

const dayInput = (date: Date) => date.toLocaleDateString('en-CA'); // AAAA-MM-DD en hora local
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dayInput(date);
};

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-sm text-asphalt-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-asphalt-400">{hint}</p>}
    </div>
  );
}

const CSV_EXPORTS = [
  { type: 'days', label: 'CSV por día' },
  { type: 'drivers', label: 'CSV por repartidor' },
  { type: 'stores', label: 'CSV por tienda' },
] as const;

export default function ReportsPage() {
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(dayInput(new Date()));
  const [busy, setBusy] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const validRange = Boolean(from && to && from <= to);

  const report = useQuery({
    queryKey: ['report', from, to],
    queryFn: () => api<ReportOverview>('/api/reports/overview', { query: { from, to } }),
    enabled: validRange,
  });

  const run = async (key: string, path: string, query: Record<string, string>, filename: string) => {
    setBusy(key);
    setDownloadError(null);
    try {
      await download(path, query, filename);
    } catch (error) {
      setDownloadError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const data = report.data;
  const perDay = data?.perDay.map((row) => ({ ...row, label: formatDayKey(row.date) }));

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle="Rendimiento de la operación por período"
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Desde"><Input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></Field>
            <Field label="Hasta"><Input type="date" value={to} min={from} max={dayInput(new Date())} onChange={(event) => setTo(event.target.value)} /></Field>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {CSV_EXPORTS.map(({ type, label }) => (
          <Button key={type} variant="secondary" disabled={!validRange || busy !== null} onClick={() => void run(type, '/api/reports/export.csv', { from, to, type }, `ruvika-${type}-${from}_${to}.csv`)}>
            {busy === type ? 'Descargando…' : label}
          </Button>
        ))}
        <Button variant="accent" disabled={!validRange || busy !== null} onClick={() => void run('pdf', '/api/reports/export.pdf', { from, to }, `ruvika-reporte-${from}_${to}.pdf`)}>
          {busy === 'pdf' ? 'Generando…' : 'Descargar PDF'}
        </Button>
      </div>

      <div className="mb-4 space-y-2">
        {!validRange && <ErrorBanner message="La fecha “Desde” no puede ser posterior a “Hasta”." />}
        <ErrorBanner message={report.error && errorMessage(report.error)} />
        <ErrorBanner message={downloadError} />
      </div>

      {report.isLoading && <Loading />}

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 divide-x divide-y divide-asphalt-100 rounded-md border border-asphalt-200 bg-white lg:grid-cols-5 lg:divide-y-0">
            <Stat label="Pedidos creados" value={data.summary.totalOrders} hint={`${data.summary.inProgress} en curso`} />
            <Stat label="Entregados" value={data.summary.delivered} />
            <Stat label="Cancelados" value={data.summary.cancelled} />
            <Stat label="Cumplimiento" value={`${data.summary.fulfillmentRate}%`} hint="entregados / no cancelados" />
            <Stat label="Tiempo promedio" value={formatMinutes(data.summary.avgDeliveryMinutes)} hint="de la asignación a la entrega" />
          </div>

          <Panel title="Pedidos por día">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={perDay}>
                  <CartesianGrid stroke="#e4e8ec" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="created" name="Creados" fill="#1b232b" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="delivered" name="Entregados" fill="#f2c230" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold">Por repartidor</h2>
              {data.byDriver.length === 0 ? (
                <EmptyState>Sin entregas en el período.</EmptyState>
              ) : (
                <Table>
                  <thead>
                    <tr><Th>Repartidor</Th><Th className="text-right">Entregas</Th><Th className="text-right">Entregadas</Th><Th className="text-right">Cumpl.</Th><Th className="text-right">Tiempo prom.</Th></tr>
                  </thead>
                  <tbody>
                    {data.byDriver.map((row) => (
                      <tr key={row.driverId}>
                        <Td className="font-medium">{row.name}</Td>
                        <Td className="text-right">{row.deliveries}</Td>
                        <Td className="text-right">{row.delivered}</Td>
                        <Td className="text-right">{row.fulfillmentRate}%</Td>
                        <Td className="text-right">{formatMinutes(row.avgDeliveryMinutes)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold">Por tienda</h2>
              {data.byStore.length === 0 ? (
                <EmptyState>Sin pedidos en el período.</EmptyState>
              ) : (
                <Table>
                  <thead>
                    <tr><Th>Tienda</Th><Th className="text-right">Pedidos</Th><Th className="text-right">Entregados</Th><Th className="text-right">Cumpl.</Th><Th className="text-right">Facturación</Th></tr>
                  </thead>
                  <tbody>
                    {data.byStore.map((row) => (
                      <tr key={row.storeId ?? 'none'}>
                        <Td className="font-medium">{row.name}</Td>
                        <Td className="text-right">{row.orders}</Td>
                        <Td className="text-right">{row.delivered}</Td>
                        <Td className="text-right">{row.fulfillmentRate}%</Td>
                        <Td className="text-right">{formatMoney(row.revenue)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}