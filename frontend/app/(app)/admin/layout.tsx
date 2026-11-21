'use client';

import type { ReactNode } from 'react';
import { RequireAuth } from '@/features/auth/RequireAuth';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireAuth roles={['ADMIN']}>{children}</RequireAuth>;
}
