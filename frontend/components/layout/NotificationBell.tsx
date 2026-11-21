'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import type { AppNotification } from '@/types';

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items: AppNotification[]; unread: number }>('/notifications');
      setItems(res.items);
      setUnread(res.unread);
    } catch {
      /* the bell is non-critical; stay quiet on failure */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAll() {
    await api.post('/notifications/read-all').catch(() => undefined);
    void load();
  }

  async function openItem(n: AppNotification) {
    setOpen(false);
    if (!n.read) await api.post(`/notifications/${n.id}/read`).catch(() => undefined);
    void load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-white hover:bg-white/10"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-forest">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-line bg-white text-forest shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-semibold text-teal hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-forest-muted">You&apos;re all caught up.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/reports/${n.reportId}`}
                  onClick={() => openItem(n)}
                  className={`block px-4 py-3 text-sm no-underline hover:bg-pale ${n.read ? 'text-forest-muted' : 'bg-mint font-medium text-forest'}`}
                >
                  {n.message}
                  <span className="mt-0.5 block text-xs font-normal text-forest-muted">{timeAgo(n.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
