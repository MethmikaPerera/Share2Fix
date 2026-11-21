'use client';

import { PageHeader } from '@/components/ui/Card';
import { CreateReportForm } from '@/features/reports/CreateReportForm';

export default function NewReportPage() {
  return (
    <>
      <PageHeader title="Report an issue" description="Tell us what is wrong and where. It takes about two minutes." />
      <CreateReportForm />
    </>
  );
}
