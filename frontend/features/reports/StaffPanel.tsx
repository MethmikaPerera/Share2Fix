'use client';

import { ArrowRightLeft, ClipboardCheck, MessageSquarePlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Feedback';
import { Field, Select, Textarea } from '@/components/ui/Form';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAsync } from '@/hooks/useAsync';
import { api, errorMessage } from '@/lib/api';
import { NEXT_STATUSES, STATUSES, labelOf } from '@/lib/constants';
import type { Authority, Report, Status } from '@/types';

/** Officer/admin tools. The API re-checks that the report belongs to the officer's authority. */
export function StaffPanel({ report, onChanged }: { report: Report; onChanged: () => void }) {
  return (
    <div className="space-y-6">
      {report.behavioralCheck && report.behavioralCheck.riskLevel !== 'LOW' && (
        <Alert tone="warning" title={`Behavioral Verification Alert (${report.behavioralCheck.riskLevel} RISK)`}>
          <div className="space-y-1 text-xs">
            <p>
              Trust Score: <strong>{report.behavioralCheck.trustScore} / 100</strong>
            </p>
            {report.behavioralCheck.flags.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {report.behavioralCheck.flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            )}
          </div>
        </Alert>
      )}
      <StatusForm report={report} onChanged={onChanged} />
      {report.status !== 'RESOLVED' && report.status !== 'REJECTED' && <ProgressForm report={report} onChanged={onChanged} />}
      <ReassignForm report={report} onChanged={onChanged} />
    </div>
  );
}

function StatusForm({ report, onChanged }: { report: Report; onChanged: () => void }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const options = isAdmin
    ? STATUSES.map((s) => s.value).filter((s) => s !== report.status)
    : NEXT_STATUSES[report.status];
  const [status, setStatus] = useState<Status | ''>('');
  const [explanation, setExplanation] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const needsExplanation = (status === 'RESOLVED' || status === 'REJECTED' || report.status === 'RESOLVED') && !isAdmin;
  const needsEvidence = status === 'RESOLVED' && !isAdmin;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!status) return setError('Choose the new status');
    if (needsExplanation && explanation.trim().length < 10) return setError('Please add an explanation (at least 10 characters).');
    if (needsEvidence && files.length === 0) return setError('Add at least one photo of the completed work as resolution evidence.');
    setBusy(true);
    try {
      const form = new FormData();
      form.set('status', status);
      const defaultExp =
        status === 'RESOLVED'
          ? 'Issue verified and marked as fixed.'
          : status === 'IN_PROGRESS'
          ? 'Work marked as in progress.'
          : `Status changed to ${labelOf(STATUSES, status)}.`;
      const finalExp = explanation.trim() || defaultExp;
      form.set('explanation', finalExp);
      files.forEach((f) => form.append('images', f));
      await api.postForm(`/reports/${report.id}/status`, form);
      setStatus('');
      setExplanation('');
      setFiles([]);
      setDone(true);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Update status" icon={<ClipboardCheck />} />
      <form onSubmit={submit} className="space-y-4 p-5" noValidate>
        <p className="text-sm text-ink-soft">
          Current status: <strong className="text-ink">{labelOf(STATUSES, report.status)}</strong>
        </p>
        {error && <Alert tone="error">{error}</Alert>}
        {done && <Alert tone="success">Status updated and the citizen was notified.</Alert>}
        <Field label="New status" htmlFor="new-status">
          <Select id="new-status" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            <option value="">Select...</option>
            {options.map((s) => {
              let label = labelOf(STATUSES, s);
              if (s === 'RESOLVED') label = 'Resolved / Fixed';
              else if (s === 'IN_PROGRESS') {
                label = report.status === 'RESOLVED' ? 'Re-open (In progress)' : 'In Progress (Active Work)';
              }
              return (
                <option key={s} value={s}>
                  {label}
                </option>
              );
            })}
          </Select>
        </Field>
        <Field
          label={needsExplanation ? 'Explanation (required)' : 'Explanation (optional)'}
          htmlFor="status-expl"
          hint={status === 'REJECTED' ? 'Tell the citizen why this cannot be handled.' : status === 'RESOLVED' ? 'Describe the work that was done.' : undefined}
        >
          <Textarea id="status-expl" rows={3} maxLength={1000} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </Field>
        {(needsEvidence || status === 'IN_PROGRESS' || status === 'ACCEPTED') && (
          <div>
            <p className="mb-1 text-sm font-medium">
              {needsEvidence ? 'Resolution evidence (required)' : 'Photos (optional)'}
            </p>
            <ImagePicker inputId="status-files" files={files} onChange={setFiles} label="Add evidence photos" />
          </div>
        )}
        <Button type="submit" loading={busy} disabled={!status} className="w-full">
          Save status
        </Button>
      </form>
    </Card>
  );
}

function ProgressForm({ report, onChanged }: { report: Report; onChanged: () => void }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (text.trim().length < 5) return setError('Write a short progress note (at least 5 characters).');
    setBusy(true);
    try {
      const form = new FormData();
      form.set('explanation', text.trim());
      files.forEach((f) => form.append('images', f));
      await api.postForm(`/reports/${report.id}/progress`, form);
      setText('');
      setFiles([]);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Add progress update" icon={<MessageSquarePlus />} />
      <form onSubmit={submit} className="space-y-4 p-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Update" htmlFor="progress-text">
          <Textarea id="progress-text" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <ImagePicker inputId="progress-files" files={files} onChange={setFiles} label="Add photos (optional)" />
        <Button type="submit" variant="secondary" loading={busy} className="w-full">
          Post update
        </Button>
      </form>
    </Card>
  );
}

function ReassignForm({ report, onChanged }: { report: Report; onChanged: () => void }) {
  const { data: authorities } = useAsync((s) => api.get<Authority[]>('/authorities', s), []);
  const [authorityId, setAuthorityId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!authorityId) return setError('Choose the authority to reassign this report to.');
    if (reason.trim().length < 5) return setError('Please give a reason (at least 5 characters).');
    if (!window.confirm('Reassign this report? It will leave your authority\'s queue if you are an officer.')) return;
    setBusy(true);
    try {
      await api.post(`/reports/${report.id}/reassign`, { authorityId, reason: reason.trim() });
      setAuthorityId('');
      setReason('');
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Reassign authority" icon={<ArrowRightLeft />} />
      <form onSubmit={submit} className="space-y-4 p-5" noValidate>
        <p className="text-xs text-ink-soft">
          Routing is a suggestion based on configured coverage areas. If this report belongs elsewhere, reassign it. The change is recorded on the timeline.
        </p>
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Authority" htmlFor="reassign-authority">
          <Select id="reassign-authority" value={authorityId} onChange={(e) => setAuthorityId(e.target.value)}>
            <option value="">Select...</option>
            {(authorities ?? [])
              .filter((a) => a.id !== report.assignedAuthority?.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Reason" htmlFor="reassign-reason">
          <Textarea id="reassign-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button type="submit" variant="secondary" loading={busy} className="w-full">
          Reassign
        </Button>
      </form>
    </Card>
  );
}
