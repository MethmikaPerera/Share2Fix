'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/Card';
import { Select } from '@/components/ui/Form';
import { ReportList } from '@/features/reports/ReportList';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';
import type { Authority } from '@/types';

export default function AdminReportsPage() {
  const [authorityId, setAuthorityId] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const { data: authorities } = useAsync((s) => api.get<Authority[]>('/admin/authorities', s), []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('flagged=true')) {
      setFlaggedOnly(true);
    }
  }, []);

  return (
    <>

      <PageHeader title="All reports" description="Every report on the platform. Open one to reassign it or update its status." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm sm:w-auto flex-1">
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
        <label
          className={`flex cursor-pointer select-none items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
            flaggedOnly
              ? 'border-rose-400 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200 shadow-sm'
              : 'border-line bg-mint text-forest'
          }`}
        >
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="rounded border-rose-400 text-rose-600 focus:ring-rose-500"
          />
          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[10px]">!</span>
            Show Flagged Reports Only
          </span>
        </label>

      </div>
      <ReportList
        endpoint="/reports/managed"
        extraParams={{ authorityId: authorityId || undefined, flagged: flaggedOnly ? 'true' : undefined }}
        showPriority
        emptyTitle="No reports match"
      />
    </>
  );
}
