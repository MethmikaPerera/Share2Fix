import { ArrowRightLeft, CheckCircle2, CircleDot, Flag, MessageSquareWarning, PenLine, ThumbsUp } from 'lucide-react';
import { STATUSES, labelOf, ROLE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import type { TimelineEvent } from '@/types';
import { EvidenceGallery } from './EvidenceGallery';

function iconFor(e: TimelineEvent) {
  switch (e.type) {
    case 'CREATED':
      return <Flag className="h-4 w-4" aria-hidden />;
    case 'STATUS_CHANGE':
      return e.newStatus === 'RESOLVED' ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <CircleDot className="h-4 w-4" aria-hidden />;
    case 'ASSIGNMENT':
      return <ArrowRightLeft className="h-4 w-4" aria-hidden />;
    case 'CLASSIFICATION':
      return <PenLine className="h-4 w-4" aria-hidden />;
    case 'VERIFICATION':
      return e.explanation.includes('disputed') ? <MessageSquareWarning className="h-4 w-4" aria-hidden /> : <ThumbsUp className="h-4 w-4" aria-hidden />;
    default:
      return <CircleDot className="h-4 w-4" aria-hidden />;
  }
}

function titleFor(e: TimelineEvent): string {
  switch (e.type) {
    case 'CREATED':
      return 'Report submitted';
    case 'STATUS_CHANGE':
      return `Status changed to ${labelOf(STATUSES, e.newStatus!)}`;
    case 'PROGRESS_UPDATE':
      return 'Progress update';
    case 'ASSIGNMENT':
      return 'Authority assignment changed';
    case 'CLASSIFICATION':
      return 'Classification corrected';
    case 'VERIFICATION':
      return 'Community verification';
  }
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-forest-muted">No activity yet.</p>;
  return (
    <ol className="relative space-y-5 border-l-2 border-line pl-6">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span
            className={`absolute -left-[2.1rem] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white ${
              e.newStatus === 'RESOLVED' && e.type === 'STATUS_CHANGE' ? 'bg-teal text-white' : e.newStatus === 'REJECTED' && e.type === 'STATUS_CHANGE' ? 'bg-danger text-white' : 'bg-pale text-teal'
            }`}
          >
            {iconFor(e)}
          </span>
          <p className="text-sm font-semibold">{titleFor(e)}</p>
          <p className="text-xs text-forest-muted">
            {formatDate(e.createdAt, true)} - {e.updatedByName}
            {e.updatedByRole !== 'SYSTEM' && ` (${ROLE_LABELS[e.updatedByRole]})`}
          </p>
          {e.explanation && <p className="mt-1.5 whitespace-pre-line text-sm text-forest">{e.explanation}</p>}
          {e.evidenceUrls.length > 0 && <EvidenceGallery urls={e.evidenceUrls} label="Evidence" />}
        </li>
      ))}
    </ol>
  );
}
