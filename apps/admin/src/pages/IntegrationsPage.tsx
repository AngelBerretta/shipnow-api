import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { WEBHOOK_EVENTS } from '@ruvika/shared';
import {
  Badge, Button, confirmAction, EmptyState, ErrorBanner, Field, Input, Loading, Modal, PageHeader, Panel, Select, Table, Td, Th,
} from '../components/ui';
import { api, errorMessage } from '../lib/api';
import { formatDateTime, fullName, populated } from '../lib/format';
import { useUsersByRole } from '../lib/queries';
import type { Integration } from '../lib/types';

interface Secrets {
  title: string;
  apiKey?: string;
  webhookSecret?: string;
}

const schema = z.object({
  name: z.string().trim().min(1, 'Ingresá el nombre'),
  store: z.string().min(1, 'Elegí una tienda'),
  webhookUrl: z.string().trim().refine((value) => value === '' || /^https?:\/\//.test(value), 'Debe empezar con https://'),
  events: z.array(z.string()),
});
type Values = z.infer<typeof schema>;

function Secret({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div className="flex gap-2">
        <code className="block flex-1 break-all rounded bg-asphalt-100 p-2 text-xs">{value}</code>
        <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(value)}>Copiar</Button>
      </div>
    </div>
  );
}

/** Se muestra una sola vez: el servidor no guarda la API key (solo su hash). */
function SecretsModal({ secrets, onClose }: { secrets: Secrets; onClose: () => void }) {
  return (
    <Modal title={secrets.title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-asphalt-600">Copialo ahora: no se vuelve a mostrar.</p>
        {secrets.apiKey && <Secret label="API key (header X-API-Key)" value={secrets.apiKey} />}
        {secrets.webhookSecret && <Secret label="Secreto de firma de webhooks" value={secrets.webhookSecret} />}
        <div className="flex justify-end">
          <Button variant="accent" onClick={onClose}>Listo</Button>
        </div>
      </div>
    </Modal>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (secrets: Secrets) => void }) {
  const queryClient = useQueryClient();
  const stores = useUsersByRole('store');
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', store: '', webhookUrl: '', events: [...WEBHOOK_EVENTS] },
  });
  const create = useMutation({
    mutationFn: (values: Values) =>
      api<{ apiKey: string; webhookSecret: string }>('/api/integrations', {
        method: 'POST',
        body: { ...values, webhookUrl: values.webhookUrl || null },
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['integrations'] });
      onCreated({ title: 'Integración creada', ...result });
    },
  });

  return (
    <Modal title="Nueva integración" onClose={onClose}>
      <form onSubmit={handleSubmit((values) => create.mutate(values))} className="space-y-4" noValidate>
        <ErrorBanner message={create.error && errorMessage(create.error)} />
        <Field label="Nombre" error={errors.name?.message}><Input placeholder="Tienda Nube de Lucía" {...register('name')} /></Field>
        <Field label="Tienda dueña de los pedidos" error={errors.store?.message}>
          <Select {...register('store')}>
            <option value="">Elegí una tienda…</option>
            {stores.data?.map((user) => <option key={user._id} value={user._id}>{fullName(user)}</option>)}
          </Select>
        </Field>
        <Field label="URL del webhook (opcional)" error={errors.webhookUrl?.message}>
          <Input placeholder="https://mi-sistema.com/webhooks/ruvika" {...register('webhookUrl')} />
        </Field>
        <fieldset className="space-y-1">
          <legend className="mb-1 text-sm font-medium">Eventos</legend>
          {WEBHOOK_EVENTS.map((event) => (
            <label key={event} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={event} {...register('events')} /> {event}
            </label>
          ))}
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="accent" disabled={create.isPending}>Crear integración</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [secrets, setSecrets] = useState<Secrets | null>(null);

  const list = useQuery({ queryKey: ['integrations'], queryFn: () => api<{ data: Integration[] }>('/api/integrations') });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['integrations'] });

  const toggle = useMutation({
    mutationFn: (item: Integration) => api(`/api/integrations/${item._id}`, { method: 'PATCH', body: { isActive: !item.isActive } }),
    onSuccess: refresh,
  });
  const rotateKey = useMutation({
    mutationFn: (id: string) => api<{ apiKey: string }>(`/api/integrations/${id}/rotate-key`, { method: 'POST' }),
    onSuccess: (result) => {
      refresh();
      setSecrets({ title: 'Nueva API key', apiKey: result.apiKey });
    },
  });
  const rotateSecret = useMutation({
    mutationFn: (id: string) => api<{ webhookSecret: string }>(`/api/integrations/${id}/rotate-secret`, { method: 'POST' }),
    onSuccess: (result) => setSecrets({ title: 'Nuevo secreto de firma', webhookSecret: result.webhookSecret }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/integrations/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
  const actionError = toggle.error ?? rotateKey.error ?? rotateSecret.error ?? remove.error;

  return (
    <>
      <PageHeader
        title="Integraciones"
        subtitle="Conectá tiendas y sistemas externos: reciben pedidos por API y avisos por webhook."
        actions={<Button variant="accent" onClick={() => setCreating(true)}>Nueva integración</Button>}
      />
      <div className="mb-3 space-y-2">
        <ErrorBanner message={list.error && errorMessage(list.error)} />
        <ErrorBanner message={actionError && errorMessage(actionError)} />
      </div>

      {list.isLoading ? <Loading /> : list.data && list.data.data.length === 0 ? (
        <EmptyState>Todavía no hay integraciones.</EmptyState>
      ) : list.data && (
        <Table>
          <thead><tr><Th>Nombre</Th><Th>Tienda</Th><Th>Key</Th><Th>Webhook</Th><Th>Estado</Th><Th>Último uso</Th><Th /></tr></thead>
          <tbody>
            {list.data.data.map((item) => (
              <tr key={item._id}>
                <Td className="font-medium">{item.name}</Td>
                <Td>{fullName(populated(item.store))}</Td>
                <Td><code className="text-xs">rvk_{item.keyPrefix}_…</code></Td>
                <Td className="max-w-48 truncate">{item.webhookUrl ?? '—'}</Td>
                <Td><Badge tone={item.isActive ? 'ok' : 'neutral'}>{item.isActive ? 'Activa' : 'Inactiva'}</Badge></Td>
                <Td>{formatDateTime(item.lastUsedAt)}</Td>
                <Td className="space-x-2 whitespace-nowrap text-right">
                  <Button variant="secondary" onClick={() => toggle.mutate(item)}>{item.isActive ? 'Desactivar' : 'Activar'}</Button>
                  <Button variant="secondary" onClick={() => confirmAction('La API key actual dejará de funcionar. ¿Rotarla?') && rotateKey.mutate(item._id)}>Rotar key</Button>
                  <Button variant="secondary" onClick={() => confirmAction('Hay que actualizar el secreto en el sistema receptor. ¿Rotarlo?') && rotateSecret.mutate(item._id)}>Rotar secreto</Button>
                  <Button variant="danger" onClick={() => confirmAction(`¿Eliminar “${item.name}”?`) && remove.mutate(item._id)}>Eliminar</Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="mt-5">
        <Panel title="Cómo conectar un sistema">
          <ul className="space-y-2 text-sm text-asphalt-600">
            <li><strong className="text-asphalt-900">Crear pedidos:</strong> <code>POST /api/inbound/orders</code> con el header <code>X-API-Key</code> (ver Swagger).</li>
            <li><strong className="text-asphalt-900">WooCommerce:</strong> webhook “Pedido actualizado” a <code>/api/inbound/woocommerce/&lt;id de la integración&gt;</code>, con el secreto de firma como “Secret”.</li>
            <li><strong className="text-asphalt-900">Recibir avisos:</strong> cada evento llega por POST firmado (<code>X-Ruvika-Signature: t=…,v1=…</code>, HMAC-SHA256 de <code>t.cuerpo</code>).</li>
          </ul>
        </Panel>
      </div>

      {creating && <CreateModal onClose={() => setCreating(false)} onCreated={(value) => { setCreating(false); setSecrets(value); }} />}
      {secrets && <SecretsModal secrets={secrets} onClose={() => setSecrets(null)} />}
    </>
  );
}