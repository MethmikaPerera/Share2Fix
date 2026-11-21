'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { LinkButton } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Feedback';
import { ShieldAlert } from 'lucide-react';
import type { Role } from '@/types';
import { homePathFor, useAuth } from './AuthProvider';

/**
 * Client-side route guard for UX only. Real authorization is enforced by the Express API
 * (token verification + role checks on every request).
 */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !profile) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, profile, router, pathname]);

  if (loading || !profile) return <Spinner label="Checking your session..." />;

  if (roles && !roles.includes(profile.role)) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-card border border-line bg-surface p-10 text-center shadow-card">
        <ShieldAlert className="mx-auto mb-5 h-7 w-7 text-brass" strokeWidth={1.5} aria-hidden />
        <h1 className="text-[1.625rem]">You don&apos;t have access to this page</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">This area is restricted to a different account type.</p>
        <div className="mt-7">
          <LinkButton href={homePathFor(profile.role)}>Go to my dashboard</LinkButton>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
