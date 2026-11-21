import { CheckCircle2, Clock, Inbox, TriangleAlert } from 'lucide-react';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { CATEGORIES, PRIORITIES, STATUSES, STATUS_PIN_COLOR } from '@/lib/constants';
import { formatHours, percent } from '@/lib/format';
import type { Stats } from '@/types';

function Bars({ rows, colorFor }: { rows: { key: string; label: string; value: number }[]; colorFor?: (key: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[110px_1fr_36px] items-center gap-3 text-sm">
          <span className="truncate text-forest-muted">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-pale" role="img" aria-label={`${r.label}: ${r.value}`}>
            <span
              className="block h-full rounded-full bg-teal"
              style={{ width: `${(r.value / max) * 100}%`, ...(colorFor ? { background: colorFor(r.key) } : {}) }}
            />
          </span>
          <span className="text-right font-semibold tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function StatsPanel({ stats, extra }: { stats: Stats; extra?: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total reports" value={stats.total} icon={<Inbox className="h-4 w-4" />} />
        <StatCard
          label="Awaiting review"
          value={stats.needsAttention}
          icon={<TriangleAlert className="h-4 w-4" />}
          tone={stats.needsAttention ? 'warn' : 'default'}
          hint="Submitted or under review"
        />
        <StatCard label="Resolution rate" value={percent(stats.resolutionRate)} icon={<CheckCircle2 className="h-4 w-4" />} hint={`${stats.byStatus.RESOLVED} resolved`} />
        <StatCard label="Avg. time to resolve" value={formatHours(stats.avgResolutionHours)} icon={<Clock className="h-4 w-4" />} hint={stats.disputedResolutions ? `${stats.disputedResolutions} resolution(s) disputed` : 'No disputed resolutions'} />
      </div>
      {extra}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="By status" />
          <div className="p-5">
            <Bars
              rows={STATUSES.map((s) => ({ key: s.value, label: s.label, value: stats.byStatus[s.value] ?? 0 }))}
              colorFor={(k) => STATUS_PIN_COLOR[k as keyof typeof STATUS_PIN_COLOR]}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="By category" />
          <div className="p-5">
            <Bars rows={CATEGORIES.map((c) => ({ key: c.value, label: c.label, value: stats.byCategory[c.value] ?? 0 }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="By priority" />
          <div className="p-5">
            <Bars
              rows={PRIORITIES.map((p) => ({ key: p.value, label: p.label, value: stats.byPriority[p.value] ?? 0 }))}
              colorFor={(k) => (k === 'CRITICAL' ? '#B42318' : k === 'HIGH' ? '#F2B84B' : k === 'MEDIUM' ? '#25BDB5' : '#4A6664')}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
