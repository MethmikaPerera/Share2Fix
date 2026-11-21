'use client';

import { ArrowLeft, Building2, CheckCircle2, Flag, MapPin, MessageSquare, Pencil, ShieldAlert, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, Trash2, TriangleAlert, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
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
  const canEditClassification = r.viewer.canManage || (r.viewer.isOwner && (r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW'));

  return (
    <div>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm font-medium no-underline hover:underline">
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
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl">{r.title}</h1>
              <p className="mt-1 text-sm text-forest-muted">
                Reported {formatDate(r.createdAt, true)}
                {r.reporter && <> by {r.reporter.name}</>}
              </p>
              <p className="mt-4 whitespace-pre-line text-forest">{r.description}</p>
              {r.imageUrls.length > 0 && <EvidenceGallery urls={r.imageUrls} label="Issue photo" />}
              <p className="mt-4 flex items-start gap-1.5 text-sm text-forest-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-turquoise" aria-hidden />
                {r.location.address || `${r.location.latitude.toFixed(5)}, ${r.location.longitude.toFixed(5)}`}
              </p>
            </div>
            <IssueMap pins={pin} height="260px" />
          </Card>

          {r.behavioralCheck && (
            <Card className="overflow-hidden">
              <CardHeader title="AI & Behavioral Verification" icon={<ShieldCheck className="h-4 w-4 text-turquoise" />} />
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Trust Assessment:</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        r.behavioralCheck.riskLevel === 'LOW'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : r.behavioralCheck.riskLevel === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                      }`}
                    >
                      {r.behavioralCheck.trustScore} / 100 • {r.behavioralCheck.riskLevel} RISK
                    </span>
                  </div>
                  <span className="text-xs text-forest-muted">Checked during report submission</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                  <div className="rounded-lg border border-line bg-mint p-3">
                    <p className="text-xs font-medium text-forest-muted">Multimodal Image Check</p>
                    <p className="mt-1 font-semibold flex items-center gap-1.5 text-xs">
                      {r.behavioralCheck.details.isCivicIssue ? (
                        <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Civic Issue Confirmed
                        </span>
                      ) : (
                        <span className="text-danger flex items-center gap-1">
                          <TriangleAlert className="h-3.5 w-3.5" /> Non-civic image flag
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-forest-muted">
                      {r.behavioralCheck.details.matchesDescription ? 'Matches report description' : 'Description mismatch flagged'}
                    </p>
                  </div>

                  <div className="rounded-lg border border-line bg-mint p-3">
                    <p className="text-xs font-medium text-forest-muted">Behavioral Patterns</p>
                    <p className="mt-1 font-semibold flex items-center gap-1.5 text-xs">
                      {!r.behavioralCheck.details.isDuplicateImage ? (
                        <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Original Photo Verified
                        </span>
                      ) : (
                        <span className="text-danger flex items-center gap-1">
                          <TriangleAlert className="h-3.5 w-3.5" /> Duplicate image detected
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-forest-muted">
                      Velocity: {r.behavioralCheck.details.velocityCountLast5Min} in 5 min • GPS:{' '}
                      {r.behavioralCheck.details.geoSpeedKmH ? `${r.behavioralCheck.details.geoSpeedKmH} km/h` : 'Consistent'}
                    </p>
                  </div>
                </div>

                {r.behavioralCheck.flags.length > 0 && (
                  <div className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-semibold mb-1">Behavioral Warnings / Flags:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {r.behavioralCheck.flags.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {r.status === 'RESOLVED' && r.resolution && <ResolutionCard report={r} onChanged={reloadAll} />}

          {r.status === 'REJECTED' && (
            <Alert tone="error" title="This report was rejected">
              {timeline.data?.filter((e) => e.newStatus === 'REJECTED').pop()?.explanation ?? 'See the timeline for the explanation.'}
            </Alert>
          )}

          <Card>
            <CardHeader title="Timeline" />
            <div className="p-5">
              {timeline.loading && !timeline.data ? <Spinner /> : timeline.error ? <ErrorState message={timeline.error} onRetry={timeline.reload} /> : <Timeline events={timeline.data ?? []} />}
            </div>
          </Card>

          <CommentsCard reportId={r.id} state={comments} canComment={!!profile} onCommentAdded={reloadAll} />
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold tabular-nums">{r.supportCount}</p>
                <p className="text-sm text-forest-muted">{r.supportCount === 1 ? 'citizen supports' : 'citizens support'} this</p>
              </div>
              <SupportButton report={r} onChanged={report.reload} />
            </div>
            <p className="mt-3 flex items-center gap-1 text-sm text-forest-muted">
              <MessageSquare className="h-4 w-4" aria-hidden /> {r.commentCount} comment{r.commentCount === 1 ? '' : 's'}
            </p>
          </Card>

          {profile?.role === 'CITIZEN' && !r.viewer.isOwner && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Community Integrity</p>
                  <p className="text-xs text-forest-muted">
                    {r.flagCount ? `${r.flagCount} user flag${r.flagCount > 1 ? 's' : ''}` : 'No flags submitted'}
                  </p>
                </div>
                {r.viewer.hasFlagged || flagSuccess ? (
                  <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    <Flag className="h-3.5 w-3.5 text-amber-600" /> Flagged by you
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFlagExplanation('');
                      setFlagError(null);
                      setFlaggingOpen(true);
                    }}
                    className="text-xs text-danger hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Flag className="h-3.5 w-3.5" /> Report Post
                  </Button>
                )}
              </div>
              <p className="mt-2 text-[11px] text-forest-muted">
                Notice fake photos, duplicate issues, or already fixed problems? Report to alert moderators.
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
            <CardHeader title="Responsible authority" icon={<Building2 className="h-4 w-4" />} />
            <div className="space-y-2 p-4 text-sm">
              {r.assignedAuthority ? (
                <p className="font-semibold">{r.assignedAuthority.name}</p>
              ) : (
                <p className="font-semibold text-amber-ink">Not assigned yet</p>
              )}
              <p className="text-xs text-forest-muted">{r.routing.note}</p>
              {r.routing.isDemoData && <p className="rounded bg-amber-soft px-2 py-1 text-xs text-amber-ink">Demonstration authority data</p>}
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
              <div>
                <h2 className="text-lg font-bold text-forest">Report Post to Moderators</h2>
                <p className="text-xs text-forest-muted">Help us protect community integrity by flagging fake or problematic posts</p>
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
              <Button form="flag-modal-form" type="submit" variant="danger" loading={flagBusy}>
                Submit Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
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
      <CardHeader title="AI analysis" icon={<Sparkles className="h-4 w-4" />} />
      <div className="space-y-2 p-4 text-sm">
        {ai.status === 'OK' ? (
          <>
            <p>{ai.summary}</p>
            <p className="text-xs text-forest-muted">
              Suggested: {ai.category && labelOf(CATEGORIES, ai.category)} / {ai.priority && labelOf(PRIORITIES, ai.priority)} priority - {Math.round(ai.confidence * 100)}% confidence
            </p>
            {ai.keywords.length > 0 && (
              <ul className="flex flex-wrap gap-1">
                {ai.keywords.map((k) => (
                  <li key={k} className="rounded-full bg-pale px-2 py-0.5 text-xs">
                    {k}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-forest-muted">AI analysis was not available when this report was submitted.</p>
        )}
        <p className="text-xs text-forest-muted">AI output is a recommendation, not an official decision.</p>
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
      <CardHeader title="Correct classification" icon={<Pencil className="h-4 w-4" />} />
      <div className="space-y-3 p-4">
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
          <button type="button" className="text-xs font-semibold text-teal underline" onClick={() => { setCategory(ai.category!); setPriority(ai.priority!); }}>
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
    <Card className="border-teal/40">
      <CardHeader title="Resolution" icon={<CheckCircle2 className="h-4 w-4" />} />
      <div className="space-y-4 p-5">
        <div>
          <p className="text-sm font-semibold">Marked resolved by {res.resolvedBy}</p>
          <p className="text-xs text-forest-muted">{formatDate(res.resolvedAt, true)}</p>
          <p className="mt-2 whitespace-pre-line text-sm">{res.explanation}</p>
          <EvidenceGallery urls={res.evidenceUrls} label="Resolution evidence" />
        </div>

        <div className="rounded-lg bg-mint p-4">
          <p className="text-sm font-semibold">Community verification</p>
          <p className="mt-0.5 text-xs text-forest-muted">
            Independent of the authority&apos;s decision: citizens confirm or dispute that the problem was really fixed.
          </p>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-teal-dark">
              <ThumbsUp className="h-4 w-4" aria-hidden /> {report.verification.confirmed} confirmed
            </span>
            <span className={`flex items-center gap-1 ${report.verification.disputed ? 'text-danger' : 'text-forest-muted'}`}>
              <ThumbsDown className="h-4 w-4" aria-hidden /> {report.verification.disputed} disputed
            </span>
          </div>

          {report.verification.disputed > 0 && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-ink">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden /> Some citizens report that the issue is not fully fixed.
            </p>
          )}

          {profile?.role === 'CITIZEN' && (
            <div className="mt-3 space-y-2">
              {error && <Alert tone="error">{error}</Alert>}
              {mine && (
                <p className="text-xs text-forest-muted">
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
  state,
  canComment,
  onCommentAdded,
}: {
  reportId: string;
  state: { data?: Comment[]; error?: string; loading: boolean; reload: () => void };
  canComment: boolean;
  onCommentAdded?: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/reports/${reportId}/comments`, { text: text.trim() });
      setText('');
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
      <CardHeader title={`Comments${state.data ? ` (${state.data.length})` : ''}`} icon={<MessageSquare className="h-4 w-4" />} />
      <div className="space-y-4 p-5">
        {state.loading && !state.data ? (
          <Spinner />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={state.reload} />
        ) : state.data && state.data.length > 0 ? (
          <ul className="space-y-3">
            {state.data.map((c) => (
              <li key={c.id} className="rounded-lg bg-mint p-3 text-sm">
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-forest-muted">
                  <strong className="text-forest">{c.userName}</strong>
                  {c.userRole !== 'CITIZEN' && <span className="rounded-full bg-teal px-2 py-0.5 font-semibold text-white">{ROLE_LABELS[c.userRole]}</span>}
                  <span>{timeAgo(c.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-line">{c.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-forest-muted">No comments yet. Add details that could help the authority.</p>
        )}

        {canComment ? (
          <form onSubmit={submit} className="space-y-2">
            {error && <Alert tone="error">{error}</Alert>}
            <label htmlFor="comment" className="sr-only">
              Add a comment
            </label>
            <Textarea id="comment" rows={2} maxLength={1000} placeholder="Add a comment..." value={text} onChange={(e) => setText(e.target.value)} />
            <Button type="submit" size="sm" loading={busy} disabled={!text.trim()}>
              Post comment
            </Button>
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
