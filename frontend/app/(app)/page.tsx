'use client';

import { Camera, CheckCircle2, MapPinned, ShieldCheck, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';
import { LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { homePathFor, useAuth } from '@/features/auth/AuthProvider';
import { useAsync } from '@/hooks/useAsync';
import { api } from '@/lib/api';

const STEPS = [
  { icon: Camera, title: 'Report', text: 'Snap a photo, pin the location and describe the problem. Gemini AI suggests a category and priority.' },
  { icon: Users, title: 'Share', text: 'Neighbours discover your report on the map and support it, so urgent problems rise to the top.' },
  { icon: CheckCircle2, title: 'Fix', text: 'The responsible authority accepts, works on and resolves it with photo evidence. You verify the fix.' },
];

const FEATURES = [
  { icon: Sparkles, title: 'AI-assisted triage', text: 'Gemini reads the description and photo to suggest a category and priority. Always correctable by you or an officer.' },
  { icon: MapPinned, title: 'Location-based routing', text: 'Reports are matched to the authority whose configured area covers the location, and can be reassigned.' },
  { icon: ShieldCheck, title: 'Accountability built in', text: 'Every status change is on a public timeline. Resolutions need evidence, and citizens can confirm or dispute them.' },
];

export default function LandingPage() {
  const { profile } = useAuth();
  const { data: stats } = useAsync(
    (signal) => api.getPublic<{ totalReports: number; resolvedReports: number; inProgressReports: number }>('/stats/public', signal),
    [],
  );

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 rounded-card bg-pale px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal ring-1 ring-line">
            Built for Sri Lankan communities
          </p>
          <h1 className="text-4xl leading-tight sm:text-5xl">
            Report. Share. <span className="text-teal">Fix.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-forest-muted">
            Share2Fix turns everyday community problems - potholes, garbage, blocked drains, broken streetlights - into trackable
            actions with real accountability.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {profile ? (
              <LinkButton href={homePathFor(profile.role)} size="lg">
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
            <LinkButton href="/map" variant="ghost" size="lg" icon={<MapPinned className="h-5 w-5" />}>
              Browse the issue map
            </LinkButton>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {[
            { label: 'Issues reported', value: stats?.totalReports },
            { label: 'In progress', value: stats?.inProgressReports },
            { label: 'Resolved', value: stats?.resolvedReports },
          ].map((s) => (
            <Card key={s.label} className="p-4 text-center lg:text-left">
              <p className="text-3xl font-bold tabular-nums text-forest">{s.value ?? '-'}</p>
              <p className="text-sm text-forest-muted">{s.label}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="mb-6 text-2xl">
          How it works
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full p-6">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-pale text-teal">
                  <s.icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="text-lg">
                  {i + 1}. {s.title}
                </h3>
                <p className="mt-1 text-sm text-forest-muted">{s.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="why">
        <h2 id="why" className="mb-6 text-2xl">
          More than a social feed
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3">
              <f.icon className="mt-1 h-5 w-5 shrink-0 text-turquoise" aria-hidden />
              <div>
                <h3 className="text-base">{f.title}</h3>
                <p className="mt-1 text-sm text-forest-muted">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-card bg-teal px-6 py-8 text-center text-white sm:px-10">
        <h2 className="!text-white text-2xl">Your street. Your say. Your fix.</h2>
        <p className="mx-auto mt-2 max-w-xl text-white/85">Join your neighbours and help local authorities see what needs attention first.</p>
        <div className="mt-5">
          <Link
            href={profile ? '/explore' : '/register'}
            className="inline-flex h-12 items-center rounded-lg bg-amber px-6 font-semibold text-forest no-underline hover:opacity-90"
          >
            {profile ? 'Explore community issues' : 'Create a free account'}
          </Link>
        </div>
      </section>
    </div>
  );
}
