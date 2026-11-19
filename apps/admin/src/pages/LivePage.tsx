import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import LiveMap from '../components/LiveMap';
import { DeliveryStatusBadge, EmptyState, ErrorBanner, Loading, PageHeader, Panel, cn } from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { formatMinutes } from '../lib/format';
import { useLiveSocket } from '../lib/live';
import type { LivePosition } from '../lib/types';

interface LiveResponse {
  data: LivePosition[];
}

const useNow = (ms: number) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
};

const ago = (iso: string, now: number) => {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return seconds < 60 ? `hace ${seconds} s` : `hace ${Math.round(seconds / 60)} min`;
};

export default function LivePage() {
  const queryClient = useQueryClient();
  const now = useNow(5000);
  const [selected, setSelected] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Carga inicial + reconciliación cada minuto (también trae el ETA, que no viaja por el socket).
  const live = useQuery({
    queryKey: ['live'],
    queryFn: () => api<LiveResponse>('/api/locations/live'),
    refetchInterval: 60_000,
  });
  const trail = useQuery({
    queryKey: ['trail', selected],
    queryFn: () => api<{ points: { lat: number; lng: number }[] }>(`/api/locations/deliveries/${selected}`),
    enabled: Boolean(selected),
    refetchInterval: 30_000,
  });

  const onUpdate = useCallback(
    (position: LivePosition) => {
      queryClient.setQueryData<LiveResponse>(['live'], (previous) => {
        const rows = previous?.data ?? [];
        const exists = rows.some((row) => row.deliveryId === position.deliveryId);
        return { data: exists ? rows.map((row) => (row.deliveryId === position.deliveryId ? { ...row, ...position } : row)) : [...rows, position] };
      });
    },
    [queryClient],
  );
  useLiveSocket(onUpdate, setConnected);

  const positions = live.data?.data ?? [];
  const path = trail.data?.points.map((point) => [point.lat, point.lng] as [number, number]) ?? [];

  return (
    <>
      <PageHeader
        title="Mapa en vivo"
        subtitle={connected ? 'Conectado: las posiciones se actualizan solas' : 'Reconectando… se actualiza cada minuto mientras tanto'}
      />
      <ErrorBanner message={live.error && errorMessage(live.error)} />
      {live.isLoading ? (
        <Loading />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <LiveMap positions={positions} selectedId={selected} trail={path} onSelect={setSelected} />
          </div>
          <Panel title={`Repartidores en ruta (${positions.length})`}>
            {positions.length === 0 ? (
              <EmptyState>Ningún repartidor está compartiendo ubicación.</EmptyState>
            ) : (
              <ul className="divide-y divide-asphalt-100 text-sm">
                {positions.map((position) => (
                  <li key={position.deliveryId}>
                    <button
                      type="button"
                      onClick={() => setSelected(position.deliveryId)}
                      className={cn('block w-full px-1 py-3 text-left hover:bg-asphalt-50', position.deliveryId === selected && 'bg-asphalt-50')}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{position.driverName}</span>
                        <DeliveryStatusBadge status={position.status} />
                      </span>
                      <span className="mt-0.5 block text-xs text-asphalt-600">
                        <Link className="underline" to={`/orders/${position.orderId}`} onClick={(event) => event.stopPropagation()}>
                          {position.trackingCode ?? 'Pedido'}
                        </Link>{' '}
                        · {ago(position.recordedAt, now)}
                        {position.eta && ` · llega en ${formatMinutes(position.eta.minutes)}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}