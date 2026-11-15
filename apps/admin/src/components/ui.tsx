import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { DELIVERY_STATUS_LABEL, ORDER_STATUS_LABEL, PRIORITY_LABEL } from '../lib/format';
import type { DeliveryStatus, OrderStatus, Priority } from '../lib/types';

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ---------- Botones ---------- */
type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-asphalt-900 text-white hover:bg-asphalt-800',
  accent: 'bg-signal text-asphalt-950 hover:brightness-95 font-semibold',
  secondary: 'bg-white text-asphalt-900 border border-asphalt-200 hover:bg-asphalt-50',
  ghost: 'text-asphalt-600 hover:bg-asphalt-100',
  danger: 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50',
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
    />
  );
}

/* ---------- Campos ---------- */
const FIELD = 'w-full rounded-md border border-asphalt-200 bg-white px-3 py-2 text-sm placeholder:text-asphalt-400';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} {...props} className={cn(FIELD, className)} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} {...props} className={cn(FIELD, className)} />;
  },
);

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-asphalt-800">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-700">{error}</span>}
    </label>
  );
}

/* ---------- Estructura ---------- */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-asphalt-600">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export const Panel = ({ title, children, className }: { title?: string; children: ReactNode; className?: string }) => (
  <section className={cn('rounded-md border border-asphalt-200 bg-white', className)}>
    {title && <h2 className="border-b border-asphalt-100 px-4 py-3 text-sm font-semibold">{title}</h2>}
    <div className="p-4">{children}</div>
  </section>
);

export const ErrorBanner = ({ message }: { message?: string | null }) =>
  message ? (
    <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
      {message}
    </p>
  ) : null;

export const Loading = ({ label = 'Cargando…' }: { label?: string }) => (
  <p className="py-8 text-center text-sm text-asphalt-600">{label}</p>
);

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="py-10 text-center text-sm text-asphalt-600">{children}</p>
);

/* ---------- Tabla ---------- */
export const Table = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto rounded-md border border-asphalt-200 bg-white">
    <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
  </div>
);
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cn('border-b border-asphalt-200 bg-asphalt-50 px-4 py-2.5 font-medium text-asphalt-600', className)}>{children}</th>
);
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cn('border-b border-asphalt-100 px-4 py-2.5 align-middle', className)}>{children}</td>
);

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-asphalt-600">
      <span>{total} en total</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Anterior
        </Button>
        <span>
          Página {page} de {Math.max(totalPages, 1)}
        </span>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-asphalt-950/60 p-4 sm:p-10" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-md bg-white shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-asphalt-100 px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button aria-label="Cerrar" className="rounded px-2 text-xl leading-none text-asphalt-600 hover:bg-asphalt-100" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Estados con color ---------- */
const TONES = {
  neutral: 'bg-asphalt-100 text-asphalt-800',
  info: 'bg-sky-100 text-sky-800',
  warn: 'bg-amber-100 text-amber-900',
  ok: 'bg-emerald-100 text-emerald-800',
  bad: 'bg-rose-100 text-rose-800',
};

export const Badge = ({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: ReactNode }) => (
  <span className={cn('inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium', TONES[tone])}>{children}</span>
);

export const ORDER_TONE: Record<OrderStatus, keyof typeof TONES> = {
  created: 'neutral',
  assigned: 'info',
  picked_up: 'info',
  in_transit: 'warn',
  delivered: 'ok',
  cancelled: 'bad',
};

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <Badge tone={ORDER_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>
);

export const DeliveryStatusBadge = ({ status }: { status: DeliveryStatus }) => (
  <Badge tone={ORDER_TONE[status === 'pending' ? 'created' : status]}>{DELIVERY_STATUS_LABEL[status]}</Badge>
);

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <Badge tone={priority === 'high' ? 'bad' : priority === 'low' ? 'neutral' : 'info'}>{PRIORITY_LABEL[priority]}</Badge>
);

/** Confirmacion simple para acciones destructivas. */
export const confirmAction = (message: string) => window.confirm(message);
