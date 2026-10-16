import type { Metadata } from 'next';
import { PublicShell } from '@/components/marketing/PublicShell';
import { SelfStudyRoadmap } from '@/components/marketing/SelfStudyRoadmap';
import { publicPageMetadata } from '@/lib/public-seo';
import '@/components/marketing/self-study-roadmap.css';

export const metadata: Metadata = publicPageMetadata({
  path: '/tu-hoc',
  title: 'Tự học C++ và thuật toán — CSAT',
  description: 'Roadmap HSG Tin học và Chuyên Tin THCS: 43 chủ đề C++, thuật toán và quy hoạch động, kèm bài tập theo tag trên CSATOJ.',
});

export default function KnowledgeMapPage() {
  return <PublicShell presentation="map"><SelfStudyRoadmap /></PublicShell>;
}
