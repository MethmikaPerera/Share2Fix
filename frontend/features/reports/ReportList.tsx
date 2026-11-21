'use client';

import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Form';
import { api, errorMessage, qs } from '@/lib/api';
import { CATEGORIES, PRIORITIES, SRI_LANKA_CITIES, STATUSES } from '@/lib/constants';
import type { Category, Priority, Report, Status } from '@/types';
import { ReportCard } from './ReportCard';

interface Props {
  /** '/reports' (public), '/reports/mine' or '/reports/managed' */
  endpoint: string;
  /** Extra fixed query params (e.g. authorityId for admins). */
  extraParams?: Record<string, string | undefined>;
  showCategory?: boolean;
  showPriority?: boolean;
  hrefFor?: (r: Report) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  pageSize?: number;
}

/** Filterable, cursor-paginated report grid. Filters are applied server-side; search runs over loaded items. */
export function ReportList({
  endpoint,
  extraParams,
  showCategory = true,
  showPriority = false,
  hrefFor,
  emptyTitle = 'No reports found',
  emptyDescription = 'Try changing your filters.',
  emptyAction,
  pageSize = 12,
}: Props) {
  const [status, setStatus] = useState<Status | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [city, setCity] = useState('');
  const [search, setSearch] = useState('');

  const [items, setItems] = useState<Report[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extraKey = JSON.stringify(extraParams ?? {});

  const buildQuery = useCallback(
    (after?: string | null) =>
      qs({
        ...(JSON.parse(extraKey) as Record<string, string | undefined>),
        status,
        category: showCategory ? category : undefined,
        priority: showPriority ? priority : undefined,
        city: city || undefined,
        limit: pageSize,
        cursor: after ?? undefined,
      }),
    [extraKey, status, category, priority, city, showCategory, showPriority, pageSize],
  );

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.list<Report>(`${endpoint}${buildQuery()}`);
      setItems(res.items);
      setCursor(res.nextCursor);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [endpoint, buildQuery]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const res = await api.list<Report>(`${endpoint}${buildQuery(cursor)}`);
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => `${r.title} ${r.description} ${r.location.address} ${r.location.city ?? ''} ${r.targetCompany ?? ''}`.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div>
      <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <Input
            aria-label="Search loaded reports"
            placeholder="Search title, description or place"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as Status | '')}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by location (city)" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {SRI_LANKA_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {showCategory && (
          <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value as Category | '')}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
        {showPriority && (
          <Select aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority | '')}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        )}
      </div>

      {loading ? (
        <Spinner label="Loading reports..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadFirst} />
      ) : visible.length === 0 ? (
        <EmptyState title={emptyTitle} description={search ? 'No loaded reports match your search.' : emptyDescription} action={emptyAction} />
      ) : (
        <>
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((r) => (
              <li key={r.id}>
                <ReportCard report={r} href={hrefFor?.(r)} />
              </li>
            ))}
          </ul>
          {cursor && (
            <div className="mt-10 text-center">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
