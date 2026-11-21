'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback';
import { LinkButton } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import { StatsPanel } from '@/features/authority/StatsPanel';
import { ReportCard } from '@/features/reports/ReportCard';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import type { Report, Stats } from '@/types';

export default function AuthorityDashboard() {
  const { profile } = useAuth();
  const authorityId = profile?.authorityId;
  const isOfficer = profile?.role === 'AUTHORITY_OFFICER';

  const stats = useAsync(
    (s) => (isOfficer && !authorityId ? Promise.reject(new Error('NO_AUTHORITY')) : api.get<Stats>('/stats/authority', s)),
    [authorityId],
  );
  const queue = useAsync(
    (s) => (isOfficer && !authorityId ? Promise.resolve({ items: [] as Report[], nextCursor: null }) : api.list<Report>('/reports/managed?status=IN_PROGRESS&limit=6', s)),
    [authorityId],
  );

  if (profile?.role === 'ADMIN') {
    return (
      <>
        <PageHeader title="Authority workspace" description="You are signed in as an administrator. Use the admin dashboard for platform-wide tools." />
        <LinkButton href="/admin">Open admin dashboard</LinkButton>
      </>
    );
  }

  if (isOfficer && !authorityId) {
    return (
      <Alert tone="warning" title="Your account is not linked to an authority yet">
        Ask an administrator to assign you to an authority so reports can be routed to you.
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title={profile?.authority?.name ?? 'Authority dashboard'}
        description="Reports routed to your authority, and how you are doing."
        action={<LinkButton href="/authority/reports">All assigned reports</LinkButton>}
      />
      {profile?.authority?.isDemoData && (
        <div className="mb-4">
          <Alert tone="info">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" aria-hidden /> This authority uses demonstration data.
            </span>
          </Alert>
        </div>
      )}
      <div className="space-y-6">
        {stats.loading ? <Spinner /> : stats.error ? <ErrorState message={stats.error} onRetry={stats.reload} /> : stats.data && <StatsPanel stats={stats.data} />}

        <Card>
          <CardHeader title="Reports in progress" action={<Link href="/authority/reports" className="text-sm font-semibold">See all</Link>} />
          <div className="p-5">
            {queue.loading ? (
              <Spinner />
            ) : queue.error ? (
              <ErrorState message={queue.error} onRetry={queue.reload} />
            ) : (queue.data?.items.length ?? 0) === 0 ? (
              <EmptyState title="Inbox zero" description="No new reports are waiting for review." />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {queue.data!.items.map((r) => (
                  <li key={r.id}>
                    <ReportCard report={r} href={`/authority/reports/${r.id}`} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
