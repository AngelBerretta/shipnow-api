import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, ButtonLink, cn, ErrorBanner, Loading, Panel, PriorityBadge, StatusBadge, UnsyncedBadge } from '../components/ui';
import { errorMessage } from '../lib/api';
import {
  ACTION_LABEL,
  effectiveStatus,
  googleMapsUrl,
  hasPending,
  nextStatus,
  STATUS_LABEL,
  STEPS,
  wazeUrl,
} from '../lib/deliveries';
import { formatDateTime, fullName } from '../lib/format';
import { prepareProof } from '../lib/image';
import { useApiQuery } from '../lib/queries';
import type { Delivery } from '../lib/types';
import type { QueuedAction } from '../offline/db';
import { useSync } from '../offline/SyncProvider';

type PendingProof = Extract<QueuedAction, { type: 'proof' }>;

export default function DeliveryDetailPage() {
  const { id = '' } = useParams();
  const { pending, queueAction } = useSync();
  const delivery = useApiQuery<Delivery>(['delivery', id], `/api/deliveries/${id}`);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Fotos sacadas que todavía no se subieron: se muestran igual para que el repartidor vea que están.
  const proofs = useMemo(
    () => pending.filter((a): a is PendingProof => a.type === 'proof' && a.deliveryId === id),
    [pending, id],
  );
  const previews = useMemo(() => proofs.map((proof) => ({ id: proof.id, url: URL.createObjectURL(proof.blob) })), [proofs]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  if (delivery.isLoading) return <Loading />;
  if (delivery.error || !delivery.data) return <ErrorBanner message={errorMessage(delivery.error)} />;

  const d = delivery.data;
  const order = d.order;
  const status = effectiveStatus(d, pending);
  const next = nextStatus(status);
  const canAdvance = next !== undefined && next !== 'assigned';
  const hasProof = d.documents.length > 0 || proofs.length > 0;
  const stepIndex = STEPS.indexOf(status);

  const advance = async () => {
    if (!next) return;
    if (
      next === 'delivered' &&
      !hasProof &&
      !window.confirm('Todavía no sacaste la foto del comprobante. ¿Marcar como entregada igual?')
    ) {
      return;
    }
    await queueAction({ type: 'status', deliveryId: d._id, status: next });
  };

  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setPhotoError(null);
    try {
      const prepared = await prepareProof(file);
      await queueAction({ type: 'proof', deliveryId: d._id, blob: prepared, filename: prepared.name, mimeType: prepared.type });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'No se pudo procesar la foto.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Link to="/" className="inline-flex min-h-10 items-center text-sm text-asphalt-600">
          ← Mis entregas
        </Link>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{order?.trackingCode ?? 'Entrega'}</h1>
          <div className="flex flex-wrap justify-end gap-1.5">
            <StatusBadge status={status} />
            {d.priority === 'high' && <PriorityBadge priority="high" />}
            {hasPending(d._id, pending) && <UnsyncedBadge />}
          </div>
        </div>
      </div>

      <ol className="grid grid-cols-4 gap-1" aria-label="Progreso">
        {STEPS.map((step, index) => (
          <li key={step} className="text-center">
            <span className={cn('block h-1.5 rounded-full', index <= stepIndex ? 'bg-signal' : 'bg-asphalt-200')} />
            <span className={cn('mt-1 block text-[11px]', index <= stepIndex ? 'font-medium' : 'text-asphalt-400')}>
              {STATUS_LABEL[step]}
            </span>
          </li>
        ))}
      </ol>

      {canAdvance && next && (
        <Button variant="accent" onClick={() => void advance()}>
          {ACTION_LABEL[next]}
        </Button>
      )}
      {status === 'delivered' && <p className="text-center text-sm font-medium text-emerald-700">Entrega completada.</p>}

      <Panel title="Dirección">
        <p className="text-base font-medium">{order?.deliveryAddress ?? 'Pedido eliminado'}</p>
        {order && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ButtonLink href={googleMapsUrl(order.deliveryAddress)}>Google Maps</ButtonLink>
            <ButtonLink href={wazeUrl(order.deliveryAddress)}>Waze</ButtonLink>
          </div>
        )}
      </Panel>

      <Panel title="Cliente y pedido">
        <p className="text-sm font-medium">{fullName(order?.customer)}</p>
        <ul className="mt-2 divide-y divide-asphalt-100 text-sm">
          {order?.items.map((item, index) => (
            <li key={index} className="py-2">
              {item.quantity} × {item.name}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Comprobante de entrega">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void onPhoto(event)}
        />
        <Button variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
          {busy ? 'Procesando foto…' : 'Sacar foto'}
        </Button>
        <div className="mt-3 empty:hidden">
          <ErrorBanner message={photoError} />
        </div>

        {(previews.length > 0 || d.documents.length > 0) && (
          <ul className="mt-3 space-y-2 text-sm">
            {previews.map((preview) => (
              <li key={preview.id} className="flex items-center gap-3">
                <img src={preview.url} alt="Foto del comprobante" className="h-14 w-14 rounded-lg object-cover" />
                <UnsyncedBadge />
              </li>
            ))}
            {d.documents.map((doc) => (
              <li key={doc._id} className="text-asphalt-600">
                {doc.originalName} · {formatDateTime(doc.uploadedAt)}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}