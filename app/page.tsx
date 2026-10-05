import type { Metadata } from 'next';
import { PublicShell } from '@/components/marketing/PublicShell';
import { HomeExperience } from '@/components/marketing/HomeExperience';
export const metadata: Metadata = {
    title: 'CSAT — Lập trình thi đấu & Tư duy thuật toán',
    description: 'Học C++, lập trình thi đấu và tư duy thuật toán cùng gia sư chuyên Phan. Khám phá năm khóa A/B/C/E/K, cách học tại CSAT và luyện tập trên CSATOJ.',
    alternates: { canonical: 'https://portal.csatoj.vn' },
};
export default function LandingPage() {
    return <PublicShell><HomeExperience /></PublicShell>;
}
