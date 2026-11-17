import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { AppNotification, NotificationList } from '../lib/types';
import { Button, cn } from './ui';

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Un request liviano cada 30 s (Atlas M0 aguanta ~100 ops/s). Las acciones del panel lo refrescan solas.
  const count = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => api<{ unreadCount: number }>('/api/notifications/unread-count'),
    refetchInterval: 30_000,
  });
  const list = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api<NotificationList>('/api/notifications', { query: { limit: 15 } }),
    enabled: open,
  });
  const markRead = useMutation({
    mutationFn: (body: { ids?: string[]; all?: boolean }) => api('/api/notifications/read', { method: 'POST', body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = count.data?.unreadCount ?? 0;

  const openItem = (item: AppNotification) => {
    if (!item.readAt) markRead.mutate({ ids: [item._id] });
    setOpen(false);
    if (item.data?.path) navigate(item.data.path);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-md p-2 text-asphalt-600 hover:bg-asphalt-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-signal px-1 text-center text-[10px] font-semibold leading-4 text-asphalt-950">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 rounded-md border border-asphalt-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-asphalt-100 px-4 py-2.5">
              <h2 className="text-sm font-semibold">Notificaciones</h2>
              <Button variant="ghost" className="px-2 py-1 text-xs" disabled={unread === 0} onClick={() => markRead.mutate({ all: true })}>
                Marcar todas como leídas
              </Button>
            </div>
            <ul className="max-h-96 divide-y divide-asphalt-100 overflow-y-auto">
              {list.isLoading && <li className="px-4 py-6 text-center text-sm text-asphalt-600">Cargando…</li>}
              {list.data?.data.length === 0 && <li className="px-4 py-6 text-center text-sm text-asphalt-600">No hay notificaciones.</li>}
              {list.data?.data.map((item) => (
                <li key={item._id}>
                  <button type="button" onClick={() => openItem(item)} className={cn('block w-full px-4 py-3 text-left text-sm hover:bg-asphalt-50', !item.readAt && 'bg-asphalt-50')}>
                    <span className="flex items-start gap-2">
                      <span aria-hidden className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', item.readAt ? 'bg-transparent' : 'bg-signal')} />
                      <span className="min-w-0">
                        <span className="block font-medium">{item.title}</span>
                        <span className="block whitespace-pre-line text-asphalt-600">{item.body}</span>
                        <span className="block text-xs text-asphalt-400">{formatDateTime(item.createdAt)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}