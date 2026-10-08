import type { Metadata } from 'next';
import './globals.css';
import { Archivo } from 'next/font/google';
import { cn } from '@/lib/utils';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/components/theme-provider';

/** Primary font — Archivo 400-900 (csatoj.vn uses only Archivo) */
const archivo = Archivo({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-archivo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CSAT Tutor',
  description: 'Hệ thống Quản lý Gia sư CSAT',
  icons: {
    icon: [
      { url: '/icon/favicon.ico?v=rounded-1' },
      { url: '/icon/favicon-32x32.png?v=rounded-1', sizes: '32x32', type: 'image/png' },
      { url: '/icon/favicon.svg?v=rounded-1', sizes: 'any', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={cn('font-sans', archivo.variable)} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
