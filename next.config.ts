import type { NextConfig } from 'next';

// Public endpoint only; never include an API key in a response header.
const supabaseOrigin = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    return ['http:', 'https:'].includes(url.protocol) ? url.origin : '';
  } catch { return ''; }
})();
const cspReportOnly = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://picsum.photos https://fastly.picsum.photos ${supabaseOrigin}`,
  "font-src 'self'",
  `connect-src 'self' https://vitals.vercel-insights.com ${supabaseOrigin} ${supabaseOrigin.replace(/^http/, 'ws')}`,
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  redirects() {
    return [{ source: '/ban-do-kien-thuc', destination: '/tu-hoc', permanent: true }];
  },
  reactStrictMode: true,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // Observe first; no report collector stores private URLs or request bodies.
        ...(process.env.NODE_ENV === 'production' ? [{ key: 'Content-Security-Policy-Report-Only', value: cspReportOnly }] : []),
      ],
    }];
  },
  outputFileTracingIncludes: {
    '/parents/chuyen-de/*': ['./content/parent-topics/*.md'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        // Sử dụng cho ảnh placeholder trong môi trường phát triển
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  transpilePackages: ['motion'],
};

export default nextConfig;
