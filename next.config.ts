import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
