import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { effectiveStatus } from '../lib/deliveries';
import { useApiQuery } from '../lib/queries';
import type { Delivery, Page } from '../lib/types';
import { useSync } from '../offline/SyncProvider';
import { cn } from './ui';

const PREF_KEY = 'ruvika.driver.shareLocation';
const SEND_EVERY_MS = 10_000;
const MAX_ACCURACY_M = 500;

interface Reading {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number;
  speed?: number;
}

const finite = (value: number | null) => (value !== null && Number.isFinite(value) ? value : undefined);

/**
 * Comparte la ubicación SOLO mientras hay una entrega activa y el repartidor no lo desactivó.
 * No pasa por la cola offline: una posición vieja no sirve, si no hay red simplemente se salta.
 * Necesita HTTPS (la Geolocation API no funciona en HTTP, salvo localhost).
 */
export default function LocationSharing() {
  const { pending } = useSync();
  // Misma consulta que "Activas": se comparte la caché, no hay un request extra.
  const list = useApiQuery<Page<Delivery>>(['deliveries', 'mine', 'active'], '/api/deliveries/me', { active: 'true', limit: 50 }, { refetchInterval: 60_000 });
  const [enabled, setEnabled] = useState(() => localStorage.getItem(PREF_KEY) !== '0');
  const [error, setError] = useState<string | null>(null);

  const supported = 'geolocation' in navigator;
  const hasActive = (list.data?.data ?? []).some((delivery) => effectiveStatus(delivery, pending) !== 'delivered');
  const sharing = supported && enabled && hasActive;

  useEffect(() => {
    if (!sharing) return;
    let latest: Reading | null = null;

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setError(null);
        latest = {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
          heading: finite(coords.heading),
          speed: finite(coords.speed),
        };
      },
      (failure) =>
        setError(failure.code === failure.PERMISSION_DENIED ? 'Permiso de ubicación denegado: habilitalo en los ajustes del navegador.' : 'No se pudo obtener la ubicación.'),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );

    // Latido: aunque el repartidor esté quieto, el servidor sigue viendo que está vivo.
    const timer = setInterval(() => {
      if (!latest || !navigator.onLine || latest.accuracy > MAX_ACCURACY_M) return;
      void api('/api/locations/me', { method: 'POST', body: latest }).catch(() => {});
    }, SEND_EVERY_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(timer);
    };
  }, [sharing]);

  // Wake Lock: con la pantalla apagada el navegador deja de dar posiciones. Se re-pide al volver a primer plano.
  useEffect(() => {
    if (!sharing || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
      } catch {
        /* sin Wake Lock: se sigue sin mantener la pantalla encendida */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [sharing]);

  if (!supported) return null;

  const toggle = () => {
    localStorage.setItem(PREF_KEY, enabled ? '0' : '1');
    setEnabled(!enabled);
  };
  const hint = !enabled
    ? 'Desactivado: no compartís tu posición'
    : sharing
      ? 'Compartiendo tu posición. Mantené la app abierta.'
      : 'Se activa cuando tengas una entrega en curso';

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        className="mt-2 flex min-h-14 w-full items-center justify-between rounded-xl bg-asphalt-800 px-4 text-left"
      >
        <span>
          <span className="block text-sm font-medium">Compartir ubicación</span>
          <span className="block text-xs text-asphalt-400">{hint}</span>
        </span>
        <span aria-hidden className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', enabled ? 'bg-signal' : 'bg-asphalt-600')}>
          <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all', enabled ? 'left-[22px]' : 'left-0.5')} />
        </span>
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-rose-300">{error}</p>}
    </>
  );
}