import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PublicShell } from '@/components/marketing/PublicShell';
import { Reveal } from '@/components/marketing/PublicMotion';
import { publicAchievements } from '@/lib/public-achievements';
import '@/components/marketing/achievements.css';

export const metadata: Metadata = {
  title: 'Thành tích — CSAT',
  description: 'Những dấu mốc học Tin cùng CSAT: học sinh, trường học và thành tích được ghi lại.',
  alternates: { canonical: 'https://portal.csatoj.vn/thanh-tich' },
};
// Content is an editorial catalog, independent of private Portal student records.
export const dynamic = 'error';

function AchievementMedal() {
  return <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="miter">
    <path d="M10 4h10l4 10 4-10h10L30 22H18z" />
    <path d="M16 21h16l8 8v10l-8 8H16l-8-8V29z" />
    <path d="m24 27 3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z" />
  </svg>;
}

function AchievementHeroArt({ variant }: { variant: 'medal' | 'terminal' }) {
  return <div className={`awards-art awards-art-${variant}`} aria-hidden="true"><div className="awards-art-scene">
    <span className="awards-art-ray awards-art-ray-one" />
    <span className="awards-art-ray awards-art-ray-two" />
    <span className="awards-art-grid" />
    <span className="awards-art-strip"><i /><i /><i /></span>
    <span className="awards-art-spark"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" focusable="false"><path d="M16 2v28M2 16h28M6 6l20 20M6 26 26 6" /></svg></span>
    <div className="awards-art-square">
      {variant === 'medal' ? <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="miter" focusable="false">
        <path d="M23 8h17l8 22 8-22h17L59 40H37z" fill="#d9e64c" />
        <path d="m33 37-15 15v25l15 15h30l15-15V52L63 37z" fill="#f8f7f2" />
        <path d="m48 48 6 12 13 2-10 9 2 14-11-7-11 7 2-14-10-9 13-2z" fill="#ee683e" />
      </svg> : <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" strokeLinejoin="miter" focusable="false">
        <path d="M10 15h66l10 10v58H10z" fill="#f8f7f2" />
        <path d="M10 33h76M20 24h2m7 0h2m7 0h2M27 47l12 11-12 11M49 70h19" />
        <path d="m73 6 4 9 10 2-8 7 1 11-8-6-10 5 2-10-7-8 11-1z" fill="#d9e64c" />
      </svg>}
    </div>
    <span className="awards-art-code">{variant === 'medal' ? <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="miter" focusable="false"><path d="m16 3 4 8 9 2-7 7 1 9-7-4-8 4 2-9-7-7 9-2z" /></svg> : <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" focusable="false"><path d="M11 5H5v8l-3 3 3 3v8h6m10-22h6v8l3 3-3 3v8h-6M19 10l-6 12" /></svg>}</span>
    <span className="awards-art-pixel" />
    <span className="awards-art-dot" />
  </div></div>;
}

export default function AchievementsPage() {
  return <PublicShell><div className="awards-page">
    <header className="wrap awards-hero">
      <AchievementHeroArt variant="medal" />
      <Reveal className="awards-reveal awards-hero-copy" variant="rise"><div>
        <p className="eyebrow">BỀN BỈ NỖ LỰC · TỰ HÀO TIẾN BƯỚC</p>
        <h1>Từng nỗ lực.<br /><em>Thêm dấu mốc.</em></h1>
        <p className="awards-hero-description">Sau mỗi thành tích là những giờ học nghiêm túc, nhiều kiên trì tìm ra lời giải cho bài toán khó và vô số những nỗ lực của các bạn học viên tài năng và đầy đam mê. Chúc mừng các bạn đã biến nỗ lực ấy thành những dấu mốc đáng tự hào, và CSAT vinh dự được đồng hành cùng các bạn trên con đường học tập hôm nay và trong tương lai — cùng nuôi dưỡng tình yêu với Tin học, rèn tư duy và khám phá những chân trời tri thức mới.</p>
      </div></Reveal>
      <AchievementHeroArt variant="terminal" />
    </header>
    <section className="wrap awards-students" id="hoc-sinh" aria-labelledby="awards-students-title">
      <Reveal className="awards-reveal" variant="rise"><div className="awards-section-label">
        <h2 id="awards-students-title">BẢNG VÀNG VINH DANH</h2>
        <span>HỌC TIN · LUYỆN TẬP · THI ĐẤU</span>
      </div></Reveal>
      <div className="awards-student-grid">
        {publicAchievements.map((student, index) => <Reveal key={student.id} className="awards-reveal awards-card-reveal" variant="rise">
          <article className="awards-student-card" data-tone={['lime', 'orange', 'blue'][index % 3]} aria-labelledby={`student-${student.id}`}>
            <figure className="awards-student-photo">
              <picture>
                <source type="image/webp" srcSet={student.image.srcSet} sizes="(max-width: 600px) calc(42vw - 32px), (max-width: 900px) calc(42vw - 41px), (max-width: 1100px) calc(24vw - 39px), (max-width: 1439px) calc(24vw - 33px), (max-width: 1784px) calc(16vw - 33px), 253px" />
                {/* Responsive WebP variants are prepared once; no runtime recompression. */}
                <Image unoptimized src={student.image.src} width={student.image.width} height={student.image.height} alt={`Ảnh ghi nhận thành tích của ${student.name}`} loading="lazy" />
              </picture>
            </figure>
            <div className="awards-student-data">
              <div className="awards-student-heading">
                <span className="awards-student-label">HỌC SINH</span>
                <h3 id={`student-${student.id}`}>{student.name}</h3>
              </div>
              <div className="awards-student-award"><AchievementMedal /><div>
                <span className="awards-field-label">THÀNH TÍCH</span>
                <ul>{student.achievements.map(achievement => <li key={achievement}>{achievement}</li>)}</ul>
              </div></div>
              {student.school && <div className="awards-student-school">
                <span className="awards-field-label">TRƯỜNG HỌC</span><p>{student.school}</p>
              </div>}
            </div>
          </article>
        </Reveal>)}
      </div>
    </section>
    <Reveal className="awards-reveal" variant="rise"><div className="wrap awards-next">
      <p>Mỗi hành trình có một điểm bắt đầu. Tìm hiểu lộ trình học Tin phù hợp với nền tảng và mục tiêu của bạn.</p>
      <Link className="text-link" href="/lo-trinh">Khám phá các lớp học <ArrowRight size={18} /></Link>
      <Link className="text-link" href="/gia-su">Gặp đội ngũ gia sư <ArrowRight size={18} /></Link>
    </div></Reveal>
  </div></PublicShell>;
}
