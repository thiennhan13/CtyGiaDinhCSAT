import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { programs, type ProgramSlug } from '@/lib/public-learning';
export function ProgramCards() {
  return <div className="public-grid-two">{(Object.keys(programs) as ProgramSlug[]).map((slug, index) => {
    const course = programs[slug];
    return <article key={slug} className="public-program"><div className="public-card-top"><span className="public-number">0{index + 1}</span><span className="public-badge">{slug === 'co-ban' ? 'Hai tầng A + B' : 'Một khung nâng cao'}</span></div><p className="public-kicker">{course.eyebrow}</p><h3>{course.name}</h3><p>{course.summary}</p><p className="public-course-goal">{slug === 'co-ban' ? 'Nền tảng cho HSG THCS & Chuyên Tin' : 'Hướng tới HSG tỉnh cấp THPT'}</p><Link href={`/lo-trinh/${slug}`} className="public-text-link">Khám phá chương trình {course.name} <ArrowRight size={18} /></Link></article>;
  })}</div>;
}
