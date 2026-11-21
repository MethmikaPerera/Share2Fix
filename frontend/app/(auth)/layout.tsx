import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-mint px-4 py-8">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-xs text-forest-muted">Report. Share. Fix. - Building better communities together.</p>
    </div>
  );
}
