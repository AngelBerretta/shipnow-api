import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QrCode from '../components/QrCode';
import { cn, ErrorBanner, Loading, Notice, Panel } from '../components/ui';
import { errorMessage, fetchTracking, NOT_FOUND_MESSAGE } from '../lib/api';
import { formatDateTime, formatTime } from '../lib/format';
import {
  isFinal,
  isValidCode,
  normalizeCode,
  SHORT_LABEL,
  STATUS_HINT,
  STATUS_LABEL,
  STEPS,
  trackingPath,
  whatsappUrl,
} from '../lib/tracking';
import type { OrderStatus, TrackingEvent } from '../lib/types';

const TrackingMap = lazy(() => import('../components/TrackingMap'));
const LIVE_REFRESH_MS = 15_000;
const REFRESH_MS = 30_000;

/** La API gratuita de Render se duerme: la primera consulta puede tardar cerca de un minuto. */
function useSlow(active: boolean, ms = 4000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(timer);
  }, [active, ms]);
  return slow;
}

function Progress({ status }: { status: OrderStatus }) {
  const current = STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Progreso del pedido">
      {STEPS.map((step, index) => (
        <li key={step} className="text-center" aria-current={index === current ? 'step' : undefined}>
          <span className={cn('block h-1.5 rounded-full', index <= current ? 'bg-signal' : 'bg-asphalt-200')} />
          <span className={cn('mt-1 block text-[11px] leading-tight', index <= current ? 'font-medium' : 'text-asphalt-400')}>
            {SHORT_LABEL[step]}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Timeline({ events }: { events: TrackingEvent[] }) {
  return (
    <ol className="relative space-y-4 border-l-2 border-asphalt-100 pl-4 text-sm">
      {[...events].reverse().map((event, index) => (
        <li key={`${event.status}-${event.occurredAt}-${index}`}>
          <span aria-hidden className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-signal" />
          <p className="font-medium">{STATUS_LABEL[event.status]}</p>
          <p className="text-xs text-asphalt-600">{formatDateTime(event.occurredAt)}</p>
        </li>
      ))}
    </ol>
  );
}

function SharePanel({ code }: { code: string }) {
  const link = `${window.location.origin}${trackingPath(code)}`;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin acceso al portapapeles: queda el botón de WhatsApp */
    }
  };

  return (
    <Panel title="Compartir seguimiento">
      <div className="flex items-center gap-4">
        <QrCode value={link} label={`Código QR del seguimiento ${code}`} />
        <div className="min-w-0 flex-1 space-y-2">
          <a
            href={whatsappUrl(code, link)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-asphalt-900 px-3 text-sm font-semibold text-white active:brightness-95"
          >
            Enviar por WhatsApp
          </a>
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-asphalt-200 bg-white px-3 text-sm font-semibold active:bg-asphalt-50"
          >
            {copied ? 'Enlace copiado' : 'Copiar enlace'}
          </button>
        </div>
      </div>
    </Panel>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <ErrorBanner message={message} />
      <Link to="/" className="inline-flex min-h-11 items-center text-sm font-medium underline">
        Probar con otro código
      </Link>
    </div>
  );
}

export default function TrackingPage() {
  const { code = '' } = useParams();
  const normalized = normalizeCode(code);
  const valid = isValidCode(normalized);

  const tracking = useQuery({
    queryKey: ['tracking', normalized],
    queryFn: () => fetchTracking(normalized),
    enabled: valid,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (isFinal(status)) return false;
      return status === 'in_transit' ? LIVE_REFRESH_MS : REFRESH_MS;
    },
  });
  const slow = useSlow(tracking.isLoading);

  // Un código con formato inválido ni se consulta: el mensaje es el mismo que el de "no existe".
  if (!valid) return <Problem message={NOT_FOUND_MESSAGE} />;
  if (tracking.isLoading) {
    return (
      <>
        <Loading label="Buscando tu pedido…" />
        {slow && <Notice tone="info">Despertando el servidor… la primera consulta puede tardar hasta un minuto.</Notice>}
      </>
    );
  }
  if (!tracking.data) return <Problem message={errorMessage(tracking.error)} />;

  const t = tracking.data;
  const cancelled = t.status === 'cancelled';

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-asphalt-900 p-5 text-white">
        <p className="text-xs uppercase tracking-wide text-asphalt-400">Pedido {t.trackingCode}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{STATUS_LABEL[t.status]}</h1>
        <p className="mt-1 text-sm text-asphalt-200">{STATUS_HINT[t.status]}</p>
      </div>

      {tracking.isError && <Notice tone="warn">No pudimos actualizar. Mostramos la última información disponible.</Notice>}

      {cancelled ? <Notice tone="bad">Este pedido fue cancelado. Si tenés dudas, contactá al comercio.</Notice> : <Progress status={t.status} />}
      {t.location && (
        <Panel title="Tu pedido en el mapa">
          <Suspense fallback={<Loading label="Cargando mapa…" />}>
            <TrackingMap lat={t.location.lat} lng={t.location.lng} />
          </Suspense>
          <p className="mt-3 text-sm font-medium">
            {t.eta ? `Llega en aproximadamente ${t.eta.minutes} min.` : 'Calculando el tiempo de llegada…'}
          </p>
          <p className="mt-1 text-xs text-asphalt-400">Posición actualizada a las {formatTime(Date.parse(t.location.updatedAt))}</p>
        </Panel>
      )}      

      <Panel title="Detalles">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-asphalt-600">Zona de entrega</dt>
          <dd className="text-right font-medium">{t.address || '—'}</dd>
          <dt className="text-asphalt-600">Repartidor</dt>
          <dd className="text-right font-medium">{t.driver ? `${t.driver.firstName} ${t.driver.lastInitial}.` : 'Todavía no asignado'}</dd>
        </dl>
      </Panel>

      <Panel title="Historial">
        <Timeline events={t.events} />
      </Panel>

      <p className="text-center text-xs text-asphalt-400">
        Última actualización: {formatTime(tracking.dataUpdatedAt)}
        {!isFinal(t.status) && ' · se actualiza solo'}
      </p>

      <SharePanel code={t.trackingCode} />
    </div>
  );
}