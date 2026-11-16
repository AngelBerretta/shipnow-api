import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { PRIORITY_LABEL, STATUS_LABEL } from '../lib/deliveries';
import type { DeliveryStatus, Priority } from '../lib/types';

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ---------- Botones (grandes: se usan con una mano y en la calle) ---------- */
type Variant = 'primary' | 'accent' | 'secondary' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-asphalt-900 text-white',
  accent: 'bg-signal text-asphalt-950',
  secondary: 'border border-asphalt-200 bg-white text-asphalt-900',
  danger: 'border border-rose-200 bg-white text-rose-700',
};
const BUTTON =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50';

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={cn(BUTTON, VARIANTS[variant], className)} />;
}

export function ButtonLink({
  variant = 'secondary',
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a target="_blank" rel="noopener noreferrer" {...props} className={cn(BUTTON, VARIANTS[variant], className)} />;
}

/* ---------- Estructura ---------- */
export const Panel = ({ title, children, className }: { title?: string; children: ReactNode; className?: string }) => (
  <section className={cn('rounded-xl border border-asphalt-200 bg-white', className)}>
    {title && <h2 className="border-b border-asphalt-100 px-4 py-2.5 text-sm font-semibold text-asphalt-600">{title}</h2>}
    <div className="p-4">{children}</div>
  </section>
);

const NOTICE_TONES = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  bad: 'border-rose-200 bg-rose-50 text-rose-800',
};

export const Notice = ({ tone = 'info', children }: { tone?: keyof typeof NOTICE_TONES; children: ReactNode }) => (
  <p role="status" className={cn('rounded-lg border px-3 py-2 text-sm', NOTICE_TONES[tone])}>
    {children}
  </p>
);

export const ErrorBanner = ({ message }: { message?: string | null }) =>
  message ? (
    <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
      {message}
    </p>
  ) : null;

export const Loading = ({ label = 'Cargando…' }: { label?: string }) => (
  <p className="py-10 text-center text-sm text-asphalt-600">{label}</p>
);

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="py-10 text-center text-sm text-asphalt-600">{children}</p>
);

/* ---------- Badges ---------- */
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

const STATUS_TONE: Record<DeliveryStatus, keyof typeof TONES> = {
  pending: 'neutral',
  assigned: 'info',
  picked_up: 'info',
  in_transit: 'warn',
  delivered: 'ok',
};

export const StatusBadge = ({ status }: { status: DeliveryStatus }) => (
  <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
);

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <Badge tone={priority === 'high' ? 'bad' : 'neutral'}>{PRIORITY_LABEL[priority]}</Badge>
);

export const UnsyncedBadge = () => <Badge tone="warn">Sin enviar</Badge>;