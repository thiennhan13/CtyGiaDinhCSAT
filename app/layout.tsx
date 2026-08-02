import type { Metadata } from 'next';
import './globals.css';
import { Archivo, IBM_Plex_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/components/theme-provider';

/** Primary font — Archivo 400-900 (csatoj.vn uses only Archivo) */
const archivo = Archivo({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '700', '800', '900'],
  variable: '--font-archivo',
  display: 'swap',
});

/** Monospace — IBM Plex Mono (code blocks, stats) */
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600'],
  variable: '--font-ibm-plex-mono',
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
    <html lang="vi" className={cn('font-sans', archivo.variable, ibmPlexMono.variable)} suppressHydrationWarning>
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
