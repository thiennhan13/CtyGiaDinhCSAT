'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { CodeIcon } from './CodeIcon';
import { GlyphHeading, Reveal } from './PublicMotion';
import { PublicSelect } from './PublicSelect';
import { PublicConsultation } from './PublicConsultation';
import { publicCourseCode } from '@/lib/public-courses';

const levels = { primary: 'Tiểu học', thcs: 'THCS', thpt: 'THPT' } as const;
const goals = { undecided: 'Khám phá, cần tư vấn', start: 'Bắt đầu học lập trình', thcs: 'HSG cấp THCS', specialist: 'Chuyên Tin', province: 'HSG tỉnh cấp THPT' } as const;
const backgrounds = { unsure: 'Chưa rõ, muốn trao đổi', new: 'Chưa học lập trình', syntax: 'Đang làm quen cú pháp', practice: 'Đã tự giải một số bài lập trình' } as const;
const courses = { A: 'Nhập môn lập trình', B: 'Lập trình thi đấu cơ bản', C: 'Lập trình thi đấu nâng cao', E: 'Chủ lực · Tuyển đầu vào', K: 'Kèm riêng' } as const;
type Selection = { level: keyof typeof levels | ''; goal: keyof typeof goals; background: keyof typeof backgrounds; course?: keyof typeof courses };
type Course = keyof typeof courses;
function allowed<T extends Record<string, string>>(map: T, value: string | null): keyof T | undefined {
  return value && Object.hasOwn(map, value) ? value as keyof T : undefined;
}
function readSelection(params: Pick<URLSearchParams, 'get'>): Selection {
  return { level: allowed(levels, params.get('level')) || '', goal: allowed(goals, params.get('goal')) || 'undecided', background: allowed(backgrounds, params.get('background')) || 'unsure', course: allowed(courses, params.get('course')) };
}
function queryFor(selection: Selection, course?: Course) {
  const query = new URLSearchParams();
  if (selection.level) query.set('level', selection.level);
  query.set('goal', selection.goal);
  query.set('background', selection.background);
  if (course || selection.course) query.set('course', course || selection.course!);
  return query.toString();
}
function coursePath(course: Course) { return `/lo-trinh/${course.toLowerCase()}`; }
function recommendation(selection: Selection): { title: string; description: string; choices: Course[] } {
  if (selection.background === 'new' || selection.goal === 'start') return { title: 'Làm quen với C++ từ lớp A.', description: 'Lớp A xây dựng nền tảng qua nhập, xuất dữ liệu, điều kiện và vòng lặp; tiếp đến là mảng, hàm và xâu. Cùng gia sư trao đổi về quá trình học trước khi chọn lớp tiếp theo.', choices: ['A'] };
  if (selection.background === 'syntax') return { title: 'Từ hiểu câu lệnh đến chọn cách giải.', description: 'Phần A giúp bạn nhìn lại mảng, hàm và xâu; phần B mở rộng sang số học, sắp xếp và tìm kiếm. Các bài bạn đã làm là cơ sở để cùng gia sư trao đổi phần nên học tiếp.', choices: ['A', 'B'] };
  if (selection.background === 'practice') return { title: 'Tìm hướng học từ những bài đã giải.', description: 'Xem các nhóm kiến thức của B và C để nhận ra phần đã quen và phần muốn tìm hiểu sâu hơn. Việc chọn lớp cần thêm trao đổi về cách bạn giải bài và mục tiêu đang theo đuổi.', choices: ['B', 'C'] };
  return { title: 'Khám phá chương trình, tìm điểm bắt đầu.', description: 'Bạn chưa cần tự chọn lớp ngay. Hãy xem nội dung A, B và C, ghi lại điều muốn học rồi cùng CSAT trao đổi một hướng đi phù hợp.', choices: ['A', 'B', 'C'] };
}

function useRoadmapState() {
  const [selection, setSelection] = useState<Selection>({ level: '', goal: 'undecided', background: 'unsure' });
  const [draft, setDraft] = useState<Selection>(selection);
  const [submitted, setSubmitted] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const serialized = queryFor(selection);
  useEffect(() => {
    function restore() {
      const params = new URLSearchParams(window.location.search);
      const next = readSelection(params);
      const clean = new URLSearchParams();
      if (params.get('level') && next.level) clean.set('level', next.level);
      if (allowed(goals, params.get('goal'))) clean.set('goal', next.goal);
      if (allowed(backgrounds, params.get('background'))) clean.set('background', next.background);
      if (next.course) clean.set('course', next.course);
      if (params.get('show') === '1') clean.set('show', '1');
      if (params.toString() !== clean.toString()) window.history.replaceState(null, '', `/lo-trinh${clean.size ? `?${clean}` : ''}${window.location.hash}`);
      setSelection(next);
      setDraft(next);
      setSubmitted(params.get('show') === '1');
    }
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams(queryFor(draft));
    query.set('show', '1');
    window.history.replaceState(null, '', `/lo-trinh?${query}${window.location.hash}`);
    setSelection(draft);
    setSubmitted(true);
    requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true }));
  }
  const result = recommendation(selection);
  const context = [selection.course ? `${selection.course} — ${courses[selection.course]}` : '', selection.level ? levels[selection.level] : '', goals[selection.goal], backgrounds[selection.background]].filter(Boolean).join(' · ');
  function href(course: Course) { return `${coursePath(course)}?${queryFor(selection, course)}`; }
  return { selection, draft, setDraft, submitted, resultRef, serialized, submit, result, context, href };
}
const RoadmapContext = createContext<ReturnType<typeof useRoadmapState> | null>(null);
function useRoadmapSelection() {
  const state = useContext(RoadmapContext);
  if (!state) throw new Error('Roadmap selection requires its provider');
  return state;
}
export function RoadmapSelectionProvider({ children }: { children: ReactNode }) {
  const state = useRoadmapState();
  return <RoadmapContext.Provider value={state}>{children}</RoadmapContext.Provider>;
}
export function RoadmapDetailsLink({ code, className, children }: { code: Course; className: string; children: ReactNode }) {
  const { href } = useRoadmapSelection();
  return <Link className={className} href={href(code)}>{children}</Link>;
}
export function RoadmapSelector() {
  const { draft, setDraft, submitted, resultRef, submit, result, href } = useRoadmapSelection();
  return <section className="rm-choose" id="chon-lo-trinh"><Reveal className="wrap rm-section-reveal" variant="rise">
      <div className="rm-chapter mono"><span>01 / CHỌN ĐIỂM BẮT ĐẦU</span><span aria-hidden="true">+</span></div>
      <div className="rm-selector rm-glass"><div className="rm-selector-copy"><p className="eyebrow">Lộ trình từ chính bạn</p><GlyphHeading>Mục tiêu của bạn.<br />Nền tảng <em>đã có.</em></GlyphHeading><p>Chọn cấp học, mục tiêu và những gì đã từng học. Từ đó, bạn có thể tìm hiểu vài hướng trước khi trao đổi cụ thể cùng gia sư.</p><CodeIcon name="branch" /><p className="rm-small">Gợi ý để tìm hiểu chương trình; việc chọn lớp cần trao đổi thêm.</p></div>
        <form className="rm-selector-form" onSubmit={submit}>
          <PublicSelect name="level" label={<span><b>01</b> Cấp học của bạn</span>} required value={draft.level} onValueChange={value => setDraft({ ...draft, level: allowed(levels, value) || '' })} options={[{ value: '', label: 'Chọn cấp học' }, ...Object.entries(levels).map(([value, label]) => ({ value, label }))]} />
          <PublicSelect name="goal" label={<span><b>02</b> Mục tiêu bạn quan tâm</span>} value={draft.goal} onValueChange={value => setDraft({ ...draft, goal: allowed(goals, value) || 'undecided' })} options={Object.entries(goals).map(([value, label]) => ({ value, label }))} />
          <PublicSelect name="background" label={<span><b>03</b> Bạn đã học đến đâu?</span>} value={draft.background} onValueChange={value => setDraft({ ...draft, background: allowed(backgrounds, value) || 'unsure' })} options={Object.entries(backgrounds).map(([value, label]) => ({ value, label }))} />
          <button className="btn" type="submit">Xem hướng học <ArrowRight aria-hidden="true" size={18} /></button>
        </form>
      </div>
      <div className="rm-result" ref={resultRef} tabIndex={-1} aria-live="polite" aria-atomic="true"><div><p className="eyebrow">Gợi ý ban đầu</p><h3>{submitted ? result.title : 'Bạn muốn bắt đầu từ đâu?'}</h3><p>{submitted ? result.description : 'Điền ba lựa chọn phía trên để xem gợi ý, hoặc khám phá từng nhóm kiến thức bên dưới. Bạn luôn có thể tìm hiểu lớp khác.'}</p></div><div className="rm-result-links">{(submitted ? result.choices : ['A', 'B', 'C'] as Course[]).map(course => <Link className="rm-result-course" key={course} href={href(course)}><b>{course}</b><span>{courses[course]}</span><ArrowUpRight aria-hidden="true" size={18} /></Link>)}{submitted && result.choices.length === 0 && <a className="rm-result-course" href="#tu-van"><b>↗</b><span>Chia sẻ mục tiêu với CSAT</span></a>}</div></div>
    </Reveal></section>;
}
export function RoadmapConsultation() {
  const { selection, serialized, context } = useRoadmapSelection();
  return <section className="rm-consult-section" id="tu-van"><Reveal className="wrap rm-section-reveal" variant="right"><div className="rm-chapter mono"><span>07 / CÙNG CHỌN BƯỚC TIẾP THEO</span><span>CSAT</span></div><div className="rm-consult-layout"><div><h2>Chọn bước tiếp theo.<br /><em>Cùng CSAT.</em></h2><p>Kể một chút về việc học của bạn: những bài đã làm, câu hỏi còn vướng và mục tiêu muốn theo đuổi. Đó là điểm khởi đầu để cùng đội ngũ trao đổi lộ trình.</p><div className="rm-consult-context"><span className="mono">NỘI DUNG QUAN TÂM</span><p>{context}</p></div><span className="rm-consult-symbol" aria-hidden="true"><CodeIcon name="brackets" />+</span></div><PublicConsultation kind="consultation" context={serialized ? context : undefined} defaultCourse={publicCourseCode(selection.course)} /></div></Reveal></section>;
}
