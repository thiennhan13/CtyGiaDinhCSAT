import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PublicShell } from '@/components/marketing/PublicShell';
import { SelfStudyRoadmap } from '@/components/marketing/SelfStudyRoadmap';
import { publicPageMetadata } from '@/lib/public-seo';
import '@/components/marketing/self-study-roadmap.css';
import '@/components/marketing/self-study-enrollment.css';

export const metadata: Metadata = publicPageMetadata({
  path: '/tu-hoc',
  title: 'Tự học C++ và thuật toán — CSAT',
  description: 'Roadmap HSG Tin học và Chuyên Tin THCS: 43 chủ đề C++, thuật toán và quy hoạch động, kèm bài tập theo tag trên CSATOJ.',
});

export default function KnowledgeMapPage() {
  return <PublicShell>
    <SelfStudyRoadmap />
    <section className="study-enrollment wrap" aria-labelledby="study-enrollment-title">
      <span className="study-enrollment-mark" aria-hidden="true">{'{ }'}</span>
      <h2 id="study-enrollment-title">Đăng kí <span>ngay</span></h2>
      <p>để truy cập các bài giảng chuyên sâu, code mẫu và hình thành tư duy lập trình thi đấu!</p>
      <Link href="/lo-trinh#tu-van" className="btn">Đăng kí ngay <ArrowUpRight size={22} aria-hidden="true" /></Link>
      <span className="study-enrollment-pixel" aria-hidden="true" />
    </section>
  </PublicShell>;
}
