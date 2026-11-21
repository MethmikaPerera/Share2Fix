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
        className="relative rounded-md p-2 text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-paper">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-line bg-surface text-ink shadow-float">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-serif text-base">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-semibold text-brand hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-faint">You&apos;re all caught up.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/reports/${n.reportId}`}
                  onClick={() => openItem(n)}
                  className={`relative block px-4 py-3 text-sm leading-snug no-underline transition-colors hover:bg-sunken ${n.read ? 'text-ink-soft' : 'font-medium text-ink'}`}
                >
                  {!n.read && <span className="absolute left-1.5 top-[1.15rem] h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />}
                  {n.message}
                  <span className="mt-1 block text-xs font-normal text-ink-faint">{timeAgo(n.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
