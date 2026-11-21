import { AlertTriangle } from 'lucide-react';
import { CATEGORIES, PRIORITIES, PRIORITY_STYLE, STATUSES, STATUS_STYLE, labelOf } from '@/lib/constants';
import type { Category, Priority, Status } from '@/types';

const pill = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset';

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`${pill} ${STATUS_STYLE[status]}`}>{labelOf(STATUSES, status)}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const hazard = priority === 'HIGH' || priority === 'CRITICAL';
  return (
    <span className={`${pill} ${PRIORITY_STYLE[priority]}`}>
      {hazard && <AlertTriangle className="h-3 w-3" aria-hidden />}
      {labelOf(PRIORITIES, priority)} priority
    </span>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return <span className={`${pill} bg-pale text-forest ring-line`}>{labelOf(CATEGORIES, category)}</span>;
}
