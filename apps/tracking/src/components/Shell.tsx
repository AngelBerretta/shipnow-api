import { Link, Outlet } from 'react-router-dom';

export default function Shell() {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col">
      <header className="flex items-center gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <span aria-hidden className="h-7 w-1 rounded-full bg-[repeating-linear-gradient(to_bottom,var(--color-signal)_0_6px,transparent_6px_10px)]" />
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Ruvika
        </Link>
        <span className="text-sm text-asphalt-600">Seguimiento de pedidos</span>
      </header>
      <main className="flex-1 px-4 py-4">
        <Outlet />
      </main>
      <footer className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-asphalt-400">
        Ruvika · Gestión logística
      </footer>
    </div>
  );
}