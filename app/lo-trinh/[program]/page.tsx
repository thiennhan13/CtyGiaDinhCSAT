import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Clock3, Users, UserRound, Compass, BookOpen } from 'lucide-react';
import curriculum from '@/lib/learning-curriculum-20260922.json';
import { PublicShell } from '@/components/marketing/PublicShell';
import { PublicConsultation } from '@/components/marketing/PublicConsultation';
import '@/components/marketing/roadmap-experience.css';
import { enrollmentHref, publicCourseCode, publicCourses } from '@/lib/public-courses';
import { publicRoadmapContent } from '@/lib/public-roadmap-content';
import { CoursePoster } from '@/components/marketing/RoadmapCourseSection';
import { CourseCurriculum, CoursePathway, CourseSpecialDirection, CourseOutcomes } from '@/components/marketing/CourseDetailContent';
import '@/components/marketing/roadmap-editorial.css';
import '@/components/marketing/course-detail.css';

const catalog = {
  a: { code: 'A', title: 'Nhập môn lập trình', price: '99.000đ', part: 'A', audience: '' },
  b: { code: 'B', title: 'Lập trình thi đấu cơ bản', price: '99.000đ', part: 'B', audience: '' },
  c: { code: 'C', title: 'Lập trình thi đấu nâng cao', price: '109.000đ', part: 'CD', audience: '' },
  e: { code: 'E', title: 'Chủ lực', price: '', part: '', audience: '' },
  k: { code: 'K', title: 'Kèm riêng', price: '', part: '', audience: '' },
} as const;
type CourseKey = keyof typeof catalog;
const aliases: Record<string, CourseKey> = { 'nang-cao': 'c', advanced: 'c', custom: 'k', 'tuy-chinh': 'k' };
function resolve(program: string): CourseKey | undefined { return Object.hasOwn(catalog, program) ? program as CourseKey : Object.hasOwn(aliases, program) ? aliases[program] : undefined; }
export function generateStaticParams() { return [...Object.keys(catalog), ...Object.keys(aliases), 'co-ban', 'basic', 'hsgqg', 'voi', 'prevoi'].map(program => ({ program })); }
export const dynamicParams = false;
export async function generateMetadata({ params }: { params: Promise<{ program: string }> }): Promise<Metadata> {
  const { program } = await params;
  if (['co-ban', 'basic'].includes(program)) return { title: 'Tìm hiểu lộ trình — CSAT', alternates: { canonical: 'https://portal.csatoj.vn/lo-trinh' } };
  const key = resolve(program);
  if (!key) return { title: 'Không tìm thấy lộ trình — CSAT' };
  const course = catalog[key];
  return { title: `${course.code} — ${course.title} · CSAT`, description: publicRoadmapContent[course.code].introduction, alternates: { canonical: `https://portal.csatoj.vn/lo-trinh/${key}` } };
}
const contextValues: Record<string, Record<string, string>> = {
  level: { primary: 'Tiểu học', thcs: 'THCS', thpt: 'THPT' },
  goal: { undecided: 'Khám phá, cần tư vấn', start: 'Bắt đầu học lập trình', thcs: 'HSG cấp THCS', specialist: 'Chuyên Tin', province: 'HSG tỉnh cấp THPT' },
  background: { unsure: 'Chưa rõ, muốn trao đổi', new: 'Chưa học lập trình', syntax: 'Đang làm quen cú pháp', practice: 'Đã tự giải một số bài lập trình' },
};
export default async function CoursePage({ params, searchParams }: { params: Promise<{ program: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ program }, search] = await Promise.all([params, searchParams]);
  if (['co-ban', 'basic'].includes(program)) redirect('/lo-trinh');
  if (['hsgqg', 'voi', 'prevoi'].includes(program)) redirect('/dang-ky-hoc#thong-tin');
  const key = resolve(program);
  if (!key) notFound();
  const course = catalog[key];
  const courseCode = publicCourseCode(course.code)!;
  const enrollment = publicCourses.find(item => item.code === courseCode);
  const template = curriculum.find(item => item.program === (key === 'c' ? 'advanced' : 'basic'))!;
  const stages = ['A', 'B', 'CD'].includes(course.part) ? template.stages.filter(stage => course.part !== 'A' && course.part !== 'B' || stage.part === course.part) : [];
  const contentCode = courseCode;
  const content = publicRoadmapContent[contentCode];
  const query = new URLSearchParams();
  const context = [`${course.code} — ${course.title}`];
  for (const [name, options] of Object.entries(contextValues)) {
    const value = search[name];
    if (typeof value === 'string' && Object.hasOwn(options, value)) { query.set(name, value); context.push(options[value]); }
  }
  const linkTo = (code: string) => `/lo-trinh/${code}${query.size ? `?${query}` : ''}`;
  return <PublicShell><div className={`roadmap-experience rm-course-page rm-detail-${key}`}>
    <header className="wrap rm-course-intro">
      <nav className="rm-course-switch" aria-label="Khám phá các lớp">{Object.entries(catalog).map(([slug, item]) => <Link href={linkTo(slug)} key={slug} aria-current={key === slug ? 'page' : undefined}><b>{item.code}</b>{item.title}<ArrowUpRight aria-hidden="true" size={16} /></Link>)}</nav>
      <nav className="rm-breadcrumb" aria-label="Đường dẫn"><Link href="/">Giới thiệu</Link><span aria-hidden="true">/</span><Link href="/lo-trinh">Lộ trình học tập</Link><span aria-hidden="true">/</span><span aria-current="page">{course.code}</span></nav>
      <div className="rm-course-hero"><div className="rm-detail-copy"><p className="eyebrow">Lớp {course.code} / {course.title}</p><h1>{content.headline[0]}<br /><em>{content.headline[1]}</em></h1>{enrollment && <div className="rm-heading-facts"><span><Clock3 size={17} aria-hidden="true" />{enrollment.duration}</span><span><Users size={17} aria-hidden="true" />{enrollment.size}</span></div>}<p className="rm-course-lead">{content.introduction}</p><div className="rm-detail-enrollment"><Link className="btn" href={enrollmentHref(courseCode)}>Đăng ký học lớp {course.code} <ArrowRight aria-hidden="true" size={18} /></Link><p className="rm-schedule-note">*Lịch học sắp xếp thuận tiện nhất cho học viên theo từng đợt tuyển sinh; trao đổi cụ thể cùng CSAT ngay bây giờ!</p></div></div><CoursePoster code={courseCode} sizes="(max-width: 600px) 112px, (max-width: 900px) 28vw, 40vw" priority /></div>
      <div className="rm-course-facts"><div><UserRound aria-hidden="true" size={25} /><h2>ĐỐI TƯỢNG</h2><p>{enrollment?.audience || course.audience}</p></div><div><Compass aria-hidden="true" size={25} /><h2>CÙNG CHỌN ĐIỂM BẮT ĐẦU</h2><p>{content.foundation}</p></div><div><BookOpen aria-hidden="true" size={25} /><h2>THÔNG TIN LỚP</h2>{course.price ? <><strong>{course.price}<small> / buổi</small></strong><p>{enrollment?.duration} · {enrollment?.size}.</p></> : <p>{key === 'e' ? '3–4 học sinh · 2 giờ / buổi. Thi tuyển đầu vào riêng từ lớp C; học phí trao đổi cùng đội ngũ.' : 'Trao đổi cụ thể cùng đội ngũ về nền tảng, thời lượng và học phí.'}</p>}</div></div>
    </header>
    <CoursePathway code={contentCode} />
    {stages.length > 0 ? <CourseCurriculum code={contentCode} stages={stages} /> : <CourseSpecialDirection code={courseCode as 'E' | 'K'} />}
    <CourseOutcomes code={courseCode} />
    <section className="rm-consult-section" id="tu-van"><div className="wrap rm-consult-layout"><div><p className="eyebrow">Cùng CSAT chọn bước tiếp theo</p><h2>Chia sẻ việc học.<br /><em>Cùng chọn hướng đi.</em></h2><p>Bạn đang quan tâm {course.title.toLowerCase()}? Hãy bắt đầu từ những điều đã học và mục tiêu muốn hướng tới.</p><div className="rm-consult-context"><span className="mono">NỘI DUNG QUAN TÂM</span><p>{context.join(' · ')}</p></div></div><PublicConsultation kind="consultation" context={context.join(' · ')} defaultCourse={courseCode} /></div></section>
  </div></PublicShell>;
}
