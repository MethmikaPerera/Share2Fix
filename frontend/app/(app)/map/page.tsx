'use client';

import { Crosshair, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { StatusBadge } from '@/components/ui/Badges';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { IssueMap } from '@/components/map/IssueMap';
import { useAsync } from '@/hooks/useAsync';
import { api, qs } from '@/lib/api';
import { CATEGORIES, STATUSES, STATUS_PIN_COLOR, labelOf } from '@/lib/constants';
import type { Category, MapPin, Status } from '@/types';

const toRad = (d: number) => (d * Math.PI) / 180;
function distanceKm(a: { lat: number; lng: number }, b: { latitude: number; longitude: number }) {
  const dLat = toRad(b.latitude - a.lat);
  const dLng = toRad(b.longitude - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export default function MapPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(5);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);

  const query = qs({ status, category, lat: me?.lat, lng: me?.lng, radiusKm: me ? radius : undefined });
  const { data, loading, error, reload } = useAsync((s) => api.getPublic<MapPin[]>(`/reports/map${query}`, s), [query]);

  const nearest = useMemo(() => {
    if (!me || !data) return [];
    return data
      .map((p) => ({ p, d: distanceKm(me, p) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 8);
  }, [me, data]);

  function locate() {
    setGeoError(null);
    if (!('geolocation' in navigator)) return setGeoError('Your browser does not support location access.');
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoBusy(false);
      },
      () => {
        setGeoError('Could not get your location. Allow location access to discover nearby issues.');
        setGeoBusy(false);
      },
      { timeout: 15000 },
    );
  }

  return (
    <>
      <PageHeader eyebrow="Community" title="Issue map" description="Every pin is a community report. Click a pin for details. No personal information is shown on this map." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Select aria-label="Filter by status" className="!w-auto" value={status} onChange={(e) => setStatus(e.target.value as Status | '')}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by category" className="!w-auto" value={category} onChange={(e) => setCategory(e.target.value as Category | '')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        {me ? (
          <>
            <Select aria-label="Search radius" className="!w-auto" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              {[1, 2, 5, 10, 25, 50].map((r) => (
                <option key={r} value={r}>
                  Within {r} km
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" icon={<X className="h-4 w-4" />} onClick={() => setMe(null)}>
              Clear location
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={locate} loading={geoBusy} icon={<Crosshair className="h-4 w-4" />}>
            Issues near me
          </Button>
        )}
        <span className="ml-auto text-sm tabular-nums text-ink-soft">{data ? `${data.length} issue${data.length === 1 ? '' : 's'}` : ''}</span>
      </div>
      {geoError && (
        <div className="mb-5">
          <Alert tone="warning">{geoError}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="relative">
          <IssueMap pins={data ?? []} userLocation={me} onSelect={(id) => router.push(`/reports/${id}`)} height="68vh" fit={!me} />
          {loading && (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center">
              <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-soft shadow-float">Updating map...</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="eyebrow mb-4 !font-sans">Legend</h2>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-[0.8125rem] text-ink-soft">
              {STATUSES.map((s) => (
                <li key={s.value} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_PIN_COLOR[s.value] }} aria-hidden />
                  {s.label}
                </li>
              ))}
            </ul>
          </Card>

          {me && (
            <Card className="p-5">
              <h2 className="eyebrow mb-3 !font-sans">Nearest issues</h2>
              {loading && !data ? (
                <Spinner />
              ) : nearest.length === 0 ? (
                <p className="text-sm text-ink-soft">No issues within {radius} km.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {nearest.map(({ p, d }) => (
                    <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                      <Link href={`/reports/${p.id}`} className="block font-serif text-base leading-snug text-ink no-underline hover:text-brand">
                        {p.title}
                      </Link>
                      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                        {d.toFixed(1)} km - {labelOf(CATEGORIES, p.category)}
                        <StatusBadge status={p.status} />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
          {error && <ErrorState message={error} onRetry={reload} />}
          {!loading && !error && data?.length === 0 && !me && <EmptyState title="No issues match" description="Try clearing the filters." />}
        </div>
      </div>
    </>
  );
}
