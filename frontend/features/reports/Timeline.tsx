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
  if (events.length === 0) return <p className="text-sm text-ink-faint">No activity yet.</p>;
  return (
    <ol className="relative ml-3.5 space-y-7 border-l border-line-strong pl-8">
      {events.map((e) => {
        const resolved = e.type === 'STATUS_CHANGE' && e.newStatus === 'RESOLVED';
        const rejected = e.type === 'STATUS_CHANGE' && e.newStatus === 'REJECTED';
        return (
          <li key={e.id} className="relative">
            <span
              className={`absolute -left-[2.84rem] flex h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full ring-[5px] ring-surface [&>svg]:h-3.5 [&>svg]:w-3.5 ${
                resolved ? 'bg-brand text-white' : rejected ? 'bg-danger text-white' : 'border border-line-strong bg-surface text-ink-soft'
              }`}
            >
              {iconFor(e)}
            </span>
            <p className="font-serif text-[1.0625rem] leading-snug">{titleFor(e)}</p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {formatDate(e.createdAt, true)} &middot; {e.updatedByName}
              {e.updatedByRole !== 'SYSTEM' && ` (${ROLE_LABELS[e.updatedByRole]})`}
            </p>
            {e.explanation && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{e.explanation}</p>}
            {e.evidenceUrls.length > 0 && <EvidenceGallery urls={e.evidenceUrls} label="Evidence" />}
          </li>
        );
      })}
    </ol>
  );
}
