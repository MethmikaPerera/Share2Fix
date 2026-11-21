'use client';

import { PageHeader } from '@/components/ui/Card';
import { ReportList } from '@/features/reports/ReportList';

export default function AssignedReportsPage() {
  return (
    <>
      <PageHeader title="Assigned reports" description="Filter by status, category and priority, then open a report to update its status or add evidence." />
      <ReportList
        endpoint="/reports/managed"
        showPriority
        hrefFor={(r) => `/authority/reports/${r.id}`}
        emptyTitle="No reports match"
        emptyDescription="Nothing is assigned to your authority with these filters."
      />
    </>
  );
}
