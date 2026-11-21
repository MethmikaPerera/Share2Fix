'use client';

import type { ReactNode } from 'react';
import { RequireAuth } from '@/features/auth/RequireAuth';

export default function CitizenLayout({ children }: { children: ReactNode }) {
  return <RequireAuth roles={['CITIZEN']}>{children}</RequireAuth>;
}
