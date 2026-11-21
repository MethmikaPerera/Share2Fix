'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthProvider';
import { ReportDetail } from '@/features/reports/ReportDetail';

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const back = profile?.role === 'AUTHORITY_OFFICER' ? ['/authority/reports', 'Assigned reports'] : profile?.role === 'ADMIN' ? ['/admin/reports', 'All reports'] : profile ? ['/my-reports', 'My reports'] : ['/explore', 'Explore issues'];
  return <ReportDetail id={id} backHref={back[0]!} backLabel={back[1]!} />;
}
