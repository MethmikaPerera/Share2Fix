'use client';

import { PageHeader } from '@/components/ui/Card';
import { ReportList } from '@/features/reports/ReportList';

export default function ExplorePage() {
  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Explore community issues"
        description="Browse what your neighbours have reported. Support reports that matter to you so authorities see what needs attention first."
      />
      <ReportList endpoint="/reports" showPriority emptyTitle="No issues reported yet" emptyDescription="Be the first to report a problem in your community." />
    </>
  );
}
