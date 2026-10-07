import curriculum from '@/lib/learning-curriculum-20260922.json';
import { publicRoadmapContent, roadmapLessonContent, roadmapStageContent } from '@/lib/public-roadmap-content';
import { CourseStageNavigation } from './CourseStageNavigation';
import Link from 'next/link';
import { ArrowUpRight, BrainCircuit, ListChecks, Code2, Route } from 'lucide-react';
import { publicCourseOutcomes } from '@/lib/public-course-outcomes';

type RoadmapCode = keyof typeof publicRoadmapContent;
type Stage = (typeof curriculum)[number]['stages'][number];

export function CourseOutcomes({ code }: { code: RoadmapCode }) {
  const content = publicCourseOutcomes[code];
  const aims = [
    { title: 'Tư duy bài toán', text: content.thinking, Icon: BrainCircuit },
    { title: 'Dạng bài vận dụng', text: content.problems, Icon: ListChecks },
    { title: 'Thuật toán & mức độ', text: content.methods, Icon: Code2 },
    { title: 'Nền tảng để đi tiếp', text: content.next, Icon: Route },
  ];
  return <section className="wrap rm-course-outcomes" id="muc-tieu-cuoi-khoa" aria-labelledby="outcomes-title">
    <div className="rm-outcomes-heading"><div><p className="eyebrow">Điểm đến của hành trình / {code}</p><h2 id="outcomes-title">Mục tiêu cuối khoá</h2></div><p>Quá trình học hướng đến sự tiến bộ trong cách suy nghĩ, lựa chọn phương pháp và tự kiểm tra lời giải — để mỗi kiến thức trở thành một công cụ có thể vận dụng.</p></div>
    <ol>{aims.map(({ title, text, Icon }, index) => <li key={title}><div className="rm-outcome-marker"><span>{String(index + 1).padStart(2, '0')}</span><Icon size={26} aria-hidden="true" /></div><h3>{title}</h3><p>{text}</p></li>)}</ol>
    <Link className="text-link" href={content.href}>{content.linkLabel}<ArrowUpRight size={18} aria-hidden="true" /></Link>
  </section>;
}

export function CoursePathway({ code }: { code: RoadmapCode }) {
  const content = publicRoadmapContent[code];
  return <section className="wrap rm-detail-pathway" aria-labelledby="development-title"><p className="eyebrow">Định hướng phát triển / {code}</p><h2 id="development-title">{content.tagline}</h2><ol className="rm-pathway-grid">{content.pathway.map((step, index) => <li key={step.title}><p className="eyebrow">0{index + 1} / {step.label}</p><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol></section>;
}

export function CourseCurriculum({ code, stages }: { code: RoadmapCode; stages: Stage[] }) {
  const count = stages.reduce((sum, stage) => sum + stage.lessons.length, 0);
  return <section className="rm-course-curriculum"><div className="wrap"><div className="rm-chapter mono"><span>NỘI DUNG HỌC TẬP / {code}</span><span>{count} CHỦ ĐỀ / {stages.length} CHẶNG</span></div><div className="rm-curriculum-heading"><h2>Kiến thức có trình tự.<br /><em>Tư duy có chiều sâu.</em></h2><p>Từ nhận biết cấu trúc bài toán đến xây dựng và kiểm tra lời giải. Mỗi chặng nối kiến thức với một trọng tâm tư duy; các chủ đề bên dưới cho thấy cách tiếp cận và kỹ năng được rèn luyện.</p></div><CourseStageNavigation stages={stages.map(stage => ({ id: stage.id, title: stage.title }))} /><div className="rm-curriculum-stages">{stages.map((stage, index) => {
    const editorial = roadmapStageContent[stage.id];
    return <details className="rm-curriculum-stage" id={stage.id} key={stage.id} open={index === 0}><summary><span className="rm-stage-index mono">{String(index + 1).padStart(2, '0')} / {code}</span><span><strong>{stage.title}</strong><small>{stage.lessons.length} chủ đề · {stage.lessons[0].code}–{stage.lessons.at(-1)!.code}</small></span><span className="rm-stage-toggle" aria-hidden="true">+</span></summary><div className="rm-stage-body"><p>{editorial.description}</p><div className="rm-stage-skills"><h3>Trọng tâm tư duy</h3><ul className="rm-focus-tags">{editorial.skills.map(skill => <li key={skill}>{skill}</li>)}</ul><p>{editorial.bridge}</p></div><ol>{stage.lessons.map(lesson => {
      const text = roadmapLessonContent[lesson.code];
      return <li key={lesson.code}><span className="mono">{lesson.code}</span><div><h3>{lesson.title}</h3>{lesson.description && <ul className="rm-focus-tags" aria-label={`Nội dung ${lesson.code}`}>{lesson.description.split(',').map(tag => <li key={tag}>{tag.trim()}</li>)}</ul>}<p>{text.purpose}</p><p>{text.approach}</p><p className="rm-lesson-skill"><strong>Kỹ năng rèn luyện: </strong>{text.skill}</p></div></li>;
    })}</ol></div></details>;
  })}</div></div></section>;
}

export function CourseSpecialDirection({ code }: { code: 'E' | 'K' }) {
  const content = publicRoadmapContent[code];
  return <section className="wrap rm-special-content rm-detail-special"><p className="eyebrow">{code === 'E' ? 'Chiều sâu kiến thức · Chuyên Tin · Lập trình thi đấu' : 'Phạm vi rõ ràng · Nhịp học phù hợp'}</p><h2>{code === 'E' ? 'Tri thức, đồng đội và cơ hội thử sức.' : 'Một trọng tâm học tập, một hướng tiến bộ.'}</h2><p>{content.overview}</p><ul className="rm-focus-tags">{content.focusTags.map(tag => <li key={tag}>{tag}</li>)}</ul>{content.development && <ol className="rm-pathway-grid">{content.development.map((direction, index) => <li key={direction.title}><p className="eyebrow">0{index + 1} / {direction.label}</p><h3>{direction.title}</h3><p>{direction.description}</p>{direction.tags && <ul className="rm-focus-tags">{direction.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>}</li>)}</ol>}</section>;
}
