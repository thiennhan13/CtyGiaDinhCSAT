import type { Metadata } from 'next';
import './globals.css';
import { Lexend } from 'next/font/google';
import { cn } from '@/lib/utils';
import { SpeedInsights } from '@vercel/speed-insights/next';
import BackgroundIcons from '@/components/BackgroundIcons';
import { ThemeProvider } from '@/components/theme-provider';

const lexend = Lexend({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CSAT Tutor',
  description: 'Hệ thống Quản lý Gia sư CSAT',
  icons: {
    icon: [
      { url: '/icon/favicon.ico' },
      { url: '/icon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/icon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={cn('font-sans', lexend.variable)} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <BackgroundIcons />
          {children}
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
