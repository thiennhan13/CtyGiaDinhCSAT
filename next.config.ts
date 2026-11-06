import aliases from './lib/route-aliases.json';
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
    const redirect = (source: string, destination: string) => ({ source, destination, permanent: true });
    const programs = { a:'a', b:'b', c:'c', e:'e', k:'k', advanced:'c', 'nang-cao':'c', custom:'k', 'tuy-chinh':'k' };
    return [
      ...Object.entries(aliases.topics).flatMap(([old, slug]) => ['parent','parents'].map(area => redirect('/'+area+'/chuyen-de/'+old, '/parents/topics/'+slug))),
      ...Object.entries(aliases.posts).map(([old, slug]) => redirect('/bai-dang/'+old, '/posts/'+slug)),
      ...Object.entries(programs).map(([old, slug]) => redirect('/lo-trinh/'+old, '/roadmap/'+slug)),
      ...['basic','co-ban'].map(old => redirect('/lo-trinh/'+old, '/roadmap')),
      ...['voi','prevoi','hsgqg'].map(old => redirect('/lo-trinh/'+old, '/enroll#details')),
      ...['parent','parents'].map(area => redirect('/'+area+'/lo-trinh/:id', '/parents/roadmap/:id')),
      redirect('/parent/:path*', '/parents/:path*'),
      ...Object.entries(aliases.pages).map(([old, slug]) => redirect('/'+old, '/'+slug)),
    ];
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
    '/parents/topics/*': ['./content/parent-topics/*.md'],
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
