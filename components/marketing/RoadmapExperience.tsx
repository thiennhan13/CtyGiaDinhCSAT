'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { CodeIcon, GlyphHeading, Reveal } from './PublicMotion';
import { PublicSelect } from './PublicSelect';
import { PublicConsultation } from './PublicConsultation';
import { RoadmapCourseSection } from './RoadmapCourseSection';
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

// Deliberately scattered, fixed starts avoid hydration shifts and resize jumps.
const assemblyIcons = [
  { name: 'terminal', x: 12, y: 28, r: -27, endX: 28, endY: 24 },
  { name: 'brackets', x: 35, y: 14, r: 19, endX: 50, endY: 24 },
  { name: 'array', x: 83, y: 19, r: -16, endX: 72, endY: 24 },
  { name: 'search', x: 23, y: 64, r: 32, endX: 28, endY: 50 },
  { name: 'graph', x: 61, y: 43, r: -23, endX: 50, endY: 50 },
  { name: 'branch', x: 89, y: 56, r: 28, endX: 72, endY: 50 },
  { name: 'loop', x: 11, y: 87, r: 14, endX: 28, endY: 76 },
  { name: 'brackets', x: 47, y: 82, r: -34, endX: 50, endY: 76 },
  { name: 'array', x: 76, y: 89, r: 21, endX: 72, endY: 76 },
];

function RoadmapAssembly() {
  const sceneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const plane = scene.querySelector<HTMLElement>('.rm-scatter')!;
    const icons = Array.from(scene.querySelectorAll<HTMLElement>('[data-assembly-icon]'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 801px)');
    let visible = false;
    let frame: number | null = null;
    let active = false;
    let geometry: { element: HTMLElement; x: number; y: number; rotation: number; index: number }[] = [];
    const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
    function measure() {
      const box = plane.getBoundingClientRect();
      scene!.dataset.animated = String(!reduced.matches);
      geometry = icons.map((element, index) => {
        const item = assemblyIcons[index];
        return { element, index, x: box.width * (item.endX - item.x) / 100, y: box.height * (item.endY - item.y) / 100, rotation: item.r };
      });
    }
    function place(progress: number) {
      geometry.forEach(({ element, x, y, rotation, index }) => {
        const offset = index % 3 * .035;
        const t = clamp((progress - offset) / (1 - offset));
        const smooth = t * t * (3 - 2 * t);
        const arc = Math.sin(Math.PI * t) * (index % 2 ? -1 : 1) * (desktop.matches ? 28 : 12);
        const dx = x * smooth + arc;
        const dy = y * smooth + arc * .45;
        element.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px),calc(-50% + ${dy.toFixed(1)}px)) rotate(${(rotation * (1 - smooth)).toFixed(1)}deg)`;
      });
    }
    function paint() {
      frame = null;
      if (!active) return;
      place(clamp((window.innerHeight * .82 - scene!.getBoundingClientRect().top) / Math.max(190, window.innerHeight * .6)));
    }
    function queue() { if (active && frame === null) frame = window.requestAnimationFrame(paint); }
    function sync() {
      active = visible && !document.hidden && !reduced.matches;
      window.removeEventListener('scroll', queue);
      if (active) window.addEventListener('scroll', queue, { passive: true });
      if (!active && frame !== null) { window.cancelAnimationFrame(frame); frame = null; }
      if (reduced.matches) icons.forEach(element => element.style.removeProperty('transform'));
      queue();
    }
    function resize() { measure(); sync(); }
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { rootMargin: '100px' });
    measure(); observer.observe(scene);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pageshow', resize);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', resize);
    desktop.addEventListener('change', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pageshow', resize);
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', resize);
      desktop.removeEventListener('change', resize);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);
  return <div className="wrap rm-assembly" ref={sceneRef} aria-hidden="true">
    <div className="rm-scatter">{assemblyIcons.map((item, index) => <i key={index} data-assembly-icon style={{ '--x': `${item.x}%`, '--y': `${item.y}%`, '--end-x': `${item.endX}%`, '--end-y': `${item.endY}%`, '--r': `${item.r}deg` } as CSSProperties}><CodeIcon name={item.name} /></i>)}</div>
  </div>;
}

export function RoadmapExperience() {
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
  return <div className="roadmap-experience roadmap-overview">
    <section className="rm-opening">
      <div className="wrap rm-hero">
        <Reveal variant="rise" className="rm-hero-heading"><p className="eyebrow">IDEA → CODE → SOLUTION</p><h1>Lộ trình học lập trình<br /><em>cùng CSAT Tutor</em></h1></Reveal>
        <Reveal variant="rise" className="rm-hero-art"><div className="rm-code-stage" aria-hidden="true"><span className="rm-css-motif rm-css-pixels"><i/><i/><i/><i/></span><span className="rm-css-motif rm-css-bracket"/><div className="rm-3d-frame"><span className="rm-3d-heading mono">IDEA → CODE → SOLUTION <span><i /><i /><i /></span></span><div className="rm-3d-screen"><span className="rm-3d-brackets">&lt;/&gt;</span><div className="rm-code-lines"><i /><i /><i /><i /></div><CodeIcon name="terminal" /></div><div className="rm-3d-base"><span /><span /><span /><span /><span /></div></div><span className="rm-orbit rm-orbit-a"><CodeIcon name="cube" /></span><span className="rm-orbit rm-orbit-b"><CodeIcon name="function" /></span><span className="rm-orbit rm-orbit-c"><CodeIcon name="merge" /></span></div></Reveal>
        <div className="rm-hero-mosaic" aria-hidden="true">
          {[['basic-class', 'CƠ BẢN'], ['books', 'NÂNG CAO'], ['comp-program', 'CHỦ LỰC'], ['code4', 'NHỊP RIÊNG']].map(([asset, label], index) => <div className={`rm-hero-tile rm-hero-tile-${index + 1}`} key={asset}><Image src={`/images/site/${asset}.webp`} alt="" fill sizes="(max-width: 800px) 44vw, 29vw" priority={index < 2} /><span className="mono">{label}</span></div>)}
          <span className="rm-hero-center"><CodeIcon name="brackets" /></span>
        </div>
      </div>
    </section>
    <section className="rm-choose" id="chon-lo-trinh"><div className="wrap">
      <div className="rm-chapter mono"><span>01 / CHỌN ĐIỂM BẮT ĐẦU</span><span aria-hidden="true">+</span></div>
      <div className="rm-selector rm-glass"><div className="rm-selector-copy"><p className="eyebrow">Lộ trình từ chính bạn</p><GlyphHeading>Mục tiêu của bạn.<br />Nền tảng <em>đã có.</em></GlyphHeading><p>Chọn cấp học, mục tiêu và những gì đã từng học. Từ đó, bạn có thể tìm hiểu vài hướng trước khi trao đổi cụ thể cùng gia sư.</p><CodeIcon name="branch" /><p className="rm-small">Gợi ý để tìm hiểu chương trình; việc chọn lớp cần trao đổi thêm.</p></div>
        <form className="rm-selector-form" onSubmit={submit}>
          <PublicSelect name="level" label={<span><b>01</b> Cấp học của bạn</span>} required value={draft.level} onValueChange={value => setDraft({ ...draft, level: allowed(levels, value) || '' })} options={[{ value: '', label: 'Chọn cấp học' }, ...Object.entries(levels).map(([value, label]) => ({ value, label }))]} />
          <PublicSelect name="goal" label={<span><b>02</b> Mục tiêu bạn quan tâm</span>} value={draft.goal} onValueChange={value => setDraft({ ...draft, goal: allowed(goals, value) || 'undecided' })} options={Object.entries(goals).map(([value, label]) => ({ value, label }))} />
          <PublicSelect name="background" label={<span><b>03</b> Bạn đã học đến đâu?</span>} value={draft.background} onValueChange={value => setDraft({ ...draft, background: allowed(backgrounds, value) || 'unsure' })} options={Object.entries(backgrounds).map(([value, label]) => ({ value, label }))} />
          <button className="btn" type="submit">Xem hướng học <ArrowRight aria-hidden="true" size={18} /></button>
        </form>
      </div>
      <div className="rm-result" ref={resultRef} tabIndex={-1} aria-live="polite" aria-atomic="true"><div><p className="eyebrow">Gợi ý ban đầu</p><h3>{submitted ? result.title : 'Bạn muốn bắt đầu từ đâu?'}</h3><p>{submitted ? result.description : 'Điền ba lựa chọn phía trên để xem gợi ý, hoặc khám phá từng nhóm kiến thức bên dưới. Bạn luôn có thể tìm hiểu lớp khác.'}</p></div><div className="rm-result-links">{(submitted ? result.choices : ['A', 'B', 'C'] as Course[]).map(course => <Link className="rm-result-course" key={course} href={href(course)}><b>{course === 'C' ? 'C+D' : course}</b><span>{courses[course]}</span><ArrowUpRight aria-hidden="true" size={18} /></Link>)}{submitted && result.choices.length === 0 && <a className="rm-result-course" href="#tu-van"><b>↗</b><span>Chia sẻ mục tiêu với CSAT</span></a>}</div></div>
    </div></section>

    <RoadmapAssembly />
    {(['A', 'B', 'C', 'E', 'K'] as const).map((code, index) => <RoadmapCourseSection key={code} code={code} chapter={String(index + 2).padStart(2, '0')} href={href(code)} />)}
    <section className="rm-consult-section" id="tu-van"><div className="wrap"><div className="rm-chapter mono"><span>07 / CÙNG CHỌN BƯỚC TIẾP THEO</span><span>CSAT</span></div><div className="rm-consult-layout"><div><GlyphHeading>Chọn bước tiếp theo.<br /><em>Cùng CSAT.</em></GlyphHeading><p>Kể một chút về việc học của bạn: những bài đã làm, câu hỏi còn vướng và mục tiêu muốn theo đuổi. Đó là điểm khởi đầu để cùng đội ngũ trao đổi lộ trình.</p><div className="rm-consult-context"><span className="mono">NỘI DUNG QUAN TÂM</span><p>{context}</p></div><span className="rm-consult-symbol" aria-hidden="true"><CodeIcon name="brackets" />+</span></div><PublicConsultation kind="consultation" context={serialized ? context : undefined} defaultCourse={publicCourseCode(selection.course)} /></div></div></section>
  </div>;
}
