import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Binary, Braces, CodeXml, GitBranch, Sparkles, Terminal } from 'lucide-react';
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
      <div className="study-enrollment-art study-enrollment-art-left" aria-hidden="true">
        <Braces className="study-art-main" /><GitBranch className="study-art-branch" /><Binary className="study-art-small" />
      </div>
      <h2 id="study-enrollment-title">Đăng kí <span>ngay</span></h2>
      <p>để truy cập các bài giảng chuyên sâu, code mẫu và hình thành tư duy lập trình thi đấu!</p>
      <Link href="/lo-trinh#tu-van" className="btn">Đăng kí ngay <ArrowUpRight size={22} aria-hidden="true" /></Link>
      <div className="study-enrollment-art study-enrollment-art-right" aria-hidden="true">
        <Terminal className="study-art-main" /><CodeXml className="study-art-branch" /><Sparkles className="study-art-small" />
        <span className="study-enrollment-pixel" />
      </div>
    </section>
  </PublicShell>;
}
