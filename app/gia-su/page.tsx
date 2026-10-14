import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/public-seo';
import { PublicShell } from '@/components/marketing/PublicShell';
import { TutorHero, TutorTeam } from '@/components/marketing/TutorShowcase';

export const metadata: Metadata = publicPageMetadata({
  path: '/gia-su',
  title: 'Đội ngũ gia sư chuyên Phan — CSAT',
  description: 'Gặp đội ngũ gia sư cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu, cùng học sinh học C++ và tư duy thuật toán tại CSAT.',
});

export default function TutorsPage() {
  return <PublicShell><div className="home-page tutors-page"><TutorHero teamPage /><TutorTeam /></div></PublicShell>;
}
