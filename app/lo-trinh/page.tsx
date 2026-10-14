import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/public-seo';
import { courseListStructuredData } from '@/lib/public-structured-data';
import { PublicStructuredData } from '@/components/marketing/PublicStructuredData';
import { PublicShell } from '@/components/marketing/PublicShell';
import { RoadmapExperience } from '@/components/marketing/RoadmapExperience';
import '@/components/marketing/roadmap-experience.css';
import '@/components/marketing/public-density.css';

export const metadata: Metadata = publicPageMetadata({
  path: '/lo-trinh',
  title: 'Lộ trình C++ và thuật toán — CSAT',
  description: 'Khám phá lớp A, B, C, E Chủ lực và Kèm riêng. Tìm điểm bắt đầu theo nền tảng và mục tiêu, cùng đội ngũ gia sư chuyên Phan.',
});

export default function LearningPage() {
  return <PublicShell><PublicStructuredData data={courseListStructuredData()} /><RoadmapExperience /></PublicShell>;
}
