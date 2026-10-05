import type { Metadata } from 'next';
import { PublicShell } from '@/components/marketing/PublicShell';
import { LearningMaterialsExperience } from '@/components/marketing/LearningMaterialsExperience';

export const metadata: Metadata = {
  title: 'Học liệu miễn phí — CSAT Tutor',
  description: 'Trao đổi cùng gia sư CSAT để tìm học liệu chuyên Tin phù hợp, khám phá cách chọn bài, viết lời giải và luyện tập trên CSATOJ.',
  alternates: { canonical: 'https://portal.csatoj.vn/hoc-lieu-mien-phi' },
};

export default function LearningMaterialsPage() {
  return <PublicShell><LearningMaterialsExperience /></PublicShell>;
}
