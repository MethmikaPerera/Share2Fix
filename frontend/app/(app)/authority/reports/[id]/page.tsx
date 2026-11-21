'use client';

import { useParams } from 'next/navigation';
import { ReportDetail } from '@/features/reports/ReportDetail';

export default function ManageReportPage() {
  const { id } = useParams<{ id: string }>();
  return <ReportDetail id={id} backHref="/authority/reports" backLabel="Assigned reports" />;
}
