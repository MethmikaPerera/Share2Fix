'use client';

import { CheckCircle2, ClipboardList, Hourglass, ShieldQuestion } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LinkButton } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader, StatCard, StatGrid } from '@/components/ui/Card';
import { Alert, EmptyState, ErrorState, Spinner } from '@/components/ui/Feedback';
import { homePathFor, useAuth } from '@/features/auth/AuthProvider';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { ReportCard } from '@/features/reports/ReportCard';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import type { Report } from '@/types';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <RequireAuth>
      <RoleSwitch />
    </RequireAuth>
  );
}

function RoleSwitch() {
  const { profile } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (profile && profile.role !== 'CITIZEN') router.replace(homePathFor(profile.role));
  }, [profile, router]);
  if (!profile || profile.role !== 'CITIZEN') return <Spinner />;
  return <CitizenDashboard name={profile.fullName} />;
}

function CitizenDashboard({ name }: { name: string }) {
  const { data, loading, error, reload } = useAsync((s) => api.list<Report>('/reports/mine?limit=50', s), []);
  const items = data?.items ?? [];

  const open = items.filter((r) => !['RESOLVED', 'REJECTED'].includes(r.status)).length;
  const resolved = items.filter((r) => r.status === 'RESOLVED').length;
  const toVerify = items.filter((r) => r.status === 'RESOLVED' && !r.viewer.myVerification);

  return (
    <>
      <PageHeader
        eyebrow="Citizen dashboard"
        title={`Hello, ${name.split(' ')[0]}`}
        description="Here's what's happening with the issues you've reported."
        action={<LinkButton href="/report/new">Report an issue</LinkButton>}
      />

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <div className="space-y-8">
          <StatGrid>
            <StatCard label="Reports submitted" value={items.length} icon={<ClipboardList />} />
            <StatCard label="Open" value={open} icon={<Hourglass />} />
            <StatCard label="Resolved" value={resolved} icon={<CheckCircle2 />} />
            <StatCard label="Awaiting your verification" value={toVerify.length} icon={<ShieldQuestion />} tone={toVerify.length ? 'warn' : 'default'} />
          </StatGrid>

          {toVerify.length > 0 && (
            <Alert tone="warning" title="Please verify these fixes">
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                {toVerify.map((r) => (
                  <li key={r.id}>
                    <Link href={`/reports/${r.id}`}>{r.title}</Link> was marked resolved. Is it really fixed?
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          <Card>
            <CardHeader title="Recent reports" action={<Link href="/my-reports" className="text-sm font-semibold no-underline hover:underline">View all &rarr;</Link>} />
            <div className="p-6">
              {items.length === 0 ? (
                <EmptyState
                  title="No reports yet"
                  description="When you report an issue it appears here with live status updates."
                  action={<LinkButton href="/report/new">Report your first issue</LinkButton>}
                />
              ) : (
                <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {items.slice(0, 6).map((r) => (
                    <li key={r.id}>
                      <ReportCard report={r} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
