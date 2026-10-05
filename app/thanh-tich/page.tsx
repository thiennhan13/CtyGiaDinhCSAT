import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Trophy } from 'lucide-react';
import { PublicShell } from '@/components/marketing/PublicShell';
import { CodeIcon, Reveal } from '@/components/marketing/PublicMotion';
import '@/components/marketing/achievements.css';

export const metadata: Metadata = {
  title: 'Thành tích — CSAT',
  description: 'Góc nhìn lại những dấu mốc trong hành trình học Tin cùng CSAT.',
  alternates: { canonical: 'https://portal.csatoj.vn/thanh-tich' },
};
export default function AchievementsPage() {
  return <PublicShell><div className="awards-page">
    <header className="wrap awards-hero"><div><p className="eyebrow">CSAT / THÀNH TÍCH</p><h1>Từng nỗ lực.<br/><em>Thêm dấu mốc.</em></h1><p>Mỗi kết quả là một điểm để nhìn lại việc học: những bài đã luyện, cách giải đã hiểu và sự bền bỉ qua từng lần thử.</p><Link className="text-link" href="/gia-su">Gặp đội ngũ gia sư CSAT <ArrowRight size={18}/></Link></div><div className="awards-art" aria-hidden="true"><Trophy/><span><CodeIcon name="graph"/></span><span><CodeIcon name="brackets"/></span></div></header>
    <section className="wrap awards-sections" aria-label="Các góc nhìn thành tích"><Reveal variant="left"><article><span className="mono">01 / HỌC SINH</span><h2>Hành trình học Tin.</h2><p>Từ việc tự viết một lời giải đến những mục tiêu thi đấu, mỗi bước đi đều bắt đầu bằng quá trình học và luyện tập.</p><Link className="text-link" href="/lo-trinh">Khám phá các lớp học <ArrowUpRight size={18}/></Link></article></Reveal><Reveal variant="right" tone="lime"><article><span className="mono">02 / ĐỘI NGŨ</span><h2>Kinh nghiệm để sẻ chia.</h2><p>Các gia sư cựu học sinh chuyên Tin THPT Chuyên Phan Bội Châu cùng học sinh phân tích bài toán và tìm lời giải.</p><Link className="text-link" href="/gia-su">Tìm hiểu đội ngũ <ArrowUpRight size={18}/></Link></article></Reveal></section>
  </div></PublicShell>;
}
