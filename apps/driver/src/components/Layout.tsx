import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useOnline } from '../lib/online';
import { useSync } from '../offline/SyncProvider';
import { cn, Notice } from './ui';
import PushToggle from './PushToggle';
import { disablePush } from '../lib/push';

function AvailabilityToggle() {
  const { user, patchUser } = useAuth();
  const { queueAction } = useSync();
  if (!user) return null;

  const available = user.isAvailable !== false;
  const toggle = () => {
    patchUser({ isAvailable: !available });
    void queueAction({ type: 'availability', isAvailable: !available });
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={available}
      onClick={toggle}
      className="mt-3 flex min-h-14 w-full items-center justify-between rounded-xl bg-asphalt-800 px-4 text-left"
    >
      <span>
        <span className="block text-sm font-medium">{available ? 'Disponible' : 'No disponible'}</span>
        <span className="block text-xs text-asphalt-400">
          {available ? 'Los administradores pueden asignarte entregas' : 'Los administradores te ven como no disponible'}
        </span>
      </span>
      <span aria-hidden className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', available ? 'bg-signal' : 'bg-asphalt-600')}>
        <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all', available ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  );
}

function ConnectionBanner() {
  const online = useOnline();
  const { pending, syncing, dropped, clearDropped, syncNow } = useSync();

  return (
    <div className="space-y-2 px-4 pt-3 empty:hidden">
      {!online && (
        <Notice tone="warn">Sin conexión. Podés seguir trabajando: tus cambios se guardan y se envían solos cuando vuelva internet.</Notice>
      )}
      {online && pending.length > 0 && (
        <Notice tone="info">
          {syncing ? 'Enviando cambios…' : `${pending.length} cambio(s) sin enviar.`}
          {!syncing && (
            <button type="button" className="ml-2 font-medium underline" onClick={() => void syncNow()}>
              Reintentar
            </button>
          )}
        </Notice>
      )}
      {dropped > 0 && (
        <Notice tone="bad">
          {dropped} cambio(s) no se pudieron aplicar porque la entrega ya había cambiado. Revisá su estado.
          <button type="button" className="ml-2 font-medium underline" onClick={clearDropped}>
            Entendido
          </button>
        </Notice>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { pending } = useSync();

  const onLogout = async () => {
    if (
      pending.length > 0 &&
      !window.confirm(
        `Tenés ${pending.length} cambio(s) sin enviar. Se enviarán cuando vuelvas a ingresar con esta cuenta. ¿Cerrar sesión igual?`,
      )
    ) {
      return;
    }
    await disablePush().catch(() => {}); // sin conexión o sin push: no frena el cierre de sesión
    void logout();
  };

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="sticky top-0 z-10 bg-asphalt-900 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <span aria-hidden className="h-7 w-1 rounded-full bg-[repeating-linear-gradient(to_bottom,var(--color-signal)_0_6px,transparent_6px_10px)]" />
            <span>
              <span className="block text-lg font-semibold leading-tight tracking-tight">Ruvika</span>
              <span className="block text-xs text-asphalt-400">{user?.firstName} {user?.lastName}</span>
            </span>
          </Link>
          <button type="button" onClick={() => void onLogout()} className="min-h-10 rounded-lg px-3 text-sm text-asphalt-200">
            Salir
          </button>
        </div>
        <AvailabilityToggle />
        <PushToggle />
      </header>

      <ConnectionBanner />

      <main className="flex-1 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
    </div>
  );
}