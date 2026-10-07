import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Binary, Braces, ClipboardCheck, Clock3, Code2, Medal, Users } from 'lucide-react';
import { enrollmentHref, publicCourses } from '@/lib/public-courses';
import { publicRoadmapContent } from '@/lib/public-roadmap-content';
import { CoursePosterPreview } from './CoursePosterPreview';
import { Reveal } from './PublicMotion';
import './flagship-course.css';

// Square terminals and diagonal cuts echo the KVANT geometry of the CSAT logo.
// These marks are decorative: the three steps retain their visible text labels.
function FlagshipMark() {
  return <svg className="e-entry-mark" viewBox="0 0 48 48" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" fillRule="evenodd" d="M8 4H18L24 12L30 4H40L30 20H18Z M16 22H32L40 30V38L32 46H16L8 38V30Z M20 28L14 34L20 40H28L34 34L28 28Z" /></svg>;
}

export function FlagshipCourseSection({ chapter, href }: { chapter: string; href: string }) {
  const course = publicCourses.find(item => item.code === 'E')!;
  const content = publicRoadmapContent.E;
  return <section className="rm-class-section rm-editorial-class rm-class-e rm-flagship rm-flagship-feature" id="lop-e" aria-labelledby="class-e-title">
    <div className="e-background-art" aria-hidden="true"><Code2 className="e-art-code" /><Braces className="e-art-braces" /><Binary className="e-art-binary" /><Medal className="e-art-medal" /></div>
    <Reveal className="wrap rm-section-reveal" variant="rise">
      <div className="e-chapter"><span className="mono">{chapter} / LỚP E</span><span>CHỌN LỌC TỪ LỚP C</span></div>
      <div className="e-feature-panel">
        <div className="rm-description-band e-feature-header">
          <CoursePosterPreview code="E" className="rm-background-poster" sizes="(max-width: 600px) 100vw, 90vw" background variant="illustration" showExpand={false} interactive={false} />
          <div className="e-hero-copy">
            <p className="e-kicker">Chuyên Tin · Lập trình thi đấu</p>
            <h2 id="class-e-title"><span className="e-rank roadmap-course-letter">E</span><span className="e-course-name">{course.name}</span></h2>
            <div className="rm-heading-facts"><span><Clock3 size={16} aria-hidden="true" />120 phút (2 giờ) / buổi</span><span><Users size={16} aria-hidden="true" />{course.size}</span><span className="e-competition-tag"><Medal size={16} aria-hidden="true" />Thi đấu &amp; phát triển</span></div>
            <div className="e-message">
              <p className="e-overview">{content.overview}</p>
            </div>
          </div>
          <aside className="e-entry e-circuit" aria-label="Đầu vào lớp Chủ lực">
            <ol className="rm-admission-path e-admission-path e-circuit-path" aria-label="Đường vào lớp Chủ lực">
              <li className="e-circuit-node e-circuit-c"><div className="e-entry-label"><b className="roadmap-course-letter">C</b><span>Nền tảng nâng cao</span></div></li>
              <li className="e-circuit-node e-circuit-selection"><ClipboardCheck className="e-entry-mark" size={24} strokeWidth={1.5} aria-hidden="true" /><strong>Thi tuyển riêng</strong></li>
              <li className="e-circuit-node e-circuit-e"><div className="e-entry-label"><FlagshipMark /><b className="roadmap-course-letter">Elite</b></div></li>
            </ol>
          </aside>
        </div>
        <div className="e-pillars-group">
          <p className="e-kicker e-pillars-caption">Ba trọng tâm · Một hướng phát triển</p>
          <ol className="e-pillars">{content.development!.map((part, index) => <li className={`e-pillar e-pillar-${index + 1}`} key={part.title}>
            <div className="e-pillar-label"><span aria-hidden="true">0{index + 1}</span><span>{part.label}</span></div>
            <h3>{part.title}</h3><p>{part.description}</p>
            {part.tags && <ul className="e-pillar-tags" aria-label={`Trọng tâm: ${part.title}`}>{part.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>}
          </li>)}</ol>
        </div>
        <div className="e-feature-footer"><p>Kiến thức chuyên sâu.<br /><strong>Một tập thể cùng nỗ lực.</strong></p><div><Link className="text-link" href={href}>Tìm hiểu lớp E <ArrowRight size={18} aria-hidden="true" /></Link><Link className="btn" href={enrollmentHref('E')}>Đăng ký lớp E <ArrowUpRight size={18} aria-hidden="true" /></Link></div></div>
      </div>
    </Reveal>
  </section>;
}
