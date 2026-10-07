import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Clock3, Users } from 'lucide-react';
import { enrollmentHref, publicCourses, type PublicCourseCode } from '@/lib/public-courses';
import { publicRoadmapContent } from '@/lib/public-roadmap-content';
import { CourseKnowledge } from './CourseKnowledge';
import { CoursePosterPreview } from './CoursePosterPreview';
import { FlagshipCourseSection } from './FlagshipCourseSection';
import { CourseHashtags } from './CourseHashtags';
import { Reveal } from './PublicMotion';
import './roadmap-editorial.css';
import './roadmap-poster-colors.css';

export function CoursePoster({ code, priority = false, sizes = '(max-width: 520px) 112px, 144px' }: { code: PublicCourseCode; priority?: boolean; sizes?: string }) {
  return <CoursePosterPreview code={code} className="rm-course-poster" sizes={sizes} priority={priority} />;
}

export function RoadmapCourseSection({ code, chapter, href }: { code: PublicCourseCode; chapter: string; href: string }) {
  if (code === 'E') return <FlagshipCourseSection chapter={chapter} href={href} />;
  const course = publicCourses.find(item => item.code === code)!;
  const content = publicRoadmapContent[code];
  return <section className={`rm-class-section rm-editorial-class rm-class-${code.toLowerCase()}`} id={`lop-${code.toLowerCase()}`} aria-labelledby={`class-${code.toLowerCase()}-title`}>
    <Reveal className="wrap rm-section-reveal" variant={code === 'B' ? 'right' : code === 'C' ? 'rise' : 'left'}>
      <div className="rm-chapter mono"><span>{chapter} / LỚP {code} · {course.name.toLocaleUpperCase('vi')}</span><span>{course.scope.toLocaleUpperCase('vi')}</span></div>
      <div className="rm-description-band">
      <CoursePosterPreview code={code} className="rm-background-poster" sizes="(max-width: 600px) 90vw, 50vw" background variant="illustration" showExpand={false} interactive={false} />
      {code !== 'K' && <CourseHashtags code={code} />}
      <div className="rm-course-heading-row">
        <div className="rm-course-name"><p className="eyebrow">{course.label}</p><h2 id={`class-${code.toLowerCase()}-title`}><span className="rm-rank roadmap-course-letter">{code}</span>{course.name}</h2><div className="rm-heading-facts"><span><Clock3 size={16} aria-hidden="true" />{course.duration}</span><span><Users size={16} aria-hidden="true" />{course.size}</span>{course.price && <span>{course.price} / buổi</span>}</div></div>
      </div>
      <div className="rm-editorial-intro">{code === 'K' && <h3>{content.tagline}</h3>}<p>{content.overview}</p></div>
        <aside className="rm-audience-panel"><div className="rm-property rm-property-audience"><h3>Đối tượng</h3><p>{course.audience}</p></div><div className="rm-property rm-property-foundation"><h3>{code === 'K' ? 'Trọng tâm định hướng' : 'Nền tảng để phát triển'}</h3><p>{content.foundation}</p></div>{code === 'K' && <ul className="rm-focus-tags">{content.focusTags.map(tag => <li key={tag}>{tag}</li>)}</ul>}</aside>
      </div>
      <div className="rm-overview-body">
        <div className="rm-overview-roadmap"><p className="eyebrow">{code === 'K' ? 'Một hướng học từ nhu cầu cụ thể' : 'Kiến thức nối tiếp · Tư duy phát triển'}</p><CourseKnowledge code={code} /></div>
      </div>
      <div className="rm-class-actions"><Link className="btn" href={href}>Khám phá nội dung lớp {code} <ArrowRight aria-hidden="true" size={18}/></Link><Link className="text-link rm-enrollment-link" href={enrollmentHref(code)}>Đăng ký lớp {code} <ArrowUpRight aria-hidden="true" size={16}/></Link></div>
    </Reveal>
  </section>;
}
