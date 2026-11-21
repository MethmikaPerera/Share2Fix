import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/AuthProvider';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Share2Fix - Report. Share. Fix.', template: '%s | Share2Fix' },
  description:
    'Share2Fix is a community-powered platform that connects Sri Lankan citizens with local authorities to report, track and resolve public infrastructure problems.',
};

export const viewport: Viewport = { themeColor: '#087F78', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
