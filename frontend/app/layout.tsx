import type { Metadata, Viewport } from 'next';
import { Hanken_Grotesk, Newsreader } from 'next/font/google';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/AuthProvider';
import './globals.css';

const display = Newsreader({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Share2Fix - Report. Share. Fix.', template: '%s | Share2Fix' },
  description:
    'Share2Fix is a community-powered platform that connects Sri Lankan citizens with local authorities to report, track and resolve public infrastructure problems.',
};

export const viewport: Viewport = { themeColor: '#0b5d59', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
