'use client';

import { Camera, CheckCircle2, Crosshair, ShieldCheck, Sparkles, TriangleAlert, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CategoryBadge, PriorityBadge } from '@/components/ui/Badges';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Feedback';
import { Field, Input, Select, Textarea } from '@/components/ui/Form';
import { LocationPicker } from '@/components/map/LocationPicker';
import { ApiError, api, errorMessage } from '@/lib/api';
import { CATEGORIES } from '@/lib/constants';
import type { AiAnalysis, Category, Report } from '@/types';

const MAX_FILES = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const SL = { minLat: 5.5, maxLat: 10.1, minLng: 79.3, maxLng: 82.1 };

type Coords = { lat: number; lng: number };

export function CreateReportForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const [ai, setAi] = useState<AiAnalysis | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [addrBusy, setAddrBusy] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Report | null>(null);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    const problems: string[] = [];
    for (const f of Array.from(list)) {
      if (!ACCEPTED.includes(f.type)) problems.push(`${f.name}: only JPEG, PNG or WebP images are allowed`);
      else if (f.size > MAX_BYTES) problems.push(`${f.name}: larger than 5 MB`);
      else if (next.length >= MAX_FILES) problems.push(`You can attach up to ${MAX_FILES} photos`);
      else next.push(f);
    }
    setFiles(next);
    setErrors((e) => ({ ...e, photo: problems[0] ?? '' }));
  }

  function useMyLocation() {
    setGpsError(null);
    if (!('geolocation' in navigator)) return setGpsError('Your browser does not support location access. Click the map instead.');
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsBusy(false);
      },
      (err) => {
        setGpsBusy(false);
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Click the map to place the pin instead.'
            : 'Could not get your location. Click the map to place the pin instead.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function lookupAddress() {
    if (!coords) return;
    setAddrBusy(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}`, {
        headers: { Accept: 'application/json' },
      });
      const json = await res.json();
      if (json?.display_name) setAddress(String(json.display_name).slice(0, 300));
    } catch {
      /* optional convenience - ignore failures */
    } finally {
      setAddrBusy(false);
    }
  }

  async function suggestWithAi() {
    if (description.trim().length < 5) return setErrors((e) => ({ ...e, description: 'Describe the issue first so AI can analyse it' }));
    setAiBusy(true);
    setAi(null);
    try {
      const form = new FormData();
      form.set('title', title.trim());
      form.set('description', description.trim());
      if (files[0]) form.append('images', files[0]);
      setAi(await api.postForm<AiAnalysis>('/ai/analyze', form));
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setAiBusy(false);
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (title.trim().length < 5) e.title = 'Give your report a short, clear title (at least 5 characters)';
    if (description.trim().length < 10) e.description = 'Please describe the problem (at least 10 characters)';
    if (!category) e.category = 'Choose a category (use the AI suggestion if unsure)';
    if (files.length === 0) e.photo = 'Add at least one photograph of the issue';
    if (!coords) e.location = 'Choose the location on the map or use your GPS';
    else if (coords.lat < SL.minLat || coords.lat > SL.maxLat || coords.lng < SL.minLng || coords.lng > SL.maxLng)
      e.location = 'The selected location is outside Sri Lanka';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError(null);
    if (!validate() || !coords || !category) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set('title', title.trim());
      form.set('description', description.trim());
      form.set('category', category);
      form.set('latitude', String(coords.lat));
      form.set('longitude', String(coords.lng));
      form.set('address', address.trim());
      files.forEach((f) => form.append('images', f));
      setCreated(await api.postForm<Report>('/reports', form));
    } catch (e) {
      if (e instanceof ApiError && e.details?.length) {
        const map: Record<string, string> = {};
        for (const d of e.details) map[d.field] = d.message;
        setErrors(map);
      }
      setFormError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) return <SubmittedPanel report={created} onAnother={() => window.location.reload()} />;

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.1fr_1fr]" noValidate>
      <div className="space-y-8">
        <Card>
          <CardHeader title="1. What's the problem?" />
          <div className="space-y-5 p-6">
            <Field label="Title" htmlFor="title" required error={errors.title}>
              <Input id="title" maxLength={120} placeholder="e.g. Large pothole near the bus stand" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Description" htmlFor="description" required error={errors.description} hint="What is wrong, how long has it been like this, and who is affected?">
              <Textarea id="description" rows={5} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>

            <div className="rounded-md border border-line bg-paper p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-brass" aria-hidden /> AI suggestion <span className="font-normal text-ink-faint">(optional)</span>
                </p>
                <Button type="button" size="sm" variant="secondary" onClick={suggestWithAi} loading={aiBusy}>
                  Suggest category &amp; priority
                </Button>
              </div>
              {ai?.status === 'OK' && ai.category && ai.priority && (
                <div className="mt-3 space-y-2 text-sm">
                  <p>{ai.summary}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category={ai.category} />
                    <PriorityBadge priority={ai.priority} />
                    <span className="text-xs text-ink-soft">{Math.round(ai.confidence * 100)}% confidence</span>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setCategory(ai.category!)}>
                    Use suggested category
                  </Button>
                  {ai.imageVerification && (
                    <div className="mt-3 border-t border-line pt-3">
                      {ai.imageVerification.flagged ? (
                        <div className="rounded-md border-l-[3px] border-brass bg-brass-tint p-3 text-xs text-brass-ink">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <TriangleAlert className="h-3.5 w-3.5" /> Image verification notice
                          </span>
                          <p className="mt-0.5">
                            {ai.imageVerification.flagReason ||
                              'Uploaded photo may not clearly show a public infrastructure issue matching your description.'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-brand-deep">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Photo verified: genuine civic infrastructure issue (Authenticity: {Math.round(ai.imageVerification.authenticityScore * 100)}%)
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-ink-soft">AI suggestions are recommendations. You and the authority can correct them.</p>
                </div>
              )}
              {ai?.status === 'UNAVAILABLE' && (
                <p className="mt-2 text-sm text-brass-ink">AI suggestions are unavailable right now. Please choose a category yourself - you can still submit.</p>
              )}
            </div>

            <Field label="Category" htmlFor="category" required error={errors.category} hint={category ? CATEGORIES.find((c) => c.value === category)?.hint : undefined}>
              <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                <option value="">Select a category...</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="2. Add photographs" icon={<Camera />} />
          <div className="p-6">
            <label
              htmlFor="photos"
              className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-line-strong bg-paper px-4 py-9 text-center text-sm transition-colors hover:border-brand hover:bg-brand-tint/50"
            >
              <Camera className="mb-1 h-6 w-6 text-ink-faint" strokeWidth={1.5} aria-hidden />
              <span className="font-semibold">Tap to take or choose photos</span>
              <span className="text-xs text-ink-faint">JPEG, PNG or WebP, up to 5 MB each, max {MAX_FILES}</span>
            </label>
            <input
              id="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {errors.photo && (
              <p role="alert" className="mt-2 text-xs font-medium text-danger">
                {errors.photo}
              </p>
            )}
            {previews.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3">
                {previews.map((src, i) => (
                  <li key={src} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Selected photo ${i + 1}`} className="h-24 w-24 rounded-md border border-line object-cover" />
                    <button
                      type="button"
                      onClick={() => setFiles((f) => f.filter((_, idx) => idx !== i))}
                      className="absolute -right-2 -top-2 rounded-full border border-surface bg-ink p-1 text-white transition-colors hover:bg-danger"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader title="3. Where is it?" />
          <div className="space-y-4 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={useMyLocation} loading={gpsBusy} icon={<Crosshair className="h-4 w-4" />}>
                Use my location
              </Button>
              <span className="text-xs text-ink-faint">or click the map to drop a pin (drag to adjust)</span>
            </div>
            {gpsError && <Alert tone="warning">{gpsError}</Alert>}
            <LocationPicker value={coords} onChange={(lat, lng) => setCoords({ lat, lng })} />
            {errors.location && (
              <p role="alert" className="text-xs font-medium text-danger">
                {errors.location}
              </p>
            )}
            {coords && (
              <p className="text-xs tabular-nums text-ink-faint">
                Selected: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
            )}
            <Field label="Address or landmark (optional)" htmlFor="address">
              <div className="flex gap-2">
                <Input id="address" maxLength={300} placeholder="Street, nearby landmark" value={address} onChange={(e) => setAddress(e.target.value)} />
                <Button type="button" variant="secondary" onClick={lookupAddress} disabled={!coords} loading={addrBusy} title="Fill from the map pin using OpenStreetMap">
                  Fill
                </Button>
              </div>
            </Field>
          </div>
        </Card>

        {formError && <Alert tone="error">{formError}</Alert>}
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitting ? 'Submitting and analysing...' : 'Submit report'}
        </Button>
        <p className="text-center text-xs leading-relaxed text-ink-faint">
          Your report will be public (without your name) so neighbours can support it. It is routed to the authority suggested for your location.
        </p>
      </div>
    </form>
  );
}

function SubmittedPanel({ report, onAnother }: { report: Report; onAnother: () => void }) {
  const aiOk = report.aiAnalysis.status === 'OK';
  return (
    <Card className="mx-auto max-w-2xl p-7 sm:p-10">
      <div className="flex items-start gap-4">
        <CheckCircle2 className="mt-1.5 h-6 w-6 shrink-0 text-brand" strokeWidth={1.5} aria-hidden />
        <div>
          <h2 className="text-[2rem]">Report submitted</h2>
          <p className="mt-1 text-ink-soft">Thank you for helping your community. You can follow every update on the report timeline.</p>
        </div>
      </div>

      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="font-semibold">{report.title}</dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            <CategoryBadge category={report.category} />
            <PriorityBadge priority={report.priority} />
          </dd>
        </div>
        <div className="rounded-md border border-line bg-paper p-4">
          <dt className="font-semibold">Suggested authority</dt>
          <dd className="mt-0.5">
            {report.assignedAuthority ? (
              <>
                {report.assignedAuthority.name}
                <span className="mt-1 block text-xs text-ink-soft">{report.routing.note}</span>
              </>
            ) : (
              <span>No authority matched this location yet. An administrator will assign it manually.</span>
            )}
          </dd>
        </div>
        {report.behavioralCheck && (
          <div className="rounded-md border border-line bg-paper p-4 text-sm">
            <dt className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-4 w-4 text-ink-faint" /> Verification &amp; behavioural check
            </dt>
            <dd className="mt-1.5 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-[3px] text-xs font-semibold ${
                  report.behavioralCheck.riskLevel === 'LOW' ? 'border-brand/30 bg-brand-tint text-brand-deep' : 'border-brass/50 bg-brass-tint text-brass-ink'
                }`}
              >
                Trust score: {report.behavioralCheck.trustScore} / 100 • {report.behavioralCheck.riskLevel} RISK
              </span>
              <span className="text-xs text-ink-soft">
                {report.behavioralCheck.details.isCivicIssue ? 'Civic photo confirmed' : 'Non-civic photo flag'} •{' '}
                {report.behavioralCheck.details.isDuplicateImage ? 'Duplicate image flag' : 'Unique image verified'}
              </span>
            </dd>
          </div>
        )}
        {aiOk ? (
          <div>
            <dt className="font-semibold">AI analysis</dt>
            <dd className="mt-0.5 text-ink-soft">
              {report.aiAnalysis.summary}
              {report.aiAnalysis.category && report.aiAnalysis.category !== report.category && (
                <span className="mt-1 block text-brass-ink">
                  AI suggested a different category ({CATEGORIES.find((c) => c.value === report.aiAnalysis.category)?.label}). You can review it on the report page.
                </span>
              )}
            </dd>
          </div>
        ) : (
          <Alert tone="warning" title="AI analysis was unavailable">
            Your report was saved with the category you chose and a default priority. An officer can adjust it.
          </Alert>
        )}
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton href={`/reports/${report.id}`}>View report</LinkButton>
        <Button variant="secondary" onClick={onAnother}>
          Report another issue
        </Button>
        <Link href="/my-reports" className="inline-flex h-10 items-center text-sm font-semibold">
          My reports
        </Link>
      </div>
    </Card>
  );
}
