import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Button, EmptyState, ErrorBanner, Field, Input, Loading, Modal, OrderStatusBadge, PageHeader, Pagination, PriorityBadge, Select, Table, Td, Th,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { formatDateTime, formatMoney, fullName, ORDER_STATUS_LABEL, PRIORITY_LABEL } from '../lib/format';
import { useUsersByRole } from '../lib/queries';
import type { Order, OrderStatus, Page } from '../lib/types';

const num = (message: string) => z.number({ error: message });
const schema = z.object({
  customer: z.string().min(1, 'Elegí un cliente'),
  store: z.string().optional(),
  deliveryAddress: z.string().trim().min(1, 'Ingresá la dirección de entrega'),
  priority: z.enum(['low', 'normal', 'high']),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Ingresá el nombre'),
        quantity: num('Ingresá la cantidad').int('Debe ser entera').min(1, 'Mínimo 1'),
        price: num('Ingresá el precio').min(0, 'No puede ser negativo'),
      }),
    )
    .min(1, 'Agregá al menos un ítem'),
});
type Values = z.infer<typeof schema>;

function NewOrderModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const customers = useUsersByRole('customer');
  const stores = useUsersByRole('store');
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { customer: '', store: '', deliveryAddress: '', priority: 'normal', items: [{ name: '', quantity: 1, price: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const create = useMutation({
    mutationFn: (values: Values) =>
      api('/api/orders', { method: 'POST', body: { ...values, store: values.store || undefined } }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
      onClose();
    },
  });

  return (
    <Modal title="Nuevo pedido" onClose={onClose}>
      <form onSubmit={handleSubmit((values) => create.mutate(values))} className="space-y-4" noValidate>
        <ErrorBanner message={create.error && errorMessage(create.error)} />
        <Field label="Cliente" error={errors.customer?.message}>
          <Select {...register('customer')}>
            <option value="">Elegí un cliente…</option>
            {customers.data?.map((user) => (
              <option key={user._id} value={user._id}>{fullName(user)} · {user.email}</option>
            ))}
          </Select>
        </Field>
        <Field label="Tienda (opcional)">
          <Select {...register('store')}>
            <option value="">Sin tienda</option>
            {stores.data?.map((user) => (
              <option key={user._id} value={user._id}>{fullName(user)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Dirección de entrega" error={errors.deliveryAddress?.message}>
          <Input {...register('deliveryAddress')} />
        </Field>
        <Field label="Prioridad">
          <Select {...register('priority')}>
            {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Field>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Ítems</legend>
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-[1fr_5rem_6rem_auto] items-start gap-2">
              <div>
                <Input placeholder="Producto" aria-label="Producto" {...register(`items.${index}.name`)} />
                <span className="text-xs text-rose-700">{errors.items?.[index]?.name?.message}</span>
              </div>
              <div>
                <Input type="number" min={1} aria-label="Cantidad" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                <span className="text-xs text-rose-700">{errors.items?.[index]?.quantity?.message}</span>
              </div>
              <div>
                <Input type="number" min={0} step="0.01" aria-label="Precio" {...register(`items.${index}.price`, { valueAsNumber: true })} />
                <span className="text-xs text-rose-700">{errors.items?.[index]?.price?.message}</span>
              </div>
              <Button type="button" variant="ghost" disabled={fields.length === 1} onClick={() => remove(index)} aria-label="Quitar ítem">×</Button>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => append({ name: '', quantity: 1, price: 0 })}>Agregar ítem</Button>
          <span className="block text-xs text-rose-700">{errors.items?.root?.message ?? errors.items?.message}</span>
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="accent" disabled={create.isPending}>Crear pedido</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [creating, setCreating] = useState(false);

  const orders = useQuery({
    queryKey: ['orders', page, status],
    queryFn: () => api<Page<Order>>('/api/orders', { query: { page, limit: 15, status } }),
  });

  return (
    <>
      <PageHeader
        title="Pedidos"
        actions={
          <>
            <Select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as OrderStatus | '');
                setPage(1);
              }}
            >
              <option value="">Todos los estados</option>
              {Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Button variant="accent" onClick={() => setCreating(true)}>Nuevo pedido</Button>
          </>
        }
      />
      <ErrorBanner message={orders.error && errorMessage(orders.error)} />
      {orders.isLoading ? (
        <Loading />
      ) : orders.data && orders.data.data.length === 0 ? (
        <EmptyState>No hay pedidos con este filtro. Creá uno con “Nuevo pedido” o generá datos de demostración desde el Resumen.</EmptyState>
      ) : (
        orders.data && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Código</Th><Th>Cliente</Th><Th>Estado</Th><Th>Prioridad</Th><Th className="text-right">Total</Th><Th>Creado</Th>
                </tr>
              </thead>
              <tbody>
                {orders.data.data.map((order) => (
                  <tr key={order._id} tabIndex={0} className="cursor-pointer hover:bg-asphalt-50"
                    onClick={() => navigate(`/orders/${order._id}`)}
                    onKeyDown={(event) => event.key === 'Enter' && navigate(`/orders/${order._id}`)}>
                    <Td className="font-medium">{order.trackingCode ?? '—'}</Td>
                    <Td>{fullName(order.customer)}</Td>
                    <Td><OrderStatusBadge status={order.status} /></Td>
                    <Td><PriorityBadge priority={order.priority} /></Td>
                    <Td className="text-right">{formatMoney(order.total)}</Td>
                    <Td>{formatDateTime(order.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={orders.data.pagination.page} totalPages={orders.data.pagination.totalPages} total={orders.data.pagination.total} onChange={setPage} />
          </>
        )
      )}
      {creating && <NewOrderModal onClose={() => setCreating(false)} />}
    </>
  );
}
