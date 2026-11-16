import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, confirmAction, DeliveryStatusBadge, ErrorBanner, Loading, OrderStatusBadge, PageHeader, Panel, PriorityBadge, Select,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import {
  canCancelOrder, DELIVERY_STATUS_LABEL, EVENT_LABEL, driverLabel, formatDateTime, formatMoney, fullName, nextDeliveryStatus, ORDER_STATUS_LABEL, populated, PRIORITY_LABEL,
} from '../lib/format';
import { useUsersByRole } from '../lib/queries';
import type { Delivery, Order, OrderTimeline, Priority } from '../lib/types';

export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const drivers = useUsersByRole('driver');
  const [driverId, setDriverId] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');

  const order = useQuery({ queryKey: ['order', id], queryFn: () => api<Order>(`/api/orders/${id}`) });
  const events = useQuery({ queryKey: ['order-events', id], queryFn: () => api<OrderTimeline>(`/api/orders/${id}/events`) });
  const deliveryId = order.data?.delivery?._id;
  // El pedido trae la entrega sin el repartidor populado: se pide aparte para mostrar su nombre.
  const delivery = useQuery({
    queryKey: ['delivery', deliveryId],
    queryFn: () => api<Delivery>(`/api/deliveries/${deliveryId}`),
    enabled: Boolean(deliveryId),
  });

  const refresh = () => void queryClient.invalidateQueries();
  const assign = useMutation({
    mutationFn: () => api('/api/deliveries', { method: 'POST', body: { order: id, driver: driverId, priority } }),
    onSuccess: refresh,
  });
  const advance = useMutation({
    mutationFn: (status: string) => api(`/api/deliveries/${deliveryId}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: refresh,
  });
  const unassign = useMutation({
    mutationFn: () => api(`/api/deliveries/${deliveryId}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
  const cancel = useMutation({
    mutationFn: () => api(`/api/orders/${id}/status`, { method: 'PATCH', body: { status: 'cancelled' } }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/orders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      navigate('/orders');
    },
  });

  if (order.isLoading) return <Loading />;
  if (order.error || !order.data) return <ErrorBanner message={errorMessage(order.error)} />;

  const o = order.data;
  const d = delivery.data;
  const driver = populated(d?.driver);
  const next = d ? nextDeliveryStatus(d.status) : null;
  const actionError = [assign, advance, unassign, cancel, remove].map((m) => m.error).find(Boolean);

  return (
    <>
      <PageHeader
        title={`Pedido ${o.trackingCode ?? o._id}`}
        subtitle={`Creado ${formatDateTime(o.createdAt)}`}
        actions={
          <>
            <Link to="/orders"><Button variant="secondary">Volver</Button></Link>
            <Button variant="danger" onClick={() => confirmAction('¿Eliminar el pedido, su entrega y su historial?') && remove.mutate()}>
              Eliminar pedido
            </Button>
          </>
        }
      />
      <div className="mb-4"><ErrorBanner message={actionError && errorMessage(actionError)} /></div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Detalle">
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-asphalt-600">Estado</dt><dd><OrderStatusBadge status={o.status} /></dd>
              <dt className="text-asphalt-600">Prioridad</dt><dd><PriorityBadge priority={o.priority} /></dd>
              <dt className="text-asphalt-600">Cliente</dt><dd>{fullName(o.customer)} <span className="text-asphalt-400">{o.customer?.email}</span></dd>
              <dt className="text-asphalt-600">Dirección</dt><dd>{o.deliveryAddress}</dd>
              <dt className="text-asphalt-600">Total</dt><dd className="font-medium">{formatMoney(o.total)}</dd>
            </dl>
            <ul className="mt-4 divide-y divide-asphalt-100 border-t border-asphalt-100 text-sm">
              {o.items.map((item, index) => (
                <li key={index} className="flex justify-between py-2">
                  <span>{item.quantity} × {item.name}</span>
                  <span>{formatMoney(item.quantity * item.price)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Entrega">
            {o.delivery && d ? (
              <div className="space-y-3 text-sm">
                <p>
                  Repartidor: <strong>{fullName(driver)}</strong> · <DeliveryStatusBadge status={d.status} />
                </p>
                {d.documents.length > 0 && (
                  <p className="text-asphalt-600">Comprobantes: {d.documents.map((doc) => doc.originalName).join(', ')}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {next && (
                    <Button variant="accent" disabled={advance.isPending} onClick={() => advance.mutate(next)}>
                      Marcar como {DELIVERY_STATUS_LABEL[next].toLowerCase()}
                    </Button>
                  )}
                  <Button variant="danger" onClick={() => confirmAction('¿Quitar la entrega? El pedido vuelve a “Creado” si estaba en curso.') && unassign.mutate()}>
                    Quitar entrega
                  </Button>
                </div>
              </div>
            ) : o.delivery ? (
              <Loading />
            ) : o.status === 'created' ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-48 flex-1">
                  <Select aria-label="Repartidor" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
                    <option value="">Elegí un repartidor…</option>
                    {drivers.data?.map((user) => <option key={user._id} value={user._id}>{driverLabel(user)}</option>)}
                  </Select>
                </div>
                <Select aria-label="Prioridad de la entrega" className="w-32" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                  {Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
                <Button variant="accent" disabled={!driverId || assign.isPending} onClick={() => assign.mutate()}>Asignar repartidor</Button>
              </div>
            ) : (
              <p className="text-sm text-asphalt-600">Este pedido no tiene entrega asociada.</p>
            )}
            {!o.delivery && canCancelOrder(o.status) && (
              <div className="mt-4 border-t border-asphalt-100 pt-3">
                <Button variant="danger" onClick={() => confirmAction('¿Cancelar el pedido? No se puede deshacer.') && cancel.mutate()}>
                  Cancelar pedido
                </Button>
              </div>
            )}
          </Panel>
        </div>

        <Panel title="Historial">
          {events.isLoading ? <Loading /> : (
            <ol className="relative space-y-4 border-l-2 border-asphalt-100 pl-4 text-sm">
              {events.data?.events.map((event) => (
                <li key={event._id}>
                  <span aria-hidden className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-signal" />
                  <p className="font-medium">{EVENT_LABEL[event.type]}</p>
                  {event.toStatus && (
                    <p className="text-asphalt-600">
                      {event.fromStatus ? `${ORDER_STATUS_LABEL[event.fromStatus]} → ` : ''}{ORDER_STATUS_LABEL[event.toStatus]}
                    </p>
                  )}
                  <p className="text-xs text-asphalt-400">{formatDateTime(event.occurredAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </>
  );
}
