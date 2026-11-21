import { Flag, ImageOff, MapPin, MessageSquare, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { CategoryBadge, PriorityBadge, StatusBadge } from '@/components/ui/Badges';
import { timeAgo } from '@/lib/format';
import type { Report } from '@/types';

export function ReportCard({ report, href }: { report: Report; href?: string }) {
  const thumb = report.imageUrls[0];
  return (
    <Link
      href={href ?? `/reports/${report.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-white text-forest no-underline shadow-card transition hover:border-turquoise hover:shadow-md"
    >
      <div className="relative aspect-[16/9] bg-pale">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={`Photo for ${report.title}`} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-turquoise">
            <ImageOff className="h-8 w-8" aria-hidden />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge status={report.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold group-hover:text-teal">{report.title}</h3>
        <div className="flex flex-wrap gap-1.5">
          <CategoryBadge category={report.category} />
          <PriorityBadge priority={report.priority} />
          {report.isFlagged && (
            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              <Flag className="h-2.5 w-2.5" /> Flagged ({report.flagCount ?? 0})
            </span>
          )}
        </div>
        {report.location.address && (
          <p className="flex items-start gap-1 text-xs text-forest-muted">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-turquoise" aria-hidden />
            <span className="line-clamp-1">{report.location.address}</span>
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-forest-muted">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1" title="Supporters">
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> {report.supportCount}
            </span>
            <span className="flex items-center gap-1" title="Comments">
              <MessageSquare className="h-3.5 w-3.5" aria-hidden /> {report.commentCount}
            </span>
          </span>
          <span>{timeAgo(report.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
