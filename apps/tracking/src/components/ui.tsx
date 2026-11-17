import type { ReactNode } from 'react';

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

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