'use client';

import { ArrowRight, MapPinned, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { LinkButton } from '@/components/ui/Button';
import { homePathFor, useAuth } from '@/features/auth/AuthProvider';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';

const STEPS = [
  {
    title: 'Report',
    text: 'Photograph the problem, pin its location and describe what you see. Gemini AI proposes a category and a priority you can always correct.',
  },
  {
    title: 'Share',
    text: 'Neighbours find your report on the map and add their support, so the issues that affect the most people rise to the top.',
  },
  {
    title: 'Fix',
    text: 'The responsible authority accepts the report, works on it and resolves it with photographic evidence. You confirm the fix.',
  },
];

const PRINCIPLES = [
  {
    icon: Sparkles,
    title: 'AI-assisted triage',
    text: 'Gemini reads the description and the photograph to suggest a category and priority. Citizens and officers can always overrule it.',
  },
  {
    icon: MapPinned,
    title: 'Location-based routing',
    text: 'Each report is matched to the authority whose configured coverage area contains the location, and can be reassigned when needed.',
  },
  {
    icon: ShieldCheck,
    title: 'Accountability built in',
    text: 'Every status change lands on a public timeline. Resolutions require evidence, and citizens can confirm or dispute them.',
  },
];

export default function LandingPage() {
  const { profile } = useAuth();
  const { data: stats } = useAsync(
    (signal) => api.getPublic<{ totalReports: number; resolvedReports: number; inProgressReports: number }>('/stats/public', signal),
    [],
  );

  const ledger = [
    { label: 'Issues reported', value: stats?.totalReports },
    { label: 'Work in progress', value: stats?.inProgressReports },
    { label: 'Resolved', value: stats?.resolvedReports },
  ];

  return (
    <div className="space-y-24 sm:space-y-32">
      {/* Hero */}
      <section className="grid items-end gap-12 pt-2 lg:grid-cols-[1.45fr_1fr] lg:gap-20 lg:pt-8">
        <div>
          <p className="mb-7 flex items-center gap-3">
            <span className="h-px w-10 bg-brass" aria-hidden />
            <span className="eyebrow !text-ink-soft">Civic reporting for Sri Lanka</span>
          </p>
          <h1 className="text-[3.5rem] font-normal leading-[0.98] tracking-[-0.025em] sm:text-[5.25rem]">
            Report. Share.
            <br />
            <span className="italic text-brand">Fix.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
            Share2Fix turns everyday community problems &mdash; potholes, rubbish, blocked drains, broken streetlights &mdash; into trackable
            actions with real accountability.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            {profile ? (
              <LinkButton href={homePathFor(profile.role)} size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                Go to my dashboard
              </LinkButton>
            ) : (
              <>
                <LinkButton href="/register" size="lg">
                  Report an issue
                </LinkButton>
                <LinkButton href="/login" variant="secondary" size="lg">
                  Sign in
                </LinkButton>
              </>
            )}
            <Link href="/map" className="ml-1 inline-flex items-center gap-1.5 px-2 py-3 text-sm font-semibold text-ink no-underline hover:text-brand">
              Browse the issue map <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        <aside className="relative overflow-hidden rounded-card border border-line bg-surface" aria-label="Platform activity">
          <div className="texture-dots-light pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom_left,black,transparent_65%)]" aria-hidden />
          <div className="relative px-7 pb-2 pt-6">
            <p className="eyebrow">Platform activity</p>
            <dl className="mt-4">
              {ledger.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 border-t border-line py-5 first:border-t-0">
                  <dt className="text-sm text-ink-soft">{row.label}</dt>
                  <dd className="font-serif text-[2.75rem] font-normal leading-none tabular-nums text-ink">{row.value ?? '–'}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="relative border-t border-line bg-sunken/60 px-7 py-3 text-xs text-ink-faint">Figures update as authorities act on reports.</p>
        </aside>
      </section>

      {/* Process */}
      <section aria-labelledby="how">
        <div className="mb-12 grid gap-4 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <p className="eyebrow pt-2">The process</p>
          <h2 id="how" className="text-[2rem] leading-[1.12] sm:text-[2.5rem]">
            From a photograph to a <span className="italic text-brand">resolution</span>, in three steps.
          </h2>
        </div>
        <ol className="grid border-t border-ink md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-b border-line py-8 md:border-b-0 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0 md:last:pr-0">
              <span className="font-serif text-lg italic text-brass">0{i + 1}</span>
              <h3 className="mt-6 text-[1.75rem]">{s.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Principles */}
      <section aria-labelledby="why" className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <div>
          <p className="eyebrow">Our approach</p>
          <h2 id="why" className="mt-4 text-[2rem] leading-[1.12] sm:text-[2.5rem]">
            More than a social feed.
          </h2>
          <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-ink-soft">
            Reporting a problem is only the beginning. The platform is designed so that it gets noticed, reaches the right desk and is closed out
            honestly.
          </p>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {PRINCIPLES.map((f) => (
            <li key={f.title} className="flex gap-5 py-7">
              <f.icon className="mt-1 h-5 w-5 shrink-0 text-brand" strokeWidth={1.5} aria-hidden />
              <div>
                <h3 className="text-xl">{f.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Closing call */}
      <section className="texture-dots relative overflow-hidden rounded-card bg-brand-deep px-6 py-16 text-center sm:px-12 sm:py-20">
        <span className="mx-auto mb-8 block h-px w-12 bg-brass" aria-hidden />
        <h2 className="mx-auto max-w-2xl text-[2.25rem] font-normal leading-[1.1] !text-surface sm:text-[3rem]">
          Your street. Your say. <span className="italic text-[#d9b768]">Your fix.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-white/70">
          Join your neighbours and help local authorities see what needs attention first.
        </p>
        <div className="mt-9">
          <LinkButton href={profile ? '/explore' : '/register'} variant="light" size="lg">
            {profile ? 'Explore community issues' : 'Create a free account'}
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
