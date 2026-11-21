'use client';

import { LinkButton } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Card';
import { ReportList } from '@/features/reports/ReportList';

export default function MyReportsPage() {
  return (
    <>
      <PageHeader eyebrow="Citizen" title="My reports" description="Track the progress of everything you have reported." action={<LinkButton href="/report/new">New report</LinkButton>} />
      <ReportList
        endpoint="/reports/mine"
        showCategory={false}
        emptyTitle="You haven't reported anything yet"
        emptyDescription="Spotted a problem? Report it and follow the fix."
        emptyAction={<LinkButton href="/report/new">Report an issue</LinkButton>}
      />
    </>
  );
}
