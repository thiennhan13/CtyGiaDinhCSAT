import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/public-seo';
import { homeStructuredData } from '@/lib/public-structured-data';
import { PublicStructuredData } from '@/components/marketing/PublicStructuredData';
import { PublicShell } from '@/components/marketing/PublicShell';
import { HomeExperience } from '@/components/marketing/HomeExperience';
import '@/components/marketing/public-density.css';
export const metadata: Metadata = {
  ...publicPageMetadata({
    path: '/',
    title: 'CSAT — Lập trình thi đấu & Tư duy thuật toán',
    description: 'Học C++, lập trình thi đấu và tư duy thuật toán cùng gia sư chuyên Phan. Khám phá năm khóa A/B/C/E/K, cách học tại CSAT và luyện tập trên CSATOJ.',
  }),
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
};
export default function LandingPage() {
    return <PublicShell><PublicStructuredData data={homeStructuredData()} /><HomeExperience /></PublicShell>;
}
