'use client';

import type { ReactNode } from 'react';
import { RequireAuth } from '@/features/auth/RequireAuth';

export default function AuthorityLayout({ children }: { children: ReactNode }) {
  return <RequireAuth roles={['AUTHORITY_OFFICER', 'ADMIN']}>{children}</RequireAuth>;
}
