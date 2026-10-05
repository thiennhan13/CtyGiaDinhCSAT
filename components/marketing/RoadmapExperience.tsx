'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import { CodeIcon, GlyphHeading, Reveal } from './PublicMotion';
import { PublicSelect } from './PublicSelect';
import { PublicConsultation } from './PublicConsultation';

const levels = { primary: 'Tiểu học', thcs: 'THCS', thpt: 'THPT', university: 'Đại học' } as const;
const goals = { undecided: 'Khám phá, cần trao đổi thêm', start: 'Bắt đầu học lập trình', thcs: 'HSG cấp THCS', specialist: 'Chuyên Tin', province: 'HSG tỉnh cấp THPT', national: 'HSG Quốc gia' } as const;
const backgrounds = { unsure: 'Chưa rõ, muốn trao đổi', new: 'Chưa học lập trình', syntax: 'Đang làm quen cú pháp', practice: 'Đã tự giải một số bài lập trình' } as const;
const courses = { A: 'Nhập môn lập trình', B: 'Lập trình thi đấu cơ bản', AB: 'Khung Cơ bản A+B', C: 'Lập trình thi đấu nâng cao', E: 'PreVOI · HSG Quốc gia', K: 'Kèm riêng' } as const;
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
function coursePath(course: Course) { return course === 'AB' ? '/lo-trinh/co-ban' : `/lo-trinh/${course.toLowerCase()}`; }
function recommendation(selection: Selection): { title: string; description: string; choices: Course[] } {
  if (selection.goal === 'national') return { title: 'PreVOI — hướng học cho mục tiêu HSG Quốc gia.', description: 'Bạn có thể tìm hiểu lớp E, rồi chia sẻ những nội dung đã học và bài toán đang luyện. Đội ngũ CSAT sẽ cùng bạn trao đổi hướng ôn luyện trước khi lựa chọn lớp.', choices: ['E'] };
  if (selection.level === 'university') return { title: 'Chọn nội dung từ nhu cầu học của bạn.', description: 'Bạn muốn củng cố kiến thức nào, hay đang vướng ở dạng bài nào? Chia sẻ cùng CSAT để trao đổi phạm vi nội dung và hình thức học phù hợp với mục tiêu của mình.', choices: [] };
  if (selection.background === 'new' || selection.goal === 'start') return { title: 'Làm quen với C++ từ lớp A.', description: 'Bắt đầu với nhập, xuất dữ liệu, điều kiện và vòng lặp; tiếp đến là mảng, hàm và xâu. Khung A+B giúp bạn hình dung cách những kiến thức đầu tiên được dùng trong các bài toán tiếp theo.', choices: ['A', 'AB'] };
  if (selection.background === 'syntax') return { title: 'Từ hiểu câu lệnh đến chọn cách giải.', description: 'Phần A giúp bạn nhìn lại mảng, hàm và xâu; phần B mở rộng sang số học, sắp xếp và tìm kiếm. Các bài bạn đã làm là cơ sở để cùng gia sư trao đổi phần nên học tiếp.', choices: ['A', 'B'] };
  if (selection.background === 'practice') return { title: 'Tìm hướng học từ những bài đã giải.', description: 'Xem các nhóm kiến thức của B và C để nhận ra phần đã quen và phần muốn tìm hiểu sâu hơn. Việc chọn lớp cần thêm trao đổi về cách bạn giải bài và mục tiêu đang theo đuổi.', choices: ['B', 'C'] };
  return { title: 'Khám phá chương trình, tìm điểm bắt đầu.', description: 'Bạn chưa cần tự chọn lớp ngay. Hãy xem nội dung A, B và C, ghi lại điều muốn học rồi cùng CSAT trao đổi một hướng đi phù hợp.', choices: ['A', 'B', 'C'] };
}

const assemblyIcons = [
  { name: 'terminal', to: 'A', x: 8, y: 12, r: -12 }, { name: 'brackets', to: 'A', x: 24, y: 34, r: 8 },
  { name: 'array', to: 'B', x: 42, y: 8, r: -6 }, { name: 'search', to: 'B', x: 59, y: 30, r: 12 },
  { name: 'graph', to: 'C', x: 79, y: 12, r: 10 }, { name: 'branch', to: 'C', x: 93, y: 36, r: -9 },
  { name: 'loop', to: 'A', x: 4, y: 65, r: 7 }, { name: 'brackets', to: 'B', x: 51, y: 65, r: -12 },
  { name: 'array', to: 'C', x: 96, y: 69, r: 10 },
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
      const slots: Record<string, number> = { A: 0, B: 0, C: 0 };
      geometry = icons.map((element, index) => {
        const target = element.dataset.to!;
        const node = scene!.querySelector<HTMLElement>(`[data-route-node="${target}"]`)!.getBoundingClientRect();
        const item = assemblyIcons[index];
        const slot = slots[target]++;
        return { element, index, x: node.left - box.left + node.width * (.25 + slot * .22) - box.width * item.x / 100, y: node.top - box.top - 105 - slot % 2 * 12 - box.height * item.y / 100, rotation: item.r };
      });
    }
    function place(progress: number) {
      geometry.forEach(({ element, x, y, rotation, index }) => {
        const offset = index % 3 * .035;
        const t = clamp((progress - offset) / (1 - offset));
        const smooth = t * t * (3 - 2 * t);
        const dx = (desktop.matches ? x : clamp(x, -18, 18)) * smooth;
        const dy = (desktop.matches ? y : clamp(y, -18, 18)) * smooth;
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
  return <div className="wrap rm-assembly" ref={sceneRef}>
    <div className="rm-scatter" aria-hidden="true">{assemblyIcons.map((item, index) => <i key={index} data-assembly-icon data-to={item.to} style={{ '--x': `${item.x}%`, '--y': `${item.y}%`, '--r': `${item.r}deg` } as CSSProperties}><CodeIcon name={item.name} /></i>)}</div>
    <div className="rm-assembly-caption mono"><span>KIẾN THỨC RỜI RẠC → TƯ DUY KẾT NỐI</span><span>01 — 03</span></div>
    <div className="rm-route-nodes">{[
      ['A', 'BẮT ĐẦU', 'Diễn đạt ý tưởng bằng C++', 'C++ · Điều kiện · Vòng lặp'],
      ['B', 'XÂY NỀN', 'Khai thác dữ liệu để giải bài', 'Số học · Sắp xếp · Tìm kiếm'],
      ['C', 'HỌC SÂU', 'Phân tích và lựa chọn thuật toán', 'Cấu trúc dữ liệu · Thuật toán'],
    ].map(([code, label, title, topics]) => <Link key={code} className={`rm-node rm-node-${code.toLowerCase()}`} href={`/lo-trinh/${code.toLowerCase()}`} data-route-node={code}><span className="mono">{label}</span><b>{code}</b><strong>{title}</strong><span>{topics}</span><ArrowUpRight aria-hidden="true" /></Link>)}</div>
    <p className="rm-assembly-note">Mỗi nhóm kiến thức mở thêm cách tiếp cận bài toán. Bạn có thể bắt đầu ở phần phù hợp với những gì đã học.</p>
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
  return <div className="roadmap-experience">
    <section className="rm-opening">
      <div className="wrap rm-hero">
        <div className="rm-hero-copy"><p className="eyebrow">Lộ trình học tập / CSAT</p><GlyphHeading as="h1">Từ dòng lệnh<br />đầu tiên đến<br /><em>tư duy<br />thuật toán.</em></GlyphHeading><p>Lập trình thi đấu bắt đầu từ việc đọc hiểu đề, tìm quy luật và diễn đạt cách giải bằng chương trình. Cùng CSAT học C++, luyện bài và kết nối từng nhóm kiến thức với tư duy thuật toán.</p><a className="text-link" href="#chon-lo-trinh">Tìm điểm bắt đầu <ArrowDown aria-hidden="true" size={18} /></a></div>
        <div className="rm-hero-mosaic" aria-hidden="true">
          {[['basic-class', 'CƠ BẢN'], ['books', 'NÂNG CAO'], ['comp-program', 'PREVOI'], ['code4', 'NHỊP RIÊNG']].map(([asset, label], index) => <div className={`rm-hero-tile rm-hero-tile-${index + 1}`} key={asset}><Image src={`/images/site/${asset}.webp`} alt="" fill sizes="(max-width: 800px) 44vw, 29vw" priority={index < 2} /><span className="mono">{label}</span></div>)}
          <span className="rm-hero-center"><CodeIcon name="brackets" /></span>
        </div>
      </div>
      <RoadmapAssembly />
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
      <div className="rm-result" ref={resultRef} tabIndex={-1} aria-live="polite" aria-atomic="true"><div><p className="eyebrow">Gợi ý ban đầu</p><h3>{submitted ? result.title : 'Bạn muốn bắt đầu từ đâu?'}</h3><p>{submitted ? result.description : 'Điền ba lựa chọn phía trên để xem gợi ý, hoặc khám phá từng nhóm kiến thức bên dưới. Bạn luôn có thể tìm hiểu lớp khác.'}</p></div><div className="rm-result-links">{(submitted ? result.choices : ['AB', 'C'] as Course[]).map(course => <Link className="rm-result-course" key={course} href={href(course)}><b>{course === 'C' ? 'C+D' : course}</b><span>{courses[course]}</span><ArrowUpRight aria-hidden="true" size={18} /></Link>)}{submitted && result.choices.length === 0 && <a className="rm-result-course" href="#tu-van"><b>↗</b><span>Chia sẻ mục tiêu với CSAT</span></a>}</div></div>
    </div></section>
    <section className="rm-code-interlude"><Reveal variant="rise" className="wrap rm-interlude-heading"><p className="eyebrow">IDEA → CODE → SOLUTION</p><h2>Lộ trình học lập trình<br /><em>cùng CSAT Tutor</em></h2></Reveal><div className="wrap rm-code-stage" aria-hidden="true"><span className="rm-css-motif rm-css-pixels"><i/><i/><i/><i/></span><span className="rm-css-motif rm-css-bracket"/><div className="rm-3d-frame"><span className="rm-3d-heading mono">IDEA → CODE → SOLUTION <span><i /><i /><i /></span></span><div className="rm-3d-screen"><span className="rm-3d-brackets">&lt;/&gt;</span><div className="rm-code-lines"><i /><i /><i /><i /></div><CodeIcon name="terminal" /></div><div className="rm-3d-base"><span /><span /><span /><span /><span /></div></div><span className="rm-orbit rm-orbit-a"><CodeIcon name="cube" /></span><span className="rm-orbit rm-orbit-b"><CodeIcon name="function" /></span><span className="rm-orbit rm-orbit-c"><CodeIcon name="merge" /></span></div></section>
    <section className="rm-foundation"><div className="wrap rm-chapter mono"><span>02 / CƠ BẢN · A + B</span><span>24 CHỦ ĐỀ / 7 CHẶNG</span></div><div className="wrap rm-learning-layout">
      <Reveal className="rm-knowledge-visual"><div className="rm-photo"><Image src="/images/site/basic-class.webp" alt="" width={960} height={640} sizes="(max-width: 800px) 90vw, 40vw" /></div><div className="rm-photo-code"><CodeIcon name="terminal" /><span className="mono">TỪ Ý TƯỞNG<br />THÀNH CHƯƠNG TRÌNH</span></div><div className="rm-large-mark" aria-hidden="true">A<span>+</span>B</div></Reveal>
      <div className="rm-learning-copy"><p className="eyebrow">Từ cú pháp C++ đến những cách giải đầu tiên</p><GlyphHeading>Hiểu câu lệnh.<br /><em>Tìm lời giải.</em></GlyphHeading><p>Ở phần A, bạn làm quen cách diễn đạt một yêu cầu bằng C++. Sang phần B, những thao tác trên dữ liệu được kết nối với số học, sắp xếp và tìm kiếm để xây dựng lời giải. Khung Cơ bản mặc định gồm A+B; từng phần có thể được xem riêng để tìm nội dung cần củng cố.</p><div className="rm-topic-list"><Link href={href('A')}><span className="rm-topic-icon"><CodeIcon name="brackets" /></span><div><span className="mono">A / NHẬP MÔN · 9 CHỦ ĐỀ</span><h3>Diễn đạt ý tưởng bằng C++</h3><p>Một bài toán nhận dữ liệu gì, xử lý ra sao và cần trả về kết quả nào? Qua 9 chủ đề, bạn tìm hiểu nhập, xuất dữ liệu, rẽ nhánh và vòng lặp; sau đó tổ chức dãy, bảng bằng mảng, chia chương trình thành hàm và xử lý xâu cơ bản.</p></div><ArrowUpRight aria-hidden="true" /></Link><Link href={href('B')}><span className="rm-topic-icon"><CodeIcon name="search" /></span><div><span className="mono">B / THI ĐẤU CƠ BẢN · 15 CHỦ ĐỀ</span><h3>Tìm quy luật, chọn cách xử lý</h3><p>Bắt đầu từ vét cạn và thống kê, phần B đưa bạn đến tính chất số học, vector, pair, struct và map. Sắp xếp, chặt nhị phân và xử lý xâu bổ sung những cách khai thác dữ liệu, thay vì chỉ xét từng trường hợp.</p></div><ArrowUpRight aria-hidden="true" /></Link></div><Link className="btn" href={href('AB')}>Khám phá toàn bộ A+B <ArrowRight aria-hidden="true" size={18} /></Link></div>
    </div></section>
    <section className="rm-advanced"><div className="wrap rm-chapter mono"><span>03 / LỚP C</span><span>19 CHỦ ĐỀ / 6 CHẶNG</span></div><div className="wrap rm-advanced-layout"><div><p className="eyebrow">Lập trình thi đấu nâng cao</p><GlyphHeading>Phân tích sâu.<br /><em>Giải có cơ sở.</em></GlyphHeading><p>Khi số lượng dữ liệu lớn hơn hoặc các lựa chọn phụ thuộc lẫn nhau, cách tổ chức lời giải trở nên quan trọng. Lớp C kết nối tiền xử lý mảng và cấu trúc dữ liệu với đệ quy, chia để trị, quay lui, tham lam và tìm kiếm trên đáp án; tiếp đó là xây dựng trạng thái quy hoạch động. Toàn bộ 19 chủ đề C+D tạo thành khung Nâng cao.</p><div className="rm-advanced-topics">{[["array", "Cấu trúc dữ liệu"], ["pointers", "Hai con trỏ & cửa sổ trượt"], ["branch", "Tìm kiếm & quay lui"], ["merge", "Merge sort"], ["graph", "Quy hoạch động"], ["knapsack", "Knapsack 0/1"]].map(([icon, label]) => <span key={label}><CodeIcon name={icon} />{label}</span>)}</div><Link className="btn lime" href={href('C')}>Khám phá nội dung lớp C <ArrowRight aria-hidden="true" size={18} /></Link><p className="rm-small">Hãy mang theo những bài đã luyện và câu hỏi còn vướng để cùng gia sư trao đổi điểm bắt đầu.</p></div><Reveal className="rm-code-window"><div className="rm-window-head mono"><span>MỘT BÀI TOÁN. NHIỀU GÓC NHÌN.</span><span aria-hidden="true">+ + +</span></div><Image src="/images/site/books.webp" alt="" width={960} height={640} sizes="(max-width: 800px) 90vw, 40vw" /><div className="rm-window-caption mono"><span>Ý TƯỞNG → THỬ NGHIỆM → ĐIỀU CHỈNH</span><CodeIcon name="loop" /></div></Reveal></div></section>
    <section className="rm-next"><div className="wrap"><div className="rm-chapter mono"><span>04 / MỞ THÊM HƯỚNG ĐI</span><span aria-hidden="true">↗</span></div><div className="rm-next-heading"><h2>Đào sâu hơn.<br />Hay chọn <em>nhịp riêng?</em></h2><p>Mục tiêu thi Quốc gia và nhu cầu học riêng cần những trao đổi khác nhau. E và K mở hai hướng để bạn cùng gia sư lựa chọn nội dung, hình thức và nhịp học.</p><div className="rm-glass-blob rm-glass-blob-a" aria-hidden="true" /><div className="rm-glass-blob rm-glass-blob-b" aria-hidden="true" /></div><div className="rm-branches"><svg className="rm-branch-connector" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true"><path d="M500 0V24L250 56V80M500 24L750 56V80" /></svg><Reveal className="rm-branch-e" tone="lime"><article><div className="rm-branch-top"><span className="rm-branch-letter">E</span><span className="mono">PREVOI / HSG QUỐC GIA</span><CodeIcon name="graph" /></div><h3>PreVOI.<br />Hướng tới HSG Quốc gia.</h3><p>Với mục tiêu HSG Quốc gia Tin học, điều cần trao đổi không chỉ là tên thuật toán đã biết, mà còn là cách bạn phân tích và giải bài. Chia sẻ quá trình luyện tập cùng đội ngũ CSAT để tìm hiểu hướng ôn luyện PreVOI.</p><p className="rm-branch-note">Nội dung ôn luyện, nền tảng cần có, lịch học và học phí được trao đổi trực tiếp cùng đội ngũ.</p><Image className="rm-branch-photo" src="/images/site/comp-program.webp" alt="" width={1100} height={733} sizes="(max-width: 800px) 85vw, 40vw" /><Link className="text-link" href={href('E')}>Tìm hiểu lớp E <ArrowUpRight aria-hidden="true" size={18} /></Link></article></Reveal><Reveal className="rm-branch-k"><article><div className="rm-branch-top"><span className="rm-branch-letter">K</span><span className="mono">TÙY CHỌN / NHỊP RIÊNG</span><CodeIcon name="branch" /></div><h3>Học điều cần học.<br />Theo nhịp của bạn.</h3><p>Có lúc bạn cần hệ thống lại một phần kiến thức, có lúc muốn dành thêm thời gian cho dạng bài đang vướng. Lớp K tổ chức học 1–1 hoặc nhóm đăng ký riêng, cùng gia sư chọn nội dung từ các chương trình đã được duyệt theo nhu cầu học tập.</p><div className="rm-k-options"><span>1–1</span><span>Nhóm riêng</span><span>Nội dung tùy chọn</span></div><Image className="rm-branch-photo" src="/images/site/git.webp" alt="" width={960} height={640} sizes="(max-width: 800px) 85vw, 40vw" /><Link className="text-link" href={href('K')}>Tìm hiểu lớp K <ArrowUpRight aria-hidden="true" size={18} /></Link></article></Reveal></div></div></section>
    <section className="rm-consult-section" id="tu-van"><div className="wrap"><div className="rm-chapter mono"><span>05 / CÙNG CHỌN BƯỚC TIẾP THEO</span><span>CSAT</span></div><div className="rm-consult-layout"><div><GlyphHeading>Chọn bước tiếp theo.<br /><em>Cùng CSAT.</em></GlyphHeading><p>Kể một chút về việc học của bạn: những bài đã làm, câu hỏi còn vướng và mục tiêu muốn theo đuổi. Đó là điểm khởi đầu để cùng đội ngũ trao đổi lộ trình.</p><div className="rm-consult-context"><span className="mono">NỘI DUNG QUAN TÂM</span><p>{context}</p></div><span className="rm-consult-symbol" aria-hidden="true"><CodeIcon name="brackets" />+</span></div><PublicConsultation kind="consultation" context={serialized ? context : undefined} /></div></div></section>
  </div>;
}
