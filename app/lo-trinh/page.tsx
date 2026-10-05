import type { Metadata } from 'next';
import { PublicShell } from '@/components/marketing/PublicShell';
import { RoadmapExperience } from '@/components/marketing/RoadmapExperience';
import '@/components/marketing/roadmap-experience.css';

export const metadata: Metadata = {
  title: 'Lộ trình C++ và thuật toán — CSAT',
  description: 'Khám phá lớp A, B, C, PreVOI và Kèm riêng. Tìm điểm bắt đầu theo nền tảng và mục tiêu, cùng đội ngũ gia sư chuyên Phan.',
  alternates: { canonical: 'https://portal.csatoj.vn/lo-trinh' },
};

export default function LearningPage() {
  return <PublicShell><RoadmapExperience /></PublicShell>;
}
