import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, ErrorBanner, Field, Input, Loading, PageHeader, Panel, Select } from '../components/ui';
import { api, ApiError, errorMessage } from '../lib/api';
import { formatDayKey, formatDateTime, ORDER_STATUS_LABEL } from '../lib/format';
import type { MockSeedResult, StatsOverview } from '../lib/types';

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-sm text-asphalt-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-asphalt-400">{hint}</p>}
    </div>
  );
}

function DemoTools() {
  const queryClient = useQueryClient();
  const [counts, setCounts] = useState({ users: 8, orders: 10, deliveries: 5 });
  const seed = useMutation({
    mutationFn: () => api<MockSeedResult>('/api/mocks/generate', { method: 'POST', body: counts }),
    onSuccess: () => void queryClient.invalidateQueries(),
  });

  const disabledInProd = seed.error instanceof ApiError && seed.error.status === 404;
  const set = (key: keyof typeof counts) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setCounts((prev) => ({ ...prev, [key]: Number(event.target.value) }));

  return (
    <Panel title="Datos de demostración">
      <p className="mb-3 text-sm text-asphalt-600">
        Carga usuarios, pedidos y entregas de prueba en la base. Es aditivo: no borra nada.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {(['users', 'orders', 'deliveries'] as const).map((key) => (
          <Field key={key} label={{ users: 'Usuarios', orders: 'Pedidos', deliveries: 'Entregas' }[key]}>
            <Input type="number" min={0} max={200} value={counts[key]} onChange={set(key)} />
          </Field>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button variant="accent" disabled={seed.isPending} onClick={() => seed.mutate()}>
          {seed.isPending ? 'Generando…' : 'Generar datos'}
        </Button>
        {seed.data && (
          <span className="text-sm text-emerald-700">
            Creados: {seed.data.summary.users.created} usuarios, {seed.data.summary.orders.created} pedidos,{' '}
            {seed.data.summary.deliveries.created} entregas.
          </span>
        )}
      </div>
      {seed.data?.summary.warnings.map((warning) => (
        <p key={warning} className="mt-2 text-xs text-amber-800">
          {warning}
        </p>
      ))}
      <div className="mt-3">
        <ErrorBanner
          message={
            disabledInProd
              ? 'Las rutas internas están deshabilitadas en producción (ENABLE_INTERNAL_ROUTES).'
              : seed.error && errorMessage(seed.error)
          }
        />
      </div>
    </Panel>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState(14);
  const stats = useQuery({
    queryKey: ['stats', days],
    queryFn: () => api<StatsOverview>('/api/stats/overview', { query: { days } }),
    refetchInterval: 30_000,
  });

  const data = stats.data;
  const perDay = data?.perDay.map((row) => ({ ...row, label: formatDayKey(row.date) }));
  const byStatus = data?.byStatus.map((row) => ({ ...row, label: ORDER_STATUS_LABEL[row.status] }));

  return (
    <>
      <PageHeader
        title="Resumen"
        subtitle={data ? `Actualizado ${formatDateTime(data.generatedAt)}` : 'Estado de la operación'}
        actions={
          <Select aria-label="Período" value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={7}>Últimos 7 días</option>
            <option value={14}>Últimos 14 días</option>
            <option value={30}>Últimos 30 días</option>
          </Select>
        }
      />

      {stats.isLoading && <Loading />}
      <ErrorBanner message={stats.error && errorMessage(stats.error)} />

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 divide-x divide-y divide-asphalt-100 rounded-md border border-asphalt-200 bg-white lg:grid-cols-5 lg:divide-y-0">
            <Kpi label="Pedidos de hoy" value={data.kpis.ordersToday} />
            <Kpi label="En camino" value={data.kpis.inTransit} />
            <Kpi label="Entregados" value={data.kpis.delivered} hint={`de ${data.kpis.totalOrders} pedidos`} />
            <Kpi label="Cancelados" value={data.kpis.cancelled} />
            <Kpi label="Tasa de entrega" value={`${data.kpis.deliveryRate}%`} hint="entregados / no cancelados" />
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            <Panel title="Pedidos por día" className="lg:col-span-3">
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={perDay}>
                    <CartesianGrid stroke="#e4e8ec" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="created" name="Creados" stroke="#1b232b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="delivered" name="Entregados" stroke="#b98c06" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
            <Panel title="Pedidos por estado" className="lg:col-span-2">
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={byStatus} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid stroke="#e4e8ec" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Pedidos" fill="#f2c230" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </div>
      )}

      <div className="mt-5">
        <DemoTools />
      </div>
    </>
  );
}
