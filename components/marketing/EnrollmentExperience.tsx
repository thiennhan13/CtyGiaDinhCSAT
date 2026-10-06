import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Clock3, Users } from 'lucide-react';
import { enrollmentHref, publicCourses, type PublicCourseCode } from '@/lib/public-courses';
import { PublicConsultation } from './PublicConsultation';
import { CoursePosterPreview } from './CoursePosterPreview';
import './enrollment.css';

export function EnrollmentExperience({ selectedCourse }: { selectedCourse?: PublicCourseCode }) {
  const selected = publicCourses.find(course => course.code === selectedCourse);
  return <div className="enrollment-page">
    <header className="wrap enrollment-intro">
      <div><p className="eyebrow">Đăng ký học / CSAT Tutor</p><h1>Từ nền tảng.<br /><em>Đến hướng học tiếp.</em></h1></div>
      <div className="enrollment-intro-side"><p>Chọn lớp bạn quan tâm. Cùng gia sư nhìn lại những gì đã học, xác định mục tiêu và tìm nhịp học phù hợp.</p><ol className="enrollment-process"><li>Chọn lớp</li><li>Trao đổi nền tảng</li><li>Thống nhất lịch</li></ol></div>
    </header>
    <section className="wrap enrollment-grid" aria-label="Các lớp học CSAT">
      {publicCourses.map(course => <article className={`enrollment-card enrollment-${course.code.toLowerCase()}`} key={course.code} aria-labelledby={`enrollment-${course.code}`}>
        <div className="enrollment-card-top"><div><span className="enrollment-rank" aria-hidden="true">{course.code}</span><p className="enrollment-label">{course.label}</p></div><CoursePosterPreview code={course.code} className="enrollment-poster" /></div>
        <div className="enrollment-card-body">
          <h2 id={`enrollment-${course.code}`}><span className="sr-only">Lớp {course.code} — </span>{course.name}</h2>
          <div className="enrollment-facts"><span><Clock3 size={16} aria-hidden="true" />{course.duration}</span><span><Users size={16} aria-hidden="true" />{course.size}</span></div>
          <div className="enrollment-audience"><h3>Đối tượng</h3><p>{course.audience}</p></div>
          <div className="enrollment-learning"><p className="enrollment-scope">{course.scope}</p><h3 className="enrollment-learning-title">{course.code === 'E' || course.code === 'K' ? 'Các bước trao đổi' : 'Hướng phát triển'}</h3><ol>{course.steps.map((step, index) => <li key={step.title}><span aria-hidden="true">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol></div>
          <div className="enrollment-knowledge"><h3>{course.code === 'E' || course.code === 'K' ? 'Định hướng & hình thức' : 'Nội dung học'}</h3><ul>{course.tags.map(tag => <li key={tag}>{tag}</li>)}</ul></div>
          <div className="enrollment-card-bottom"><p className="enrollment-price"><strong>{course.price || 'Trao đổi học phí'}</strong><span>{course.price ? '/ buổi' : 'Cùng đội ngũ CSAT'}</span></p><Link className="btn" href={enrollmentHref(course.code)}>Đăng ký lớp {course.code}<ArrowUpRight size={18} aria-hidden="true" /></Link><Link className="text-link" href={`/lo-trinh/${course.code.toLowerCase()}`}>Xem chi tiết lớp {course.code}<ArrowRight size={16} aria-hidden="true" /></Link></div>
        </div>
      </article>)}
      <aside className="enrollment-help"><span aria-hidden="true">{'{ ? }'}</span><p className="eyebrow">Cùng chọn hướng đi</p><h2>Chưa rõ nên<br />bắt đầu ở đâu?</h2><p>Nhìn lại nền tảng, những bài đã làm và mục tiêu của bạn. Gia sư sẽ cùng bạn trao đổi trước khi chọn lớp.</p><Link className="btn secondary" href="/lo-trinh#chon-lo-trinh">Tìm điểm bắt đầu <ArrowUpRight aria-hidden="true" size={18} /></Link></aside>
    </section>
    <p className="wrap enrollment-catalog-note">Lớp C gồm C+D. Lịch mở lớp được trao đổi theo đợt tuyển sinh.</p>
    <section className="enrollment-registration" id="thong-tin" aria-labelledby="registration-title"><div className="wrap enrollment-registration-layout"><div><p className="eyebrow">Cùng CSAT chọn bước tiếp theo</p><h2 id="registration-title">{selected ? <>Bạn quan tâm lớp {selected.code}.<br /><em>Cùng trao đổi.</em></> : <>Bắt đầu từ bạn.<br /><em>Cùng chọn lớp.</em></>}</h2><p>Chia sẻ nền tảng, mục tiêu và thời gian có thể học. Kiểm tra thông tin, sau đó sao chép để chủ động nhắn đội ngũ CSAT.</p>{selected && <div className={`enrollment-selected enrollment-${selected.code.toLowerCase()}`}><strong>Lớp {selected.code} · {selected.name}</strong><p>{selected.duration} · {selected.size}</p></div>}</div><PublicConsultation key={selectedCourse || 'undecided'} defaultCourse={selectedCourse} context={selected ? `${selected.code} — ${selected.name}` : undefined} /></div></section>
  </div>;
}
