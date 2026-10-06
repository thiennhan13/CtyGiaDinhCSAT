import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Clock3, Users } from 'lucide-react';
import { enrollmentHref, publicCourses, type PublicCourseCode } from '@/lib/public-courses';
import { publicRoadmapContent } from '@/lib/public-roadmap-content';
import { CourseKnowledge } from './CourseKnowledge';
import { CoursePosterPreview } from './CoursePosterPreview';
import './roadmap-editorial.css';
import './roadmap-poster-colors.css';

export function CoursePoster({ code, priority = false }: { code: PublicCourseCode; priority?: boolean }) {
  return <CoursePosterPreview code={code} className="rm-course-poster" sizes="(max-width: 520px) 112px, 144px" priority={priority} />;
}

export function RoadmapCourseSection({ code, chapter, href }: { code: PublicCourseCode; chapter: string; href: string }) {
  const course = publicCourses.find(item => item.code === code)!;
  const content = publicRoadmapContent[code];
  const flagship = code === 'E';
  return <section className={`rm-class-section rm-editorial-class rm-class-${code.toLowerCase()}${flagship ? ' rm-flagship' : ''}`} id={`lop-${code.toLowerCase()}`} aria-labelledby={`class-${code.toLowerCase()}-title`}>
    <div className="wrap">
      <div className="rm-chapter mono"><span>{chapter} / LỚP {code} · {course.name.toLocaleUpperCase('vi')}</span><span>{course.scope.toLocaleUpperCase('vi')}</span></div>
      <div className="rm-description-band">
      <CoursePosterPreview code={code} className="rm-background-poster" sizes="(max-width: 600px) 90vw, 50vw" background />
      <div className="rm-course-heading-row">
        <div className="rm-course-name"><p className="eyebrow">{course.label}</p><h2 id={`class-${code.toLowerCase()}-title`}><span className="rm-rank">{code}</span>{course.name}</h2><div className="rm-heading-facts"><span><Clock3 size={16} aria-hidden="true" />{flagship ? '120 phút (2 giờ) / buổi' : course.duration}</span><span><Users size={16} aria-hidden="true" />{course.size}</span>{course.price && <span>{course.price} / buổi</span>}</div></div>
      </div>
      <div className="rm-editorial-intro"><h3>{content.tagline}</h3><p>{content.overview}</p></div>
        <aside className="rm-audience-panel"><h3>Đối tượng</h3><p>{course.audience}</p><h3>{flagship || code === 'K' ? 'Trọng tâm định hướng' : 'Nền tảng để học tiếp'}</h3><p>{content.foundation}</p><ul className="rm-focus-tags">{content.focusTags.map(tag => <li key={tag}>{tag}</li>)}</ul></aside>
      </div>
      {flagship && <ol className="rm-admission-path" aria-label="Đường vào lớp Chủ lực"><li><b>C</b><span>Nền tảng nâng cao</span></li><li><ArrowRight aria-hidden="true" /><strong>Thi tuyển riêng</strong></li><li><ArrowRight aria-hidden="true" /><b>E</b><span>Lớp Chủ lực</span></li></ol>}
      <div className="rm-overview-body">
        <div className="rm-overview-roadmap"><p className="eyebrow">{flagship ? 'Trọng tâm phát triển · Kiến thức và tư duy' : code === 'K' ? 'Một hướng học từ nhu cầu cụ thể' : 'Kiến thức nối tiếp · Tư duy phát triển'}</p><CourseKnowledge code={code} /></div>
      </div>
      <div className="rm-class-actions"><Link className="btn" href={href}>Khám phá nội dung lớp {code} <ArrowRight aria-hidden="true" size={18}/></Link><Link className="text-link rm-enrollment-link" href={enrollmentHref(code)}>Đăng ký lớp {code} <ArrowUpRight aria-hidden="true" size={16}/></Link></div>
    </div>
  </section>;
}
