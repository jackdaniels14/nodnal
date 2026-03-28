'use client';

import { AuthProvider } from '@/lib/auth';
import { ReactNode } from 'react';

export function AuthWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
