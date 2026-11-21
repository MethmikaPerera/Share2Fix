'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Form';
import { ReportList } from '@/features/reports/ReportList';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import type { Authority } from '@/types';

export default function AdminReportsPage() {
  const [authorityId, setAuthorityId] = useState('');
  const { data: authorities } = useAsync((s) => api.get<Authority[]>('/admin/authorities', s), []);

  return (
    <>
      <PageHeader title="All reports" description="Every report on the platform. Open one to reassign it or update its status." />
      <div className="mb-4 max-w-sm">
        <Select aria-label="Filter by authority" value={authorityId} onChange={(e) => setAuthorityId(e.target.value)}>
          <option value="">All authorities</option>
          <option value="UNASSIGNED">Unassigned</option>
          {(authorities ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      <ReportList endpoint="/reports/managed" extraParams={{ authorityId: authorityId || undefined }} showPriority emptyTitle="No reports match" />
    </>
  );
}
