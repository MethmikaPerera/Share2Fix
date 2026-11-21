'use client';

import { ArrowLeft, Building2, CheckCircle2, Flag, MapPin, MessageSquare, Pencil, ShieldAlert, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, Trash2, TriangleAlert, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CategoryBadge, PriorityBadge, StatusBadge } from '@/components/ui/Badges';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Alert, ErrorState, Spinner } from '@/components/ui/Feedback';
import { Field, Select, Textarea } from '@/components/ui/Form';
import { IssueMap } from '@/components/map/IssueMap';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAsync } from '@/hooks/useAsync';
import { api, errorMessage } from '@/lib/api';
import { CATEGORIES, FACEBOOK_FLAG_OPTIONS, PRIORITIES, ROLE_LABELS, labelOf } from '@/lib/constants';
import { formatDate, timeAgo } from '@/lib/format';
import type { Category, Comment, FlagReason, MapPin as Pin, Priority, Report, ReportFlag, Status, TimelineEvent } from '@/types';
import { EvidenceGallery } from './EvidenceGallery';
import { StaffPanel } from './StaffPanel';
import { Timeline } from './Timeline';

export function ReportDetail({ id, backHref, backLabel }: { id: string; backHref: string; backLabel: string }) {
  const router = useRouter();
  const { profile } = useAuth();
  const report = useAsync((s) => api.get<Report>(`/reports/${id}`, s), [id, profile?.uid]);
  const timeline = useAsync((s) => api.get<TimelineEvent[]>(`/reports/${id}/timeline`, s), [id]);
  const comments = useAsync((s) => api.get<Comment[]>(`/reports/${id}/comments`, s), [id, profile?.uid]);
  const flags = useAsync(
    (s) => (profile?.role === 'ADMIN' ? api.get<ReportFlag[]>(`/reports/${id}/flags`, s) : Promise.resolve([])),
    [id, profile?.role],
  );

  const [flaggingOpen, setFlaggingOpen] = useState(false);
  const [flagReason, setFlagReason] = useState<FlagReason>('FAKE_OR_STAGED');
  const [flagExplanation, setFlagExplanation] = useState('');
  const [flagBusy, setFlagBusy] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [flagSuccess, setFlagSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('flag=true')) {
      setFlagExplanation('');
      setFlagError(null);
      setFlaggingOpen(true);
    }
  }, []);

  const [removeBusy, setRemoveBusy] = useState(false);
  const [dismissBusy, setDismissBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);

  const reloadAll = () => {
    report.reload();
    timeline.reload();
    comments.reload();
    flags.reload();
  };

  async function submitFlag(e: FormEvent) {
    e.preventDefault();
    if (flagExplanation.trim().length < 5) {
      setFlagError('Please add an explanation (at least 5 characters)');
      return;
    }
    setFlagBusy(true);
    setFlagError(null);
    try {
      await api.post(`/reports/${id}/flag`, { reason: flagReason, explanation: flagExplanation.trim() });
      setFlagSuccess(true);
      setFlaggingOpen(false);
      reloadAll();
    } catch (err) {
      setFlagError(errorMessage(err));
    } finally {
      setFlagBusy(false);
    }
  }

  async function onRemoveReport() {
    if (!window.confirm('Are you sure you want to permanently remove this report? All evidence photos and records will be deleted.')) {
      return;
    }
    setRemoveBusy(true);
    try {
      await api.delete(`/reports/${id}`);
      router.push('/admin/reports');
    } catch (err) {
      alert(errorMessage(err));
      setRemoveBusy(false);
    }
  }

  async function onDismissFlags() {
    setDismissBusy(true);
    try {
      await api.post(`/reports/${id}/dismiss-flags`, {});
      reloadAll();
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setDismissBusy(false);
    }
  }

  async function quickUpdateStatus(newStatus: Status, defaultExplanation: string) {
    setStatusBusy(newStatus);
    try {
      const form = new FormData();
      form.set('status', newStatus);
      form.set('explanation', defaultExplanation);
      await api.postForm(`/reports/${id}/status`, form);
      reloadAll();
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setStatusBusy(null);
    }
  }

  const r = report.data;
  const pin: Pin[] = useMemo(
    () =>
      r
        ? [
            {
              id: r.id,
              title: r.title,
              category: r.category,
              status: r.status,
              priority: r.priority,
              latitude: r.location.latitude,
              longitude: r.location.longitude,
              supportCount: r.supportCount,
              createdAt: r.createdAt,
            },
          ]
        : [],
    [r],
  );

  if (report.loading && !r) return <Spinner label="Loading report..." />;
  if (report.error || !r) return <ErrorState message={report.error ?? 'Report not found'} onRetry={report.reload} />;

  const role = profile?.role;
  const canEditClassification = r.viewer.canManage || (r.viewer.isOwner && (r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW' || r.status === 'IN_PROGRESS'));

  return (
    <div>
      <Link href={backHref} className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft no-underline transition-colors hover:text-brand">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {backLabel}
      </Link>


      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {(r.isFlagged || (r.commentAnalysis && r.commentAnalysis.isDisputedOrFake)) && (
            <Alert tone="warning" title="Community Moderation & Dispute Notice">
              <div className="space-y-1 text-sm">
                <p>
                  This report has been flagged for review ({r.flagCount ?? 0} community flags).
                  {r.commentAnalysis?.isDisputedOrFake && (
                    <span> Comments indicate this issue may be fake, staged, or already resolved.</span>
                  )}
                </p>
                {r.commentAnalysis?.disputeReason && (
                  <p className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
                    <strong>AI Comment Consensus:</strong> {r.commentAnalysis.disputeReason}
                  </p>
                )}
              </div>
            </Alert>
          )}

          <Card className="overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={r.status} />
                  <CategoryBadge category={r.category} />
                  <PriorityBadge priority={r.priority} />
                  {r.location.city && (
                    <span className="inline-flex items-center rounded-md bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      📍 {r.location.city}
                    </span>
                  )}
                  {r.targetCompany && (
                    <span className="inline-flex items-center rounded-md bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                      🏛️ {r.targetCompany}{r.targetBranch ? ` • ${r.targetBranch}` : ''}
                    </span>
                  )}
                  {r.isFlagged && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-rose-600 font-black text-[9px]">!</span>
                      FLAGGED POST ({r.flagCount ?? 1})
                    </span>
                  )}
                </div>

                {/* Red Exclamation Mark Report Button */}
                {!r.viewer.isOwner && (
                  <div>
                    {r.viewer.hasFlagged || flagSuccess ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[10px]">!</span>
                        Reported by you
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!profile) {
                            router.push(`/login?next=/reports/${r.id}`);
                            return;
                          }
                          setFlagExplanation('');
                          setFlagError(null);
                          setFlaggingOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-rose-500 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-100 hover:border-rose-600 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
                        title="Report fake or problematic post"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[10px]">!</span>
                        Report Post
                      </button>
                    )}
                  </div>
                )}
              </div>
              <h1 className="mt-5 text-[2rem] leading-[1.1] sm:text-[2.625rem]">{r.title}</h1>
              <p className="mt-3 text-sm text-ink-faint">
                Reported {formatDate(r.createdAt, true)}
                {r.reporter && <> by {r.reporter.name}</>}
              </p>
              <p className="mt-6 max-w-prose whitespace-pre-line text-base leading-[1.7] text-ink">{r.description}</p>
              {r.imageUrls.length > 0 && <EvidenceGallery urls={r.imageUrls} label="Issue photo" />}
              <p className="mt-6 flex items-start gap-2 border-t border-line pt-5 text-sm text-ink-soft">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                {r.location.address || `${r.location.latitude.toFixed(5)}, ${r.location.longitude.toFixed(5)}`}
              </p>
            </div>
            <div className="border-t border-line">
              <IssueMap pins={pin} height="260px" />
            </div>
          </Card>

          {r.behavioralCheck && <VerificationCard check={r.behavioralCheck} />}

          {r.status === 'RESOLVED' && r.resolution && <ResolutionCard report={r} onChanged={reloadAll} />}

          {r.status === 'REJECTED' && (
            <Alert tone="error" title="This report was rejected">
              {timeline.data?.filter((e) => e.newStatus === 'REJECTED').pop()?.explanation ?? 'See the timeline for the explanation.'}
            </Alert>
          )}

          <Card>
            <CardHeader title="Timeline" />
            <div className="p-6">
              {timeline.loading && !timeline.data ? <Spinner /> : timeline.error ? <ErrorState message={timeline.error} onRetry={timeline.reload} /> : <Timeline events={timeline.data ?? []} />}
            </div>
          </Card>

          <CommentsCard reportId={r.id} reportIsFlagged={Boolean(r.isFlagged)} commentAnalysis={r.commentAnalysis} state={comments} canComment={!!profile} onCommentAdded={reloadAll} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-serif text-[3rem] font-normal leading-none tabular-nums">{r.supportCount}</p>
                <p className="mt-2 text-sm text-ink-soft">{r.supportCount === 1 ? 'citizen supports' : 'citizens support'} this</p>
              </div>
              <SupportButton report={r} onChanged={report.reload} />
            </div>
            <p className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-sm text-ink-soft">
              <MessageSquare className="h-4 w-4 text-ink-faint" aria-hidden /> {r.commentCount} comment{r.commentCount === 1 ? '' : 's'}
            </p>
          </Card>

          {!r.viewer.isOwner && (
            <Card className="p-4 border-rose-200 dark:border-rose-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[10px]">!</span>
                    Community Integrity
                  </p>
                  <p className="text-xs text-forest-muted">
                    {r.flagCount ? `${r.flagCount} user flag${r.flagCount > 1 ? 's' : ''}` : 'No flags submitted'}
                  </p>
                </div>
                {r.viewer.hasFlagged || flagSuccess ? (
                  <span className="flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[9px]">!</span>
                    Flagged by you
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (!profile) {
                        router.push(`/login?next=/reports/${r.id}`);
                        return;
                      }
                      setFlagExplanation('');
                      setFlagError(null);
                      setFlaggingOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
                  >
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-rose-600 font-black text-[9px]">!</span>
                    Report Post
                  </Button>
                )}
              </div>
              <p className="mt-2 text-[11px] text-forest-muted">
                Notice fake photos, duplicate issues, or already fixed problems? Click Report to alert moderators.
              </p>
            </Card>
          )}

          {role === 'ADMIN' && (
            <Card className="border-rose-300 bg-rose-50/40 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
              <CardHeader title="Admin Moderation" icon={<ShieldAlert className="h-4 w-4 text-rose-600" />} />
              <div className="space-y-3 pt-2 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-rose-950 dark:text-rose-200">
                      Status: {r.isFlagged ? 'FLAGGED FOR REVIEW' : 'CLEAN'}
                    </p>
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                      {r.flagCount ?? 0} flags
                    </span>
                  </div>
                  {r.commentAnalysis && (
                    <div className="mt-2 rounded border border-rose-200/80 bg-white/70 p-2 text-xs text-forest dark:border-rose-900/50 dark:bg-stone-900/70">
                      <p className="font-semibold text-rose-900 dark:text-rose-300">
                        AI Comment Sentiment: {r.commentAnalysis.sentiment}
                      </p>
                      {r.commentAnalysis.disputeReason && (
                        <p className="mt-0.5 text-[11px] text-forest-muted">
                          &ldquo;{r.commentAnalysis.disputeReason}&rdquo; ({r.commentAnalysis.fakeClaimCount} fake claims detected)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {flags.data && flags.data.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="font-semibold text-rose-950 dark:text-rose-200">
                      Submitted Flags ({flags.data.length}):
                    </p>
                    <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                      {flags.data.map((fl) => (
                        <div
                          key={fl.flagId}
                          className="rounded border border-rose-200 bg-white/90 p-2 text-[11px] text-forest dark:border-rose-900/50 dark:bg-stone-900/90"
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span>{fl.userName}</span>
                            <span className="text-[10px] text-forest-muted">
                              {fl.createdAt ? timeAgo(fl.createdAt) : ''}
                            </span>
                          </div>
                          <span className="mt-0.5 inline-block rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            {FACEBOOK_FLAG_OPTIONS.find((o) => o.value === fl.reason)?.title || fl.reason}
                          </span>
                          <p className="mt-1 italic text-forest-muted">&ldquo;{fl.explanation}&rdquo;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-rose-200/80 bg-white/80 p-2.5 dark:border-rose-900/40 dark:bg-stone-900/80">
                  <p className="mb-1.5 text-[11px] font-semibold text-rose-950 dark:text-rose-200">
                    Admin Status Controls:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {r.status !== 'IN_PROGRESS' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        loading={statusBusy === 'IN_PROGRESS'}
                        onClick={() => quickUpdateStatus('IN_PROGRESS', 'Admin marked issue as In Progress')}
                        className="px-2.5 py-1 text-[11px]"
                      >
                        Set &ldquo;In Progress&rdquo;
                      </Button>
                    )}
                    {r.status !== 'RESOLVED' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        loading={statusBusy === 'RESOLVED'}
                        onClick={() => quickUpdateStatus('RESOLVED', 'Issue fixed and verified by administrator.')}
                        className="bg-emerald-600 px-2.5 py-1 text-[11px] text-white hover:bg-emerald-700"
                      >
                        Mark as Fixed (Resolved)
                      </Button>
                    )}
                    {r.status === 'RESOLVED' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        loading={statusBusy === 'IN_PROGRESS'}
                        onClick={() => quickUpdateStatus('IN_PROGRESS', 'Admin re-opened report for further work.')}
                        className="px-2.5 py-1 text-[11px]"
                      >
                        Re-open (In progress)
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-rose-200 dark:border-rose-900/40">
                  {r.isFlagged && (
                    <Button type="button" size="sm" variant="secondary" loading={dismissBusy} onClick={onDismissFlags}>
                      Dismiss Flags (Mark Genuine)
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="danger" loading={removeBusy} onClick={onRemoveReport}>
                    <Trash2 className="h-3.5 w-3.5" /> Remove Report (Permanent)
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Responsible authority" icon={<Building2 />} />
            <div className="space-y-2.5 p-5 text-sm">
              {r.assignedAuthority ? (
                <p className="font-serif text-lg leading-snug">{r.assignedAuthority.name}</p>
              ) : (
                <p className="font-semibold text-brass-ink">Not assigned yet</p>
              )}
              <p className="text-[0.8125rem] leading-relaxed text-ink-soft">{r.routing.note}</p>
              {r.routing.isDemoData && <p className="inline-block rounded-sm bg-brass-tint px-2 py-1 text-xs text-brass-ink">Demonstration authority data</p>}
            </div>
          </Card>

          <AiCard report={r} />

          {canEditClassification && <ClassificationCard report={r} onChanged={reloadAll} />}

          {r.viewer.canManage && <StaffPanel report={r} onChanged={reloadAll} />}
          {(role === 'AUTHORITY_OFFICER' || role === 'ADMIN') && !r.viewer.canManage && (
            <Alert tone="info">This report is assigned to another authority, so you can view it but not manage it.</Alert>
          )}
        </aside>
      </div>

      {/* Facebook-style Report Post Modal */}
      {flaggingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-extrabold text-lg shadow-sm">
                  !
                </div>
                <div>
                  <h2 className="text-lg font-bold text-forest">Report Fake / Problematic Post</h2>
                  <p className="text-xs text-forest-muted">Help us protect community integrity. Flagged posts alert admins immediately.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFlaggingOpen(false)}
                className="rounded-lg p-1 text-forest-muted hover:bg-pale hover:text-forest"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-5 py-4">
              {flagError && (
                <div className="mb-4">
                  <Alert tone="error">{flagError}</Alert>
                </div>
              )}

              <form id="flag-modal-form" onSubmit={submitFlag} className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-forest-muted">
                    Please select a reason
                  </p>
                  <div className="space-y-2">
                    {FACEBOOK_FLAG_OPTIONS.map((opt) => {
                      const selected = flagReason === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                            selected
                              ? 'border-danger/80 bg-rose-50/70 dark:bg-rose-950/25'
                              : 'border-line hover:border-turquoise/50 hover:bg-pale/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="flagReason"
                            value={opt.value}
                            checked={selected}
                            onChange={() => setFlagReason(opt.value)}
                            className="mt-1 h-4 w-4 text-danger focus:ring-danger"
                          />
                          <div>
                            <p className="text-sm font-semibold text-forest">{opt.title}</p>
                            <p className="text-xs text-forest-muted">{opt.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <Field
                  label="Additional Explanation"
                  htmlFor="modal-flag-explanation"
                  required
                  error={flagError ?? undefined}
                  hint="Provide context so our AI & admin team can verify (e.g. This road was repaired last week, or this photo is from another area)"
                >
                  <Textarea
                    id="modal-flag-explanation"
                    rows={3}
                    maxLength={500}
                    placeholder="Describe what is wrong or misleading about this post..."
                    value={flagExplanation}
                    onChange={(e) => setFlagExplanation(e.target.value)}
                  />
                </Field>
              </form>
            </div>

            <div className="flex justify-end gap-2 border-t border-line bg-pale/40 px-5 py-3">
              <Button type="button" variant="secondary" onClick={() => setFlaggingOpen(false)}>
                Cancel
              </Button>
              <Button form="flag-modal-form" type="submit" variant="danger" loading={flagBusy} className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-rose-600 font-black text-[10px]">!</span>
                Flag Post for Review
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------- AI & behavioural check
type BehavioralCheck = NonNullable<Report['behavioralCheck']>;

const RISK_STYLE: Record<string, string> = {
  LOW: 'border-brand/30 bg-brand-tint text-brand-deep',
  MEDIUM: 'border-brass/50 bg-brass-tint text-brass-ink',
  HIGH: 'border-danger/40 bg-danger-tint text-danger',
};

function CheckRow({ ok, title, detail, okText, badText }: { ok: boolean; title: string; detail: string; okText: string; badText: string }) {
  return (
    <div className="rounded-md border border-line bg-paper p-4">
      <p className="eyebrow">{title}</p>
      <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${ok ? 'text-brand-deep' : 'text-danger'}`}>
        {ok ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <TriangleAlert className="h-4 w-4" aria-hidden />}
        {ok ? okText : badText}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{detail}</p>
    </div>
  );
}

function VerificationCard({ check }: { check: BehavioralCheck }) {
  const d = check.details;
  return (
    <Card className="overflow-hidden">
      <CardHeader title="AI & behavioural verification" icon={<ShieldCheck />} />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Trust assessment</span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-[3px] text-xs font-semibold tabular-nums ${RISK_STYLE[check.riskLevel] ?? RISK_STYLE.HIGH}`}>
              {check.trustScore} / 100 &middot; {check.riskLevel} risk
            </span>
          </div>
          <span className="text-xs text-ink-faint">Checked during report submission</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CheckRow
            title="Multimodal image check"
            ok={d.isCivicIssue}
            okText="Civic issue confirmed"
            badText="Non-civic image flag"
            detail={d.matchesDescription ? 'Matches report description' : 'Description mismatch flagged'}
          />
          <CheckRow
            title="Behavioural patterns"
            ok={!d.isDuplicateImage}
            okText="Original photo verified"
            badText="Duplicate image detected"
            detail={`Velocity: ${d.velocityCountLast5Min} in 5 min · GPS: ${d.geoSpeedKmH ? `${d.geoSpeedKmH} km/h` : 'consistent'}`}
          />
        </div>

        {check.flags.length > 0 && (
          <div className="rounded-md border-l-[3px] border-brass bg-brass-tint p-4 text-xs text-brass-ink">
            <p className="mb-1.5 font-semibold">Behavioural warnings</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {check.flags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ support
function SupportButton({ report, onChanged }: { report: Report; onChanged: () => void }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) {
    return (
      <Link href={`/login?next=/reports/${report.id}`} className="text-sm font-semibold">
        Sign in to support
      </Link>
    );
  }
  if (profile.role !== 'CITIZEN' || report.viewer.isOwner) return null;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/reports/${report.id}/support`);
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <Button onClick={toggle} loading={busy} variant={report.viewer.hasSupported ? 'primary' : 'secondary'} icon={<ThumbsUp className="h-4 w-4" />} aria-pressed={report.viewer.hasSupported}>
        {report.viewer.hasSupported ? 'Supported' : 'Support'}
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

// -------------------------------------------------------------- AI & classify
function AiCard({ report }: { report: Report }) {
  const ai = report.aiAnalysis;
  return (
    <Card>
      <CardHeader title="AI analysis" icon={<Sparkles />} />
      <div className="space-y-3 p-5 text-sm leading-relaxed">
        {ai.status === 'OK' ? (
          <>
            <p>{ai.summary}</p>
            <p className="text-xs text-ink-soft">
              Suggested: {ai.category && labelOf(CATEGORIES, ai.category)} / {ai.priority && labelOf(PRIORITIES, ai.priority)} priority - {Math.round(ai.confidence * 100)}% confidence
            </p>
            {ai.keywords.length > 0 && (
              <ul className="flex flex-wrap gap-1">
                {ai.keywords.map((k) => (
                  <li key={k} className="rounded-full bg-sunken px-2.5 py-0.5 text-xs text-ink-soft">
                    {k}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-ink-soft">AI analysis was not available when this report was submitted.</p>
        )}
        <p className="border-t border-line pt-3 text-xs text-ink-faint">AI output is a recommendation, not an official decision.</p>
      </div>
    </Card>
  );
}

function ClassificationCard({ report, onChanged }: { report: Report; onChanged: () => void }) {
  const [category, setCategory] = useState<Category>(report.category);
  const [priority, setPriority] = useState<Priority>(report.priority);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = category !== report.category || priority !== report.priority;
  const ai = report.aiAnalysis;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/reports/${report.id}/classification`, { category, priority });
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Correct classification" icon={<Pencil />} />
      <div className="space-y-4 p-5">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Category" htmlFor="cls-category">
          <Select id="cls-category" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority" htmlFor="cls-priority">
          <Select id="cls-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        {ai.status === 'OK' && ai.category && ai.priority && (ai.category !== category || ai.priority !== priority) && (
          <button type="button" className="text-xs font-semibold text-brand underline underline-offset-4" onClick={() => { setCategory(ai.category!); setPriority(ai.priority!); }}>
            Apply AI suggestion
          </button>
        )}
        <Button onClick={save} loading={busy} disabled={!dirty} variant="secondary" className="w-full">
          Save changes
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- resolution
function ResolutionCard({ report, onChanged }: { report: Report; onChanged: () => void }) {
  const { profile } = useAuth();
  const res = report.resolution!;
  const [dispute, setDispute] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify(status: 'CONFIRMED' | 'DISPUTED') {
    setError(null);
    if (status === 'DISPUTED' && explanation.trim().length < 10) return setError('Please explain what is still wrong (at least 10 characters).');
    setBusy(true);
    try {
      await api.post(`/reports/${report.id}/verify`, { status, explanation: explanation.trim() });
      setDispute(false);
      setExplanation('');
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const mine = report.viewer.myVerification;
  return (
    <Card className="overflow-hidden border-brand/40">
      <CardHeader title="Resolution" icon={<CheckCircle2 />} />
      <div className="space-y-5 p-6">
        <div>
          <p className="text-sm font-semibold">Marked resolved by {res.resolvedBy}</p>
          <p className="text-xs text-ink-soft">{formatDate(res.resolvedAt, true)}</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{res.explanation}</p>
          <EvidenceGallery urls={res.evidenceUrls} label="Resolution evidence" />
        </div>

        <div className="rounded-md border border-line bg-paper p-5">
          <p className="font-serif text-lg">Community verification</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Independent of the authority&apos;s decision: citizens confirm or dispute that the problem was really fixed.
          </p>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-brand-deep">
              <ThumbsUp className="h-4 w-4" aria-hidden /> {report.verification.confirmed} confirmed
            </span>
            <span className={`flex items-center gap-1.5 font-medium ${report.verification.disputed ? 'text-danger' : 'text-ink-faint'}`}>
              <ThumbsDown className="h-4 w-4" aria-hidden /> {report.verification.disputed} disputed
            </span>
          </div>

          {report.verification.disputed > 0 && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-brass-ink">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Some citizens report that the issue is not fully fixed.
            </p>
          )}

          {profile?.role === 'CITIZEN' && (
            <div className="mt-3 space-y-2">
              {error && <Alert tone="error">{error}</Alert>}
              {mine && (
                <p className="text-xs text-ink-soft">
                  You {mine === 'CONFIRMED' ? 'confirmed' : 'disputed'} this resolution. You can change your answer.
                </p>
              )}
              {dispute ? (
                <div className="space-y-2">
                  <Field label="What is still wrong?" htmlFor="dispute-text" required>
                    <Textarea id="dispute-text" rows={3} maxLength={500} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
                  </Field>
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" loading={busy} onClick={() => verify('DISPUTED')}>
                      Submit dispute
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDispute(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" loading={busy} disabled={mine === 'CONFIRMED'} onClick={() => verify('CONFIRMED')} icon={<ThumbsUp className="h-4 w-4" />}>
                    It&apos;s fixed
                  </Button>
                  <Button size="sm" variant="secondary" disabled={mine === 'DISPUTED'} onClick={() => setDispute(true)} icon={<ThumbsDown className="h-4 w-4" />}>
                    Not fixed
                  </Button>
                </div>
              )}
            </div>
          )}
          {!profile && (
            <p className="mt-3 text-xs">
              <Link href={`/login?next=/reports/${report.id}`}>Sign in</Link> to verify this resolution.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ comments
function CommentsCard({
  reportId,
  reportIsFlagged,
  commentAnalysis,
  state,
  canComment,
  onCommentAdded,
}: {
  reportId: string;
  reportIsFlagged?: boolean;
  commentAnalysis?: Report['commentAnalysis'];
  state: { data?: Comment[]; error?: string; loading: boolean; reload: () => void };
  canComment: boolean;
  onCommentAdded?: () => void;
}) {
  const [text, setText] = useState('');
  const [flagAsFake, setFlagAsFake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const DISPUTE_KEYWORDS = [
    'fake', 'scam', 'fraud', 'staged', 'fabricated', 'not real', 'not true',
    'already fixed', 'already resolved', 'already repaired', 'fixed months ago', 'fixed already',
    'wrong location', 'wrong place', 'not here', 'does not exist', "doesn't exist", 'no issue here',
    'ai generated', 'photoshop', 'photoshopped', 'old photo', 'old picture', 'not recent',
    'from the internet', 'google image', 'copied', 'duplicate', 'hoax', 'bogus', 'lie', 'lying',
  ];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/reports/${reportId}/comments`, {
        text: text.trim(),
        flagAsFake,
        flagReason: 'FAKE_OR_STAGED',
      });
      setText('');
      setFlagAsFake(false);
      state.reload();
      onCommentAdded?.();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title={`Comments${state.data ? ` (${state.data.length})` : ''}`} icon={<MessageSquare />} />
      <div className="space-y-5 p-6">
        {(reportIsFlagged || commentAnalysis?.isDisputedOrFake) && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-black text-xs">!</span>
              <div>
                <p className="font-bold">Community Moderation &amp; Dispute Notice</p>
                <p className="mt-0.5 text-rose-800 dark:text-rose-300">
                  {commentAnalysis?.disputeReason
                    ? `Comments have flagged this issue: "${commentAnalysis.disputeReason}"`
                    : 'Community feedback or reports indicate this post may be fake, staged, or invalid. This report has been flagged for administrator review.'}
                </p>
              </div>
            </div>
          </div>
        )}
        {state.loading && !state.data ? (
          <Spinner />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={state.reload} />
        ) : state.data && state.data.length > 0 ? (
          <ul className="space-y-3">
            {state.data.map((c) => {
              const isDispute = DISPUTE_KEYWORDS.some((kw) => c.text.toLowerCase().includes(kw));
              return (
                <li
                  key={c.id}
                  className={`rounded-md p-4 text-sm ${
                    isDispute
                      ? 'border border-rose-300 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/30'
                      : 'border border-line bg-paper'
                  }`}
                >
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-faint">
                    <strong className="text-ink">{c.userName}</strong>
                    {c.userRole !== 'CITIZEN' && (
                      <span className="rounded-sm bg-brand px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-white">
                        {ROLE_LABELS[c.userRole]}
                      </span>
                    )}
                    {isDispute && (
                      <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        <span className="flex h-3 w-3 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[8px]">!</span>
                        Dispute / Fake claim
                      </span>
                    )}
                    <span>{timeAgo(c.createdAt)}</span>
                  </p>
                  <p className="mt-1.5 whitespace-pre-line leading-relaxed text-ink">{c.text}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-faint">No comments yet. Add details that could help the authority.</p>
        )}

        {canComment ? (
          <form onSubmit={submit} className="space-y-2">
            {error && <Alert tone="error">{error}</Alert>}
            <label htmlFor="comment" className="sr-only">
              Add a comment
            </label>
            <Textarea
              id="comment"
              rows={2}
              maxLength={1000}
              placeholder="Add a comment or community update..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-800">
                <input
                  type="checkbox"
                  checked={flagAsFake}
                  onChange={(e) => setFlagAsFake(e.target.checked)}
                  className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="flex items-center gap-1">
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-white font-black text-[9px]">!</span>
                  Flag this report as fake / invalid
                </span>
              </label>
              <Button type="submit" size="sm" loading={busy} disabled={!text.trim()}>
                Post comment
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm">
            <Link href={`/login?next=/reports/${reportId}`}>Sign in</Link> to comment.
          </p>
        )}
      </div>
    </Card>
  );
}
