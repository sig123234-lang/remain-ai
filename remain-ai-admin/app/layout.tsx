import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider, THEME_INIT_SCRIPT } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'remAIn',
  description: '회상치료 세션 운영',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* FOUC 방지 — 페인트 전에 .dark 클래스 부여 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
