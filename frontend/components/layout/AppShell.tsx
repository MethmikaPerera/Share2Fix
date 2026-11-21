'use client';

import { LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { homePathFor, useAuth } from '@/features/auth/AuthProvider';
import { ROLE_LABELS } from '@/lib/constants';
import type { Role } from '@/types';
import { buttonClass } from '../ui/Button';
import { Spinner } from '../ui/Feedback';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';

interface NavItem {
  href: string;
  label: string;
  /** Match any path starting with this prefix (default: exact match). */
  prefix?: boolean;
}

const NAV: Record<Role | 'GUEST', NavItem[]> = {
  GUEST: [
    { href: '/explore', label: 'Explore' },
    { href: '/map', label: 'Issue map' },
  ],
  CITIZEN: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/explore', label: 'Explore' },
    { href: '/map', label: 'Issue map' },
    { href: '/my-reports', label: 'My reports' },
  ],
  AUTHORITY_OFFICER: [
    { href: '/authority', label: 'Dashboard' },
    { href: '/authority/reports', label: 'Assigned reports', prefix: true },
    { href: '/explore', label: 'Explore' },
    { href: '/map', label: 'Issue map' },
  ],
  ADMIN: [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/reports', label: 'All reports', prefix: true },
    { href: '/admin/users', label: 'Users', prefix: true },
    { href: '/admin/authorities', label: 'Authorities', prefix: true },
    { href: '/map', label: 'Issue map' },
  ],
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, loading, logout, sessionError } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = NAV[profile?.role ?? 'GUEST'];
  const isActive = (item: NavItem) => (item.prefix ? pathname.startsWith(item.href) : pathname === item.href);

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Logo href={profile ? homePathFor(profile.role) : '/'} />

          <nav className="ml-4 hidden h-full items-stretch gap-7 lg:flex" aria-label="Main">
            {nav.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center text-sm no-underline transition-colors after:absolute after:inset-x-0 after:bottom-[-1px] after:h-[2px] after:transition-colors ${
                    active ? 'font-semibold text-ink after:bg-brand' : 'font-medium text-ink-soft after:bg-transparent hover:text-ink hover:after:bg-line-strong'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {profile?.role === 'CITIZEN' && (
              <Link href="/report/new" className={`${buttonClass('primary', 'sm')} mr-1 hidden no-underline sm:inline-flex`}>
                Report an issue
              </Link>
            )}
            {profile && <NotificationBell />}
            {profile ? (
              <div className="hidden items-center gap-1 lg:flex">
                <Link
                  href="/profile"
                  className="ml-1 flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2.5 text-left no-underline transition-colors hover:bg-sunken"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint font-serif text-[0.8125rem] font-medium text-brand-deep ring-1 ring-inset ring-brand/15"
                    aria-hidden
                  >
                    {initials(profile.fullName)}
                  </span>
                  <span className="leading-tight">
                    <span className="block max-w-32 truncate text-[0.8125rem] font-semibold text-ink">{profile.fullName}</span>
                    <span className="block text-[0.6875rem] text-ink-faint">{ROLE_LABELS[profile.role]}</span>
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-md p-2 text-ink-faint transition-colors hover:bg-sunken hover:text-ink"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            ) : (
              !loading && (
                <div className="hidden items-center gap-2 sm:flex">
                  <Link href="/login" className={`${buttonClass('ghost', 'sm')} !text-ink no-underline`}>
                    Sign in
                  </Link>
                  <Link href="/register" className={`${buttonClass('primary', 'sm')} no-underline`}>
                    Get started
                  </Link>
                </div>
              )
            )}
            <button
              className="rounded-md p-2 text-ink transition-colors hover:bg-sunken lg:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-line bg-paper lg:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col px-4 py-3" aria-label="Mobile">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`border-b border-line py-3 text-[0.9375rem] no-underline ${isActive(item) ? 'font-semibold text-brand' : 'font-medium text-ink'}`}
                >
                  {item.label}
                </Link>
              ))}
              {profile ? (
                <>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="border-b border-line py-3 text-[0.9375rem] font-medium text-ink no-underline">
                    Profile <span className="text-ink-faint">({profile.fullName})</span>
                  </Link>
                  <button onClick={handleLogout} className="py-3 text-left text-[0.9375rem] font-medium text-ink-soft">
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex gap-2 pt-3">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className={`${buttonClass('secondary', 'md')} flex-1 no-underline`}>
                    Sign in
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className={`${buttonClass('primary', 'md')} flex-1 no-underline`}>
                    Get started
                  </Link>
                </div>
              )}
              {profile?.role === 'CITIZEN' && (
                <Link href="/report/new" onClick={() => setMenuOpen(false)} className={`${buttonClass('primary', 'md')} mt-3 no-underline`}>
                  Report an issue
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {sessionError && (
          <div className="mb-4 rounded-md border-l-[3px] border-danger bg-danger-tint p-3 text-sm text-danger" role="alert">
            {sessionError}
          </div>
        )}
        {loading ? <Spinner label="Loading..." /> : children}
      </main>

      <footer className="bg-ink text-white/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
          <div>
            <Logo light href="/" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              A community-powered platform connecting Sri Lankan citizens with the authorities responsible for their streets.
            </p>
          </div>
          <div>
            <p className="eyebrow !text-white/50">Platform</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/explore" className="!text-white/80 no-underline hover:!text-white">
                  Explore issues
                </Link>
              </li>
              <li>
                <Link href="/map" className="!text-white/80 no-underline hover:!text-white">
                  Issue map
                </Link>
              </li>
              <li>
                <Link href={profile ? '/report/new' : '/register'} className="!text-white/80 no-underline hover:!text-white">
                  Report an issue
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow !text-white/50">Please note</p>
            <p className="mt-4 text-sm leading-relaxed">
              Authority routing uses demonstration data and is a suggestion, not an official jurisdiction decision.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-white/50 sm:px-6 lg:px-8">
            <span>&copy; {new Date().getFullYear()} Share2Fix</span>
            <span className="font-serif italic text-white/60">Report. Share. Fix.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
