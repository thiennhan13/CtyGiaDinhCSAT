'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Code2, FileText, Lightbulb, MessageCircle, Plus, Route, Users, Video } from 'lucide-react';
import { CodeIcon, GlyphHeading, Reveal } from './PublicMotion';
import { PublicConsultation } from './PublicConsultation';
import { TutorHero, TutorTeam } from './TutorShowcase';
import { PracticeVideo } from './PracticeVideo';
import './home-experience.css';
const values = [
    ['thinking', 'branch', 'Nghĩ có trình tự', 'TỪ CÂU HỎI ĐẾN CÁCH GIẢI', 'Tách một bài toán lớn thành những việc nhỏ. Biết mình cần tìm gì trước khi bắt đầu viết chương trình.'],
    ['building', 'terminal', 'Tự tay làm được', 'BIẾN Ý TƯỞNG THÀNH CHƯƠNG TRÌNH', 'Đọc, thử và viết bằng chính đôi tay. Mỗi bài làm là một dịp vận dụng điều vừa học thay vì chỉ nhớ cú pháp.'],
    ['patience', 'loop', 'Bền bỉ thử lại', 'SAI MỘT LẦN, HIỂU THÊM MỘT CHÚT', 'Tìm nguyên nhân khi chương trình chưa đúng, sửa từng bước và thử lại. Lỗi sai trở thành điều để tìm hiểu.'],
    ['depth', 'search', 'Hiểu đến gốc', 'KHÔNG DỪNG Ở MỘT ĐÁP ÁN', 'Cùng gia sư lý giải vì sao một cách làm đúng, khi nào dùng được và có thể làm tốt hơn ở đâu.'],
] as const;
const courses = [
    ['A', 'brackets', 'Lớp 5–7 · Làm quen từ đầu', 'Nhập môn lập trình', 'Từ câu lệnh đầu tiên đến tự viết một chương trình. Xây nền C++ qua 9 chủ đề A01–A09.', 'Làm quen C++, dữ liệu và câu lệnh; luyện đọc đề, viết chương trình và kiểm tra kết quả theo từng chủ đề trong khung A.', '99.000'],
    ['B', 'array', 'Lớp 7–9 · Từ cú pháp đến cách giải', 'Lập trình thi đấu cơ bản', 'Kết nối kiến thức nền với bài toán thuật toán. Rèn cách phân tích và lựa chọn hướng giải qua khung B01–B15.', '15 chủ đề theo khung B đã duyệt, kết hợp lý thuyết và bài tập. Mục tiêu ôn luyện được trao đổi theo nền tảng hiện tại của người học.', '99.000'],
    ['C', 'graph', 'Đã có nền tảng · Đi sâu vào thuật toán', 'Lập trình thi đấu nâng cao', 'Mở rộng cách tiếp cận bài toán với nội dung C+D. Tìm hiểu hướng ôn HSG tỉnh, Chuyên Tin theo nền tảng và mục tiêu.', 'Khung kiến thức C+D của chương trình Nâng cao. Gia sư trao đổi nội dung, mức độ bài tập và mục tiêu phù hợp trước khi bắt đầu.', '109.000'],
] as const;
const lessonSteps = [
    { Icon: Video, title: 'Nhận học liệu, sẵn sàng vào lớp.', text: 'Gia sư gửi link Google Meet, contest bài tập và tài liệu lý thuyết để cả lớp cùng chuẩn bị.', caption: 'Học liệu đã sẵn sàng.', chip: 'SẴN SÀNG VÀO HỌC' },
    { Icon: Users, title: 'Có mặt. Kết nối. Bắt đầu.', text: 'Điểm danh đầu buổi, kiểm tra kết nối và sẵn sàng cho nội dung học hôm nay.', caption: 'Cả lớp cùng kết nối.', chip: 'ĐIỂM DANH ĐẦU BUỔI' },
    { Icon: Lightbulb, title: 'Hiểu ý tưởng trước khi viết code.', text: 'Gia sư giảng lý thuyết, phân tích ví dụ và cùng học sinh làm rõ cách tiếp cận bài toán.', caption: 'Hiểu ý tưởng trước.', chip: 'LÝ THUYẾT & VÍ DỤ' },
    { Icon: Code2, title: 'Đến lượt bạn tìm lời giải.', text: 'Tự làm bài tập trên CSATOJ, viết chương trình, nộp bài và kiểm tra kết quả.', caption: 'Tự tay viết lời giải.', chip: 'THỰC HÀNH TRÊN CSATOJ' },
    { Icon: MessageCircle, title: 'Cùng chữa bài, gỡ từng chỗ vướng.', text: 'Gia sư chữa bài, nhận xét cách làm và giải thích những điểm học sinh còn chưa rõ.', caption: 'Tháo gỡ từng chỗ vướng.', chip: 'CHỮA BÀI & NHẬN XÉT' },
    { Icon: BookOpen, title: 'Khép lại buổi học. Mở thêm một bước.', text: 'Nhận bản ghi và bài tập về nhà để xem lại, luyện thêm và chuẩn bị cho buổi tiếp theo.', caption: 'Luyện thêm sau buổi học.', chip: 'BẢN GHI & BÀI VỀ NHÀ' },
] as const;
function LearningValues() {
    const [active, setActive] = useState<string | null>('thinking');
    const [revealed, setRevealed] = useState(false);
    const bulb = useRef<HTMLSpanElement>(null), suppressed = useRef(false);
    useEffect(() => {
        if (!bulb.current)
            return;
        if (!('IntersectionObserver' in window)) {
            bulb.current.classList.add('is-revealed');
            return;
        }
        const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) {
            setRevealed(true);
            observer.disconnect();
        } }, { threshold: .35 });
        observer.observe(bulb.current);
        return () => observer.disconnect();
    }, []);
    return <section className="home-values section wrap" aria-labelledby="values-title"><div className="values-heading"><span ref={bulb} className={`values-bulb ${revealed ? 'is-revealed' : ''}`} aria-hidden="true"><Image src="/images/site/light-bulb.webp" width={480} height={720} alt=""/></span><p className="eyebrow">Không chỉ là những dòng code</p><h2 id="values-title">Một cách học.<br /><span className="muted">Nhiều điều mang theo.</span></h2><p>Qua mỗi bài toán, người học tập cách hiểu vấn đề, thử một hướng đi và tự kiểm tra lời giải.</p></div><div className="values-interaction is-enhanced" onKeyDown={event => { if (event.key === 'Escape') {
        setActive(null);
        suppressed.current = true;
    } }}><div className="value-tabs" aria-label="Khám phá giá trị học lập trình">{values.map(([key, icon, title], i) => <button key={key} type="button" className={`value-button ${active === key ? 'is-active' : ''}`} aria-expanded={active === key} aria-controls={`value-${key}`} onPointerEnter={event => { if (event.pointerType === 'mouse' && !suppressed.current)
        setActive(key); }} onPointerLeave={() => { suppressed.current = false; }} onFocus={event => { if (event.currentTarget.matches(':focus-visible'))
        setActive(key); }} onClick={() => { setActive(current => current === key ? null : key); suppressed.current = true; }}><span className="value-symbol"><CodeIcon name={icon}/><i aria-hidden="true"/></span><span>{title}</span><small className="mono">0{i + 1}</small></button>)}</div><div className="value-panels">{values.map(([key, , title, label, text]) => <div id={`value-${key}`} key={key} className="value-panel" hidden={active !== key}><h3 className="value-static-title">{title}</h3><span className="mono">{label}</span><p>{text}</p></div>)}</div></div></section>;
}
function LessonTimeline() {
    const [active, setActive] = useState(0);
    const host = useRef<HTMLDivElement>(null), steps = useRef<(HTMLLIElement | null)[]>([]);
    useEffect(() => {
        if (!host.current)
            return;
        const desktop = matchMedia('(min-width:901px)');
        let visible = false, frame = 0;
        const read = () => { frame = 0; if (!visible || document.hidden || !desktop.matches)
            return; const line = innerHeight * .45; let best = 0, distance = Infinity; steps.current.forEach((step, i) => { if (!step)
            return; const rect = step.getBoundingClientRect(), next = Math.abs(rect.top + Math.min(90, rect.height * .25) - line); if (next < distance) {
            distance = next;
            best = i;
        } }); setActive(best); };
        const queue = () => { if (!frame && visible && desktop.matches)
            frame = requestAnimationFrame(read); };
        const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); queue(); });
        observer.observe(host.current);
        window.addEventListener('scroll', queue, { passive: true });
        window.addEventListener('resize', queue, { passive: true });
        document.addEventListener('visibilitychange', queue);
        desktop.addEventListener('change', queue);
        return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); document.removeEventListener('visibilitychange', queue); desktop.removeEventListener('change', queue); };
    }, []);
    const selected = lessonSteps[active], Icon = selected.Icon;
    const choose = (i: number) => {
        setActive(i);
        const step = steps.current[i];
        if (!step) return;
        // Align with the same reading line used by the scroll observer.
        const rect = step.getBoundingClientRect();
        const top = scrollY + rect.top + Math.min(90, rect.height * .25) - innerHeight * .45;
        window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth' });
    };
    return <section className="home-lesson section" id="buoi-hoc" aria-labelledby="lesson-title"><div className="wrap"><div className="lesson-heading"><p className="eyebrow">Không chỉ nghe giảng</p><h2 id="lesson-title">Một buổi học CSAT<br />diễn ra thế nào?</h2><p>Hiểu kiến thức mới, tự làm bài và trao đổi đến khi rõ cách giải.</p></div><div ref={host} className="lesson-layout"><div className="lesson-stage-column"><div className="lesson-stage"><div className="lesson-stage-top"><span className="mono">MỘT BUỔI HỌC / CSAT</span><span className="lesson-counter mono">0{active + 1} / 06</span></div><div className="lesson-stage-art" aria-hidden="true"><span className="lesson-stage-orbit"/><span className="lesson-satellite satellite-code"><CodeIcon name="terminal"/></span><span className="lesson-satellite satellite-graph"><CodeIcon name="graph"/></span><span className="lesson-satellite satellite-loop"><CodeIcon name="loop"/></span><span className="lesson-main-icon" key={active}><Icon /></span><span className="lesson-mini-pixel p1"/><span className="lesson-mini-pixel p2"/><span className="lesson-mini-pixel p3"/><span className="lesson-stage-chip mono">{selected.chip}</span></div><div className="lesson-stage-caption"><span className="mono">0{active + 1}</span><strong>{selected.caption}</strong></div><div className="lesson-progress"><i style={{ width: `${(active + 1) / 6 * 100}%` }}/></div><div className="lesson-controls" aria-label="Chọn bước buổi học">{lessonSteps.map((step, i) => <button key={step.title} type="button" className={active === i ? 'is-active' : ''} aria-current={active === i ? 'step' : undefined} aria-label={`Đến bước ${i + 1}: ${step.title}`} onClick={() => choose(i)}>0{i + 1}</button>)}</div></div></div><ol className="lesson-steps">{lessonSteps.map((step, i) => <li ref={el => { steps.current[i] = el; }} className={`lesson-step ${active === i ? 'is-active' : ''}`} id={`buoc-${i + 1}`} key={step.title}><span className="lesson-number mono">0{i + 1}</span><div><span className="lesson-step-icon"><step.Icon aria-hidden="true"/></span><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></div></div></section>;
}
function OJPractice() {
    const [active, setActive] = useState(0);
    const items = [['search', 'Chọn bài', 'Đọc yêu cầu, dữ liệu vào và giới hạn của bài toán. Xác định điều cần tìm trước khi bắt đầu.'], ['terminal', 'Viết lời giải', 'Từ ý tưởng đến chương trình C++: thử ví dụ, viết mã và tự kiểm tra những trường hợp khác nhau.'], ['loop', 'Nhận kết quả', 'Nộp bài để hệ thống chấm, đối chiếu kết quả và xem lại cách làm. Cùng gia sư tìm chỗ còn vướng để luyện tiếp.']];
    return <div className="oj-practice"><div className="oj-tabs" aria-label="Các bước luyện bài trên CSATOJ">{items.map(([, title], i) => <button key={title} type="button" aria-pressed={active === i} aria-controls={`oj-practice-${i}`} className={active === i ? 'is-active' : ''} onClick={() => setActive(i)}>0{i + 1}<span>{title}</span></button>)}</div>{items.map(([icon, title, text], i) => <div className="oj-practice-panel" id={`oj-practice-${i}`} key={title} hidden={active !== i}><CodeIcon name={icon}/><h3>{title}</h3><p>{text}</p></div>)}</div>;
}
export function HomeExperience() {
    return <div className="home-page"><noscript><style>{'.csat-public .home-page .value-panel[hidden],.csat-public .home-page .oj-practice-panel[hidden]{display:block!important}.csat-public .home-page .value-tabs,.csat-public .home-page .oj-tabs,.csat-public .home-page .lesson-controls{display:none}.csat-public .home-page .value-static-title{display:block}.csat-public .home-page .values-bulb img{opacity:1;transform:none}.csat-public .home-page .values-bulb:before{opacity:0}'}</style></noscript>
    <TutorHero />
    <LearningValues />
    <TutorTeam />
    <section className="home-oj section" id="csatoj" aria-labelledby="oj-title"><div className="wrap oj-layout"><div className="oj-story"><div className="oj-brand-lockup"><Image src="/icon/csatoj-logo-compact.svg" width={180} height={65} alt="CSATOJ"/><p className="eyebrow">Không gian luyện tập</p></div><h2 id="oj-title">Học một điều mới.<br /><span>Thử ngay một bài.</span></h2><p className="oj-intro">Từ lý thuyết đến lời giải của riêng mình: chọn bài, viết chương trình và xem kết quả trên hệ thống chấm bài CSATOJ.</p><OJPractice /><a className="text-link" href="https://csatoj.vn" target="_blank" rel="noopener noreferrer">Khám phá CSATOJ <ArrowUpRight /></a><PracticeVideo /></div><div className="materials-card" id="nhan-tai-lieu"><div className="materials-top"><span className="materials-icon"><BookOpen aria-hidden="true"/></span><span className="mono">BẮT ĐẦU TỪ ĐIỀU CƠ BẢN</span></div><h3>Nhận tài liệu học<br /><span>miễn phí.</span></h3><p>Để lại nhu cầu của bạn. CSAT sẽ liên hệ để giới thiệu tài liệu phù hợp và cách luyện tập trên CSATOJ.</p><PublicConsultation kind="materials"/><p className="materials-note">Không tạo tài khoản CSATOJ. Tài liệu và cách nhận sẽ được đội ngũ gia sư trao đổi trực tiếp cùng phụ huynh &lt;3</p></div></div></section>
    <section className="home-courses section wrap" id="khoa-hoc" aria-labelledby="courses-title"><Reveal className="section-head" variant="left"><div><p className="eyebrow">Từ bước đầu đến mục tiêu xa hơn</p><h2 id="courses-title">Một nền tảng vững.<br />Nhiều hướng để đi.</h2></div><p className="courses-lead">Bắt đầu ở đâu phụ thuộc vào điều bạn đã học và mục tiêu phía trước. Cùng tìm khóa phù hợp, từng bước một.</p></Reveal><div className="course-list">{courses.map(([code, icon, eyebrow, title, body, detail, price]) => <Reveal className={`course-row course-${code.toLowerCase()}`} key={code} variant={code === "B" ? "right" : "left"}><div className="course-rank" aria-hidden="true"><span className="mono">KHÓA</span><b>{code}</b><i><CodeIcon name={icon}/></i></div><div className="course-info"><p className="eyebrow">{eyebrow}</p><h3>{title}</h3><p>{body}</p><details className="course-details"><summary>Học những gì? <Plus aria-hidden="true"/></summary><p>{detail}</p></details></div><div className="course-meta"><p className="course-price"><strong>{price}<small>đ</small></strong><span>/ buổi</span></p><p className="course-format"><span>90 phút</span><span>5–8 học sinh</span></p><Link className="btn secondary" href={`/lo-trinh/${code.toLowerCase()}`}>Tìm hiểu khóa {code} <ArrowUpRight /></Link></div></Reveal>)}</div><div className="course-specials"><article className="special-course"><span className="special-rank">E</span><div><p className="eyebrow">Hướng ôn luyện HSGQG</p><h3>PreVOI</h3><p>Trao đổi cùng đội ngũ gia sư về nền tảng hiện tại, định hướng ôn HSGQG, lịch học và học phí phù hợp.</p></div><Link href="/lo-trinh/e" aria-label="Tìm hiểu định hướng PreVOI"><ArrowUpRight /></Link></article><article className="special-course"><span className="special-rank">K</span><div><p className="eyebrow">1–1 hoặc nhóm đăng ký riêng</p><h3>Kèm riêng</h3><p>Tùy chỉnh lịch và nhịp học trong các chương trình đã được duyệt, theo nhu cầu của bạn.</p></div><Link href="/lo-trinh/k" aria-label="Tìm hiểu khóa Kèm riêng"><ArrowUpRight /></Link></article></div><div className="course-help"><p>Chưa rõ mình nên bắt đầu ở đâu?</p><Link className="text-link" href="/lo-trinh">Khám phá lộ trình học tập <ArrowRight /></Link></div></section>
    <LessonTimeline />
    <section className="home-parents section wrap" aria-labelledby="parents-title"><div className="parent-copy"><p className="eyebrow">Gia sư hướng dẫn · Phụ huynh đồng hành</p><h2 id="parents-title">Biết con đang học gì.<br /><span className="muted">Cùng con đi tiếp.</span></h2><p>Việc học không chỉ nằm trong một buổi Meet. Phụ huynh có thể theo dõi nhận xét của gia sư, nội dung học, lộ trình và học phí trên Portal.</p><Link className="btn" href="/login">Theo dõi quá trình học của con tại đây <ArrowUpRight /></Link></div><Reveal className="parent-map"><div className="parent-core"><span className="parent-core-icon"><Users aria-hidden="true"/></span><strong>Cùng hiểu.<br />Cùng đồng hành.</strong><span className="mono">CSAT PORTAL</span></div><div className="parent-node node-lessons"><Video aria-hidden="true"/><span>Buổi học</span></div><div className="parent-node node-reviews"><MessageCircle aria-hidden="true"/><span>Nhận xét gia sư</span></div><div className="parent-node node-roadmap"><Route aria-hidden="true"/><span>Lộ trình học tập</span></div><div className="parent-node node-fees"><FileText aria-hidden="true"/><span>Học phí rõ ràng</span></div><svg className="parent-connectors" viewBox="0 0 500 380" aria-hidden="true"><path d="M110 80 250 190M395 88 250 190M95 304 250 190M405 304 250 190"/></svg></Reveal></section>
    <section className="home-final section wrap" aria-labelledby="final-title"><Reveal className="final-inner" tone="lime"><span className="final-mark" aria-hidden="true">{'{ }'}</span><p className="eyebrow">Mỗi người có một điểm khởi đầu</p><h2 id="final-title">Bắt đầu từ<br /><span>chính bạn.</span></h2><p>Bạn đang học đến đâu, muốn hiểu thêm điều gì?<br />Cùng CSAT tìm một hướng đi phù hợp.</p><Link className="btn" href="/lo-trinh#tu-van">Chia sẻ mục tiêu với CSAT <ArrowUpRight /></Link><span className="final-pixel" aria-hidden="true"/></Reveal></section>
  </div>;
}
