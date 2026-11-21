import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="texture-dots relative hidden flex-col justify-between overflow-hidden bg-brand-deep p-12 text-white lg:flex xl:p-16">
        <Logo light />

        <div className="max-w-md">
          <span className="mb-8 block h-px w-12 bg-brass" aria-hidden />
          <p className="font-serif text-[2.5rem] font-normal leading-[1.12] tracking-tight text-surface">
            Every street has a story. <span className="italic text-[#d9b768]">Help us fix it.</span>
          </p>
          <p className="mt-6 text-[0.9375rem] leading-relaxed text-white/70">
            Report a problem in minutes, follow it through to resolution, and hold the process to account with the rest of your community.
          </p>
        </div>

        <p className="text-xs text-white/45">Report. Share. Fix. &mdash; Building better communities together.</p>
      </aside>

      <div className="flex flex-col px-5 py-8 sm:px-10">
        <div className="mb-10 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
        <p className="mt-10 text-center text-xs text-ink-faint lg:hidden">Report. Share. Fix.</p>
      </div>
    </div>
  );
}
