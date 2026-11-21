'use client';

import { LogOut, Menu, UserCircle2, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
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
      <header className="sticky top-0 z-40 bg-teal text-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo href={profile ? (profile.role === 'ADMIN' ? '/admin' : profile.role === 'AUTHORITY_OFFICER' ? '/authority' : '/dashboard') : '/'} light />

          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item) ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium no-underline transition-colors ${
                  isActive(item) ? 'bg-white/15 text-white' : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {profile?.role === 'CITIZEN' && (
              <Link href="/report/new" className={`${buttonClass('amber', 'sm')} hidden no-underline sm:inline-flex`}>
                Report an issue
              </Link>
            )}
            {profile && <NotificationBell />}
            {profile ? (
              <div className="hidden items-center gap-1 lg:flex">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-white no-underline hover:bg-white/10"
                >
                  <UserCircle2 className="h-6 w-6 text-pale" aria-hidden />
                  <span className="leading-tight">
                    <span className="block max-w-32 truncate text-sm font-semibold">{profile.fullName}</span>
                    <span className="block text-xs text-white/75">{ROLE_LABELS[profile.role]}</span>
                  </span>
                </Link>
                <button onClick={handleLogout} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Sign out">
                  <LogOut className="h-5 w-5" aria-hidden />
                </button>
              </div>
            ) : (
              !loading && (
                <div className="hidden items-center gap-2 sm:flex">
                  <Link href="/login" className={`${buttonClass('ghost', 'sm')} !text-white hover:!bg-white/10 no-underline`}>
                    Sign in
                  </Link>
                  <Link href="/register" className={`${buttonClass('amber', 'sm')} no-underline`}>
                    Get started
                  </Link>
                </div>
              )
            )}
            <button
              className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-white/15 lg:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3" aria-label="Mobile">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium no-underline ${isActive(item) ? 'bg-white/15 text-white' : 'text-white/90'}`}
                >
                  {item.label}
                </Link>
              ))}
              {profile?.role === 'CITIZEN' && (
                <Link href="/report/new" onClick={() => setMenuOpen(false)} className={`${buttonClass('amber', 'md')} mt-1 no-underline`}>
                  Report an issue
                </Link>
              )}
              {profile ? (
                <>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 no-underline">
                    Profile ({profile.fullName})
                  </Link>
                  <button onClick={handleLogout} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/90">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 no-underline">
                    Sign in
                  </Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className={`${buttonClass('amber', 'md')} no-underline`}>
                    Get started
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {sessionError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger" role="alert">
            {sessionError}
          </div>
        )}
        {loading ? <Spinner label="Loading..." /> : children}
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-forest-muted sm:px-6">
          <span>Share2Fix - Report. Share. Fix.</span>
          <span>Authority routing uses demonstration data and is a suggestion, not an official jurisdiction decision.</span>
        </div>
      </footer>
    </div>
  );
}
