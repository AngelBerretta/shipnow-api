import { useState } from 'react';
import { Link } from 'react-router-dom';
import InstallCard from '../components/InstallCard';
import { cn, EmptyState, ErrorBanner, Loading, PriorityBadge, StatusBadge, UnsyncedBadge } from '../components/ui';
import { effectiveStatus, hasPending, sortActive } from '../lib/deliveries';
import { errorMessage } from '../lib/api';
import { fullName } from '../lib/format';
import { useApiQuery } from '../lib/queries';
import type { Delivery, Page } from '../lib/types';
import { useSync } from '../offline/SyncProvider';

type Tab = 'active' | 'done';

function DeliveryCard({ delivery }: { delivery: Delivery }) {
  const { pending } = useSync();
  const order = delivery.order;
  const status = effectiveStatus(delivery, pending);
  const itemCount = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <Link
      to={`/deliveries/${delivery._id}`}
      className="block rounded-xl border border-asphalt-200 bg-white p-4 active:bg-asphalt-50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{order?.trackingCode ?? '—'}</p>
        <StatusBadge status={status} />
      </div>
      <p className="mt-1.5 text-sm">{order?.deliveryAddress ?? 'Pedido eliminado'}</p>
      <p className="mt-1 text-xs text-asphalt-600">
        {fullName(order?.customer)} · {itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}
      </p>
      <div className="mt-2 flex gap-2 empty:hidden">
        {delivery.priority === 'high' && <PriorityBadge priority="high" />}
        {hasPending(delivery._id, pending) && <UnsyncedBadge />}
      </div>
    </Link>
  );
}

export default function DeliveriesPage() {
  const [tab, setTab] = useState<Tab>('active');
  const list = useApiQuery<Page<Delivery>>(
    ['deliveries', 'mine', tab],
    '/api/deliveries/me',
    { active: tab === 'active' ? 'true' : 'false', limit: tab === 'active' ? 50 : 20 },
    { refetchInterval: 60_000 },
  );

  const items = list.data ? (tab === 'active' ? sortActive(list.data.data) : list.data.data) : [];

  return (
    <>
      <InstallCard />

      <div role="tablist" className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-asphalt-100 p-1">
        {(['active', 'done'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              'min-h-11 rounded-lg text-sm font-medium transition-colors',
              tab === value ? 'bg-white shadow-sm' : 'text-asphalt-600',
            )}
          >
            {value === 'active' ? 'Activas' : 'Historial'}
          </button>
        ))}
      </div>

      <ErrorBanner message={list.error && errorMessage(list.error)} />

      {list.isLoading ? (
        <Loading />
      ) : items.length === 0 && !list.error ? (
        <EmptyState>
          {tab === 'active' ? 'No tenés entregas pendientes. Cuando te asignen una, aparece acá.' : 'Todavía no completaste entregas.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((delivery) => (
            <li key={delivery._id}>
              <DeliveryCard delivery={delivery} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}