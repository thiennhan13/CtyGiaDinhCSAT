'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { CodeIcon, GlyphHeading, Reveal } from './PublicMotion';
import { PublicSelect } from './PublicSelect';
import { PublicConsultation } from './PublicConsultation';

const levels = { primary: 'Tiểu học', thcs: 'THCS', thpt: 'THPT', university: 'Đại học' } as const;
const goals = { undecided: 'Khám phá, cần trao đổi thêm', start: 'Bắt đầu học lập trình', thcs: 'HSG cấp THCS', specialist: 'Chuyên Tin', province: 'HSG tỉnh cấp THPT', national: 'HSG Quốc gia' } as const;
const backgrounds = { unsure: 'Chưa rõ, muốn trao đổi', new: 'Chưa học lập trình', syntax: 'Đang làm quen cú pháp', practice: 'Đã tự giải một số bài lập trình' } as const;
const courses = { A: 'Nhập môn lập trình', B: 'Lập trình thi đấu cơ bản', AB: 'Khung Cơ bản A+B', C: 'Lập trình thi đấu nâng cao', E: 'Chủ lực · Tuyển đầu vào', K: 'Kèm riêng' } as const;
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
  if (selection.goal === 'national') return { title: 'Cùng trao đổi hướng ôn HSG Quốc gia.', description: 'Hãy chia sẻ nền tảng và quá trình luyện bài cùng đội ngũ CSAT để trao đổi hướng ôn luyện riêng. Việc lựa chọn hướng học cần trao đổi cụ thể, không xác định điều kiện đầu vào từ gợi ý này.', choices: [] };
  if (selection.level === 'university') return { title: 'Chọn nội dung từ nhu cầu học của bạn.', description: 'Bạn muốn củng cố kiến thức nào, hay đang vướng ở dạng bài nào? Chia sẻ cùng CSAT để trao đổi phạm vi nội dung và hình thức học phù hợp với mục tiêu của mình.', choices: [] };
  if (selection.background === 'new' || selection.goal === 'start') return { title: 'Làm quen với C++ từ lớp A.', description: 'Bắt đầu với nhập, xuất dữ liệu, điều kiện và vòng lặp; tiếp đến là mảng, hàm và xâu. Khung A+B giúp bạn hình dung cách những kiến thức đầu tiên được dùng trong các bài toán tiếp theo.', choices: ['A', 'AB'] };
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
  return <div className="roadmap-experience">
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
      <div className="rm-result" ref={resultRef} tabIndex={-1} aria-live="polite" aria-atomic="true"><div><p className="eyebrow">Gợi ý ban đầu</p><h3>{submitted ? result.title : 'Bạn muốn bắt đầu từ đâu?'}</h3><p>{submitted ? result.description : 'Điền ba lựa chọn phía trên để xem gợi ý, hoặc khám phá từng nhóm kiến thức bên dưới. Bạn luôn có thể tìm hiểu lớp khác.'}</p></div><div className="rm-result-links">{(submitted ? result.choices : ['AB', 'C'] as Course[]).map(course => <Link className="rm-result-course" key={course} href={href(course)}><b>{course === 'C' ? 'C+D' : course}</b><span>{courses[course]}</span><ArrowUpRight aria-hidden="true" size={18} /></Link>)}{submitted && result.choices.length === 0 && <a className="rm-result-course" href="#tu-van"><b>↗</b><span>Chia sẻ mục tiêu với CSAT</span></a>}</div></div>
    </div></section>

    <RoadmapAssembly />
    <section className="rm-foundation rm-class-section rm-class-a" id="lop-a" aria-label="Lớp A"><div className="wrap rm-chapter mono"><span>02 / LỚP A · NHẬP MÔN</span><span>9 CHỦ ĐỀ / 3 CHẶNG</span></div><div className="wrap rm-learning-layout"><Reveal className="rm-knowledge-visual" variant="left"><div className="rm-photo"><Image src="/images/site/basic-class.webp" alt="" width={960} height={640} sizes="(max-width: 800px) 90vw, 40vw" /></div><div className="rm-photo-code"><CodeIcon name="brackets"/><span className="mono">C++ · Rẽ nhánh · Vòng lặp</span></div><div className="rm-large-mark" aria-hidden="true">A</div></Reveal><Reveal className="rm-learning-copy" variant="right"><p className="eyebrow">NHẬP MÔN</p><GlyphHeading>Hiểu từng lệnh.<br/><em>Viết có ý tưởng.</em></GlyphHeading><p>Bắt đầu từ một yêu cầu, bạn xác định dữ liệu đầu vào, kết quả cần tìm và chia việc xử lý thành từng bước. Lớp A giới thiệu C++ qua nhập, xuất dữ liệu, kiểu dữ liệu, điều kiện và vòng lặp; tiếp đến là mảng, hàm và xâu. Khi luyện bài, việc thử chương trình, theo dõi từng bước và tìm lỗi giúp bạn kiểm tra xem câu lệnh có diễn đạt đúng ý tưởng của mình.</p><div className="rm-class-facts"><span>90 phút / buổi</span><span>5–8 học sinh</span><span>99.000đ / buổi</span></div><Link className="btn" href={href('A')}>Khám phá nội dung lớp A <ArrowRight aria-hidden="true" size={18}/></Link><p className="rm-small">Khung Cơ bản mặc định gồm A+B. <Link className="text-link" href={href('AB')}>Xem toàn bộ khung kiến thức <ArrowUpRight size={16}/></Link></p></Reveal></div></section>
    <section className="rm-foundation rm-class-section rm-class-b" id="lop-b" aria-label="Lớp B"><div className="wrap rm-chapter mono"><span>03 / LỚP B · THI ĐẤU CƠ BẢN</span><span>15 CHỦ ĐỀ / 4 CHẶNG</span></div><div className="wrap rm-learning-layout"><Reveal className="rm-knowledge-visual" variant="right"><div className="rm-photo"><Image src="/images/site/code4.webp" alt="" width={960} height={640} sizes="(max-width: 800px) 90vw, 40vw" /></div><div className="rm-photo-code"><CodeIcon name="search"/><span className="mono">Số học · Sắp xếp · Tìm kiếm</span></div><div className="rm-large-mark" aria-hidden="true">B</div></Reveal><Reveal className="rm-learning-copy" variant="left"><p className="eyebrow">THI ĐẤU CƠ BẢN</p><GlyphHeading>Nhận ra quy luật.<br/><em>Tìm thêm cách giải.</em></GlyphHeading><p>Cùng một bài toán có thể có nhiều cách giải. Lớp B bắt đầu từ vét cạn và thống kê, rồi khai thác tính chất số học, cách lưu dữ liệu, sắp xếp, tìm kiếm và xử lý xâu. Từ cách duyệt từng phương án, bạn tập nhận ra quy luật, so sánh lượng công việc của các lời giải và chọn cách phù hợp với dữ liệu. Thử các trường hợp khác nhau và tìm lỗi tiếp tục là phần cần thiết khi luyện bài.</p><div className="rm-class-facts"><span>90 phút / buổi</span><span>5–8 học sinh</span><span>99.000đ / buổi</span></div><Link className="btn" href={href('B')}>Khám phá nội dung lớp B <ArrowRight aria-hidden="true" size={18}/></Link><p className="rm-small">Khung Cơ bản mặc định gồm A+B. <Link className="text-link" href={href('AB')}>Xem toàn bộ khung kiến thức <ArrowUpRight size={16}/></Link></p></Reveal></div></section>
    <section className="rm-advanced rm-class-section" id="lop-c" aria-label="Lớp C — Lập trình thi đấu nâng cao"><div className="wrap rm-chapter mono"><span>04 / LỚP C</span><span>19 CHỦ ĐỀ / 6 CHẶNG</span></div><div className="wrap rm-advanced-layout"><Reveal variant="left"><p className="eyebrow">Lập trình thi đấu nâng cao</p><GlyphHeading>Phân tích sâu.<br /><em>Giải có cơ sở.</em></GlyphHeading><p>Khi dữ liệu lớn hoặc các lựa chọn phụ thuộc lẫn nhau, một ý tưởng cần được xem xét cả về tính đúng và độ phức tạp: số thao tác tăng ra sao khi dữ liệu tăng? Lớp C kết nối kỹ thuật mảng và cấu trúc dữ liệu với đệ quy, chia để trị, quay lui, tham lam, tìm kiếm trên đáp án và quy hoạch động. Qua 19 chủ đề C+D, trọng tâm là hiểu vì sao có thể dùng một phương pháp và khi nào cần cách khác.</p><div className="rm-advanced-topics">{[["array", "Cấu trúc dữ liệu"], ["pointers", "Hai con trỏ & cửa sổ trượt"], ["branch", "Tìm kiếm & quay lui"], ["merge", "Merge sort"], ["graph", "Quy hoạch động"], ["knapsack", "Knapsack 0/1"]].map(([icon, label]) => <span key={label}><CodeIcon name={icon} />{label}</span>)}</div><Link className="btn lime" href={href('C')}>Khám phá nội dung lớp C <ArrowRight aria-hidden="true" size={18} /></Link><p className="rm-small">Hãy mang theo những bài đã luyện và câu hỏi còn vướng để cùng gia sư trao đổi điểm bắt đầu.</p></Reveal><Reveal className="rm-code-window"><div className="rm-window-head mono"><span>MỘT BÀI TOÁN. NHIỀU GÓC NHÌN.</span><span aria-hidden="true">+ + +</span></div><Image src="/images/site/books.webp" alt="" width={960} height={640} sizes="(max-width: 800px) 90vw, 40vw" /><div className="rm-window-caption mono"><span>Ý TƯỞNG → THỬ NGHIỆM → ĐIỀU CHỈNH</span><CodeIcon name="loop" /></div></Reveal></div></section>
    <section className="rm-class-section rm-class-e" id="lop-e" aria-labelledby="class-e-title"><div className="wrap rm-chapter mono"><span>05 / LỚP E · CHỦ LỰC</span><span>TUYỂN ĐẦU VÀO TỪ LỚP C</span></div><div className="wrap rm-special-layout"><Reveal variant="left" className="rm-special-copy"><p className="eyebrow">Đào sâu kiến thức · Hướng đến thứ hạng cao</p><h2 id="class-e-title">Học sâu hơn.<br/><em>Theo đuổi mục tiêu.</em></h2><p>Từ nền tảng lớp C, lớp E dành cho học sinh muốn học kiến thức khó hơn và hướng đến thứ hạng cao tại kỳ thi HSG Tỉnh hoặc tuyển sinh chuyên Tin. Học sinh tham gia qua thi tuyển đầu vào riêng từ lớp C. Quá trình luyện bài và mục tiêu cụ thể là cơ sở để trao đổi cùng đội ngũ trước khi bắt đầu.</p><div className="rm-class-facts"><span>3–4 học sinh</span><span>2 giờ / buổi</span><span>Lịch theo thành viên lớp</span></div><Link className="btn" href={href('E')}>Tìm hiểu lớp Chủ lực <ArrowUpRight size={18}/></Link><p className="rm-small">Trao đổi cùng đội ngũ về thi tuyển đầu vào, nội dung học và học phí.</p></Reveal><Reveal variant="right" tone="lime" className="rm-special-visual"><Image src="/images/site/comp-program.webp" alt="" width={1100} height={733} sizes="(max-width: 800px) 90vw, 42vw"/><span className="rm-special-stamp"><CodeIcon name="graph"/><b>E</b><span>CHỦ LỰC</span></span></Reveal></div></section>
    <section className="rm-class-section rm-class-k" id="lop-k" aria-labelledby="class-k-title"><div className="wrap rm-chapter mono"><span>06 / LỚP K · KÈM RIÊNG</span><span>1–1 HOẶC NHÓM RIÊNG</span></div><div className="wrap rm-special-layout"><Reveal variant="right" className="rm-special-copy"><p className="eyebrow">Nội dung tùy chọn · Nhịp học của bạn</p><h2 id="class-k-title">Học điều cần học.<br/><em>Theo nhịp riêng.</em></h2><p>Một phần kiến thức cần củng cố, một dạng bài còn vướng hay thời gian học khác với lớp chung đều có thể là lý do chọn lớp K. Bạn học 1–1 hoặc cùng nhóm đăng ký riêng, chọn nội dung từ các chương trình đã được duyệt. Cùng gia sư xác định phần cần tập trung và nhịp học theo nhu cầu cụ thể.</p><div className="rm-class-facts"><span>1–1</span><span>Nhóm riêng</span><span>Nội dung tùy chọn</span></div><Link className="btn" href={href('K')}>Trao đổi về lớp K <ArrowUpRight size={18}/></Link><p className="rm-small">Cùng thống nhất phạm vi, thời gian và học phí trước khi bắt đầu.</p></Reveal><Reveal variant="left" className="rm-special-visual"><Image src="/images/site/git.webp" alt="" width={960} height={640} sizes="(max-width: 800px) 90vw, 42vw"/><span className="rm-special-stamp"><CodeIcon name="branch"/><b>K</b><span>NHỊP RIÊNG</span></span></Reveal></div></section>
    <section className="rm-consult-section" id="tu-van"><div className="wrap"><div className="rm-chapter mono"><span>07 / CÙNG CHỌN BƯỚC TIẾP THEO</span><span>CSAT</span></div><div className="rm-consult-layout"><div><GlyphHeading>Chọn bước tiếp theo.<br /><em>Cùng CSAT.</em></GlyphHeading><p>Kể một chút về việc học của bạn: những bài đã làm, câu hỏi còn vướng và mục tiêu muốn theo đuổi. Đó là điểm khởi đầu để cùng đội ngũ trao đổi lộ trình.</p><div className="rm-consult-context"><span className="mono">NỘI DUNG QUAN TÂM</span><p>{context}</p></div><span className="rm-consult-symbol" aria-hidden="true"><CodeIcon name="brackets" />+</span></div><PublicConsultation kind="consultation" context={serialized ? context : undefined} /></div></div></section>
  </div>;
}
