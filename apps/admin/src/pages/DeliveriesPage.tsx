import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button, confirmAction, DeliveryStatusBadge, EmptyState, ErrorBanner, Field, Loading, Modal, PageHeader, Pagination, PriorityBadge, Select, Table, Td, Th,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { DELIVERY_STATUS_LABEL, formatDateTime, fullName, nextDeliveryStatus, populated, PRIORITY_LABEL } from '../lib/format';
import { useUsersByRole } from '../lib/queries';
import type { Delivery, DeliveryStatus, Order, Page, Priority } from '../lib/types';

function NewDeliveryModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const drivers = useUsersByRole('driver');
  const [order, setOrder] = useState('');
  const [driver, setDriver] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  // Solo los pedidos en estado "created" pueden recibir una entrega.
  const pending = useQuery({
    queryKey: ['orders', 'created-for-delivery'],
    queryFn: () => api<Page<Order>>('/api/orders', { query: { status: 'created', limit: 100 } }),
  });
  const create = useMutation({
    mutationFn: () => api('/api/deliveries', { method: 'POST', body: { order, driver, priority } }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      onClose();
    },
  });

  return (
    <Modal title="Nueva entrega" onClose={onClose}>
      <div className="space-y-4">
        <ErrorBanner message={create.error && errorMessage(create.error)} />
        <Field label="Pedido sin asignar">
          <Select value={order} onChange={(event) => setOrder(event.target.value)}>
            <option value="">{pending.data?.data.length === 0 ? 'No hay pedidos sin asignar' : 'Elegí un pedido…'}</option>
            {pending.data?.data.map((o) => (
              <option key={o._id} value={o._id}>{o.trackingCode} · {fullName(o.customer)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Repartidor">
          <Select value={driver} onChange={(event) => setDriver(event.target.value)}>
            <option value="">Elegí un repartidor…</option>
            {drivers.data?.map((u) => <option key={u._id} value={u._id}>{fullName(u)}</option>)}
          </Select>
        </Field>
        <Field label="Prioridad">
          <Select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="accent" disabled={!order || !driver || create.isPending} onClick={() => create.mutate()}>Crear entrega</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function DeliveriesPage() {
  const queryClient = useQueryClient();
  const drivers = useUsersByRole('driver');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<DeliveryStatus | ''>('');
  const [driver, setDriver] = useState('');
  const [creating, setCreating] = useState(false);

  const deliveries = useQuery({
    queryKey: ['deliveries', page, status, driver],
    queryFn: () => api<Page<Delivery>>('/api/deliveries', { query: { page, limit: 15, status, driver } }),
  });
  const refresh = () => void queryClient.invalidateQueries();
  const advance = useMutation({
    mutationFn: ({ id, next }: { id: string; next: DeliveryStatus }) =>
      api(`/api/deliveries/${id}/status`, { method: 'PATCH', body: { status: next } }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/deliveries/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };
  const actionError = advance.error ?? remove.error;

  return (
    <>
      <PageHeader
        title="Entregas"
        actions={
          <>
            <Select aria-label="Filtrar por estado" value={status} onChange={(e) => resetPage(setStatus)(e.target.value as DeliveryStatus | '')}>
              <option value="">Todos los estados</option>
              {Object.entries(DELIVERY_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Select aria-label="Filtrar por repartidor" value={driver} onChange={(e) => resetPage(setDriver)(e.target.value)}>
              <option value="">Todos los repartidores</option>
              {drivers.data?.map((u) => <option key={u._id} value={u._id}>{fullName(u)}</option>)}
            </Select>
            <Button variant="accent" onClick={() => setCreating(true)}>Nueva entrega</Button>
          </>
        }
      />
      <div className="mb-3 space-y-2">
        <ErrorBanner message={deliveries.error && errorMessage(deliveries.error)} />
        <ErrorBanner message={actionError && errorMessage(actionError)} />
      </div>

      {deliveries.isLoading ? <Loading /> : deliveries.data && deliveries.data.data.length === 0 ? (
        <EmptyState>No hay entregas con este filtro. Asigná un repartidor a un pedido para crear la primera.</EmptyState>
      ) : deliveries.data && (
        <>
          <Table>
            <thead>
              <tr><Th>Pedido</Th><Th>Repartidor</Th><Th>Estado</Th><Th>Prioridad</Th><Th>Asignada</Th><Th>Entregada</Th><Th /></tr>
            </thead>
            <tbody>
              {deliveries.data.data.map((delivery) => {
                const order = populated(delivery.order);
                const next = nextDeliveryStatus(delivery.status);
                return (
                  <tr key={delivery._id}>
                    <Td className="font-medium">
                      {order ? <Link className="underline decoration-asphalt-200 underline-offset-2 hover:decoration-signal-dark" to={`/orders/${order._id}`}>{order.trackingCode ?? order._id}</Link> : '—'}
                    </Td>
                    <Td>{fullName(populated(delivery.driver))}</Td>
                    <Td><DeliveryStatusBadge status={delivery.status} /></Td>
                    <Td><PriorityBadge priority={delivery.priority} /></Td>
                    <Td>{formatDateTime(delivery.assignedAt)}</Td>
                    <Td>{formatDateTime(delivery.deliveredAt)}</Td>
                    <Td className="space-x-2 whitespace-nowrap text-right">
                      {next && (
                        <Button variant="secondary" disabled={advance.isPending} onClick={() => advance.mutate({ id: delivery._id, next })}>
                          {DELIVERY_STATUS_LABEL[next]}
                        </Button>
                      )}
                      <Button variant="danger" onClick={() => confirmAction('¿Eliminar la entrega?') && remove.mutate(delivery._id)}>Eliminar</Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <Pagination page={deliveries.data.pagination.page} totalPages={deliveries.data.pagination.totalPages} total={deliveries.data.pagination.total} onChange={setPage} />
        </>
      )}
      {creating && <NewDeliveryModal onClose={() => setCreating(false)} />}
    </>
  );
}
