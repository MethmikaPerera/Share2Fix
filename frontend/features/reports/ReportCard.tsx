import { ImageOff, MapPin, MessageSquare, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badges';
import { CATEGORIES, labelOf } from '@/lib/constants';
import { timeAgo } from '@/lib/format';
import type { Report } from '@/types';

export function ReportCard({ report, href }: { report: Report; href?: string }) {
  const thumb = report.imageUrls[0];
  return (
    <Link
      href={href ?? `/reports/${report.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface text-ink no-underline shadow-card transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:text-ink hover:shadow-float"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-sunken">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={`Photo for ${report.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="texture-dots-light flex h-full items-center justify-center text-line-strong">
            <ImageOff className="h-7 w-7" strokeWidth={1.5} aria-hidden />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <StatusBadge status={report.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow truncate !tracking-[0.12em]">{labelOf(CATEGORIES, report.category)}</p>
          <PriorityBadge priority={report.priority} />
        </div>
        <h3 className="mt-2 line-clamp-2 font-serif text-xl leading-snug transition-colors group-hover:text-brand">{report.title}</h3>
        {report.location.address && (
          <p className="mt-2.5 flex items-start gap-1.5 text-[0.8125rem] text-ink-soft">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
            <span className="line-clamp-1">{report.location.address}</span>
          </p>
        )}
        <div className="flex-1" />
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-xs text-ink-faint">
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5" title="Supporters">
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> {report.supportCount}
            </span>
            <span className="flex items-center gap-1.5" title="Comments">
              <MessageSquare className="h-3.5 w-3.5" aria-hidden /> {report.commentCount}
            </span>
          </span>
          <span>{timeAgo(report.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
