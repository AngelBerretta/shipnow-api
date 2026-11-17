import { useEffect, useState } from 'react';
import { errorMessage } from '../lib/api';
import { disablePush, enablePush, getPushState, type PushState } from '../lib/push';
import { cn } from './ui';

export default function PushToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPushState().then(setState);
  }, []);

  if (state === null || state === 'unsupported') return null;

  const on = state === 'on';
  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (on) await disablePush();
      else await enablePush();
      setState(on ? 'off' : 'on');
    } catch (err) {
      setError(errorMessage(err));
      setState(await getPushState());
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={busy || state === 'denied'}
        onClick={() => void toggle()}
        className="mt-2 flex min-h-14 w-full items-center justify-between rounded-xl bg-asphalt-800 px-4 text-left disabled:opacity-60"
      >
        <span>
          <span className="block text-sm font-medium">Avisos de nuevas entregas</span>
          <span className="block text-xs text-asphalt-400">
            {state === 'denied' ? 'Bloqueados: habilitalos en los ajustes del navegador' : on ? 'Te avisamos cuando te asignen una entrega' : 'Activalos para enterarte al instante'}
          </span>
        </span>
        <span aria-hidden className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-signal' : 'bg-asphalt-600')}>
          <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all', on ? 'left-[22px]' : 'left-0.5')} />
        </span>
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-rose-300">{error}</p>}
    </>
  );
}