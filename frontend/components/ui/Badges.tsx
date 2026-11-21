import { AlertTriangle } from 'lucide-react';
import { CATEGORIES, PRIORITIES, PRIORITY_STYLE, STATUSES, STATUS_PIN_COLOR, labelOf } from '@/lib/constants';
import type { Category, Priority, Status } from '@/types';

const chip = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-xs font-medium leading-none whitespace-nowrap';

/** Status = coloured dot + label on a quiet white chip, so it reads on photos and paper alike. */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`${chip} border-line bg-surface text-ink`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_PIN_COLOR[status] }} aria-hidden />
      {labelOf(STATUSES, status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const hazard = priority === 'HIGH' || priority === 'CRITICAL';
  return (
    <span className={`${chip} ${PRIORITY_STYLE[priority]}`}>
      {hazard && <AlertTriangle className="h-3 w-3" aria-hidden />}
      {labelOf(PRIORITIES, priority)} priority
    </span>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return <span className={`${chip} border-transparent bg-sunken text-ink-soft`}>{labelOf(CATEGORIES, category)}</span>;
}
