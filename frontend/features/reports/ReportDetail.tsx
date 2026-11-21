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
      <Link href={backHref} className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft no-underline transition-colors hover:text-brand">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {backLabel}
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-10">
        <div className="space-y-8">
          <Card className="overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={r.status} />
                <CategoryBadge category={r.category} />
                <PriorityBadge priority={r.priority} />
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

          <CommentsCard reportId={r.id} state={comments} canComment={!!profile} />
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
      <CardHeader title={`Comments${state.data ? ` (${state.data.length})` : ''}`} icon={<MessageSquare />} />
      <div className="space-y-5 p-6">
        {state.loading && !state.data ? (
          <Spinner />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={state.reload} />
        ) : state.data && state.data.length > 0 ? (
          <ul className="space-y-3">
            {state.data.map((c) => (
              <li key={c.id} className="rounded-md border border-line bg-paper p-4 text-sm">
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-faint">
                  <strong className="text-ink">{c.userName}</strong>
                  {c.userRole !== 'CITIZEN' && <span className="rounded-sm bg-brand px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-white">{ROLE_LABELS[c.userRole]}</span>}
                  <span>{timeAgo(c.createdAt)}</span>
                </p>
                <p className="mt-1.5 whitespace-pre-line leading-relaxed">{c.text}</p>
              </li>
            ))}
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
