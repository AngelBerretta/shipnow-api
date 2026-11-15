import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { cn, Button } from './ui';

const NAV = [
  { to: '/', label: 'Resumen', end: true },
  { to: '/orders', label: 'Pedidos' },
  { to: '/deliveries', label: 'Entregas' },
  { to: '/users', label: 'Usuarios' },
  { to: '/products', label: 'Productos' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="bg-asphalt-900 text-asphalt-200 md:w-56 md:shrink-0">
        <div className="flex items-center gap-3 px-5 py-5">
          {/* Línea de calzada: el marcador de la marca */}
          <span aria-hidden className="h-7 w-1 rounded-full bg-[repeating-linear-gradient(to_bottom,var(--color-signal)_0_6px,transparent_6px_10px)]" />
          <span className="text-lg font-semibold tracking-tight text-white">Ruvika</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0" aria-label="Principal">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-md border-l-[3px] px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'border-signal bg-asphalt-800 font-medium text-white'
                    : 'border-transparent hover:bg-asphalt-800 hover:text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-asphalt-200 bg-white px-6 py-2.5 text-sm">
          <span className="text-asphalt-600">
            {user?.firstName} {user?.lastName}
          </span>
          <Button variant="secondary" onClick={() => void logout()}>
            Cerrar sesión
          </Button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
