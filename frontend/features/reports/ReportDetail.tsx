'use client';

import { ArrowLeft, Building2, CheckCircle2, MapPin, MessageSquare, Pencil, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
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
import { CATEGORIES, PRIORITIES, ROLE_LABELS, labelOf } from '@/lib/constants';
import { formatDate, timeAgo } from '@/lib/format';
import type { Category, Comment, MapPin as Pin, Priority, Report, TimelineEvent } from '@/types';
import { EvidenceGallery } from './EvidenceGallery';
import { StaffPanel } from './StaffPanel';
import { Timeline } from './Timeline';

export function ReportDetail({ id, backHref, backLabel }: { id: string; backHref: string; backLabel: string }) {
  const { profile } = useAuth();
  const report = useAsync((s) => api.get<Report>(`/reports/${id}`, s), [id, profile?.uid]);
  const timeline = useAsync((s) => api.get<TimelineEvent[]>(`/reports/${id}/timeline`, s), [id]);
  const comments = useAsync((s) => api.get<Comment[]>(`/reports/${id}/comments`, s), [id, profile?.uid]);

  const reloadAll = () => {
    report.reload();
    timeline.reload();
  };

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
          <Card className="overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge status={r.status} />
                <CategoryBadge category={r.category} />
                <PriorityBadge priority={r.priority} />
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

          <CommentsCard reportId={r.id} state={comments} canComment={!!profile} />
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
}: {
  reportId: string;
  state: { data?: Comment[]; error?: string; loading: boolean; reload: () => void };
  canComment: boolean;
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
