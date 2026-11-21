'use client';

import { Building2, MapPinOff, Users } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { PageHeader, StatCard } from '@/components/ui/Card';
import { ErrorState, Spinner } from '@/components/ui/Feedback';
import { StatsPanel } from '@/features/authority/StatsPanel';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import type { Stats } from '@/types';

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAsync((s) => api.get<Stats>('/admin/stats', s), []);
  return (
    <>
      <PageHeader
        title="Platform overview"
        description="Activity across all authorities."
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/admin/reports" variant="secondary">All reports</LinkButton>
            <LinkButton href="/admin/authorities">Manage authorities</LinkButton>
          </div>
        }
      />
      {loading ? (
        <Spinner />
      ) : error || !data ? (
        <ErrorState message={error ?? 'Could not load statistics'} onRetry={reload} />
      ) : (
        <StatsPanel
          stats={data}
          extra={
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Registered users" value={data.users ?? 0} icon={<Users className="h-4 w-4" />} />
              <StatCard label="Active authorities" value={`${data.activeAuthorities ?? 0} / ${data.authorities ?? 0}`} icon={<Building2 className="h-4 w-4" />} />
              <StatCard
                label="Unassigned reports"
                value={data.unassigned ?? 0}
                icon={<MapPinOff className="h-4 w-4" />}
                tone={data.unassigned ? 'warn' : 'default'}
                hint="No authority matched the location"
              />
            </div>
          }
        />
      )}
    </>
  );
}
