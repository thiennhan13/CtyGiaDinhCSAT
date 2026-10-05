'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpen, Code2, FileText, Lightbulb, MessageCircle, Plus, Route, Users, Video } from 'lucide-react';
import { CodeIcon, Reveal } from './PublicMotion';
import { WhyCSAT } from './WhyCSAT';
import { TutorHero, TutorTeam } from './TutorShowcase';
import './home-experience.css';
const values = [
    ['thinking', 'branch', 'Rèn lập luận và phản biện', 'KIỂM TRA Ý TƯỞNG BẰNG LÝ LẼ', 'Tập hỏi vì sao một lời giải đúng, tìm trường hợp khiến nó sai và kiểm tra lại giả định. Mỗi bài toán là dịp diễn đạt suy nghĩ rõ ràng, có căn cứ.'],
    ['building', 'terminal', 'Tìm cách giải có hệ thống', 'TỪ VẤN ĐỀ ĐẾN THUẬT TOÁN', 'Học cách chia nhỏ vấn đề, nhận ra quy luật và xây dựng thuật toán. Từ một cách làm ban đầu, thử những phương án khác để hiểu đâu là lời giải phù hợp.'],
    ['depth', 'search', 'Hiểu tin học sau công nghệ', 'THÊM MỘT GÓC NHÌN VỀ THẾ GIỚI', 'Khám phá cách máy tính biểu diễn dữ liệu và thực hiện những chỉ dẫn chính xác. Tìm kiếm, sắp xếp và xử lý dữ liệu mở thêm góc nhìn về công nghệ quanh mình.'],
    ['patience', 'loop', 'Kiên trì học cùng bạn bè', 'THỬ, TRAO ĐỔI VÀ TIẾP TỤC', 'Tập tìm lỗi, sửa cách làm và tiếp tục khi bài toán còn khó. Trao đổi lời giải cùng bạn và gia sư giúp nhìn thấy nhiều cách tiếp cận, đồng thời học cách giải thích và lắng nghe.'],
] as const;
const courses = [
    ['A', 'brackets', 'Lớp 5–7 · Làm quen từ đầu', 'Nhập môn lập trình', 'Hiểu yêu cầu, chia nhỏ công việc và diễn đạt bằng C++. Từ 9 chủ đề đầu tiên, tập tự viết chương trình và kiểm tra lời giải.', 'Điều kiện giúp chọn việc cần làm, vòng lặp giúp xử lý công việc lặp lại; mảng, hàm và xâu mở rộng cách tổ chức dữ liệu. Qua ví dụ và bài luyện, học sinh tập hỏi vì sao chương trình đúng và còn trường hợp nào cần xét.', '99.000'],
    ['B', 'array', 'Lớp 7–9 · Từ cú pháp đến cách giải', 'Lập trình thi đấu cơ bản', 'Không chỉ viết được code: học cách tìm quy luật, chọn thuật toán và lý giải lời giải qua 15 chủ đề của khung B.', 'Số học, sắp xếp và tìm kiếm mở thêm cách khai thác dữ liệu. Những bài luyện là dịp so sánh các hướng giải, thử trường hợp biên và cân nhắc số thao tác khi dữ liệu tăng — các bước cụ thể của tư duy thuật toán.', '99.000'],
    ['C', 'graph', 'Đã có nền tảng · Đi sâu vào thuật toán', 'Lập trình thi đấu nâng cao', 'Kết nối cấu trúc dữ liệu và thuật toán để giải những bài nhiều bước. Cùng xét tính đúng và hiệu quả của cách làm.', 'Lớp C dùng đủ 19 chủ đề C+D đã duyệt. Gia sư cùng học sinh phân tích vai trò của từng kỹ thuật, điều kiện áp dụng và độ phức tạp; nội dung ôn luyện được trao đổi theo nền tảng và mục tiêu thực tế.', '109.000'],
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
    return <section className="home-values section wrap" aria-labelledby="values-title"><div className="values-heading"><span ref={bulb} className={`values-bulb ${revealed ? 'is-revealed' : ''}`} aria-hidden="true"><Image src="/images/site/light-bulb.webp" width={480} height={720} alt=""/></span><p className="eyebrow">Bốn lý do để bắt đầu</p><h2 id="values-title">Vì sao nên học<br /><span className="muted">lập trình thi đấu?</span></h2><p>Đọc một bài toán, tự tìm lời giải, rồi kiểm tra và trao đổi: từ những việc cụ thể ấy, người học có thêm cách suy nghĩ và nhìn nhận công nghệ.</p></div><div className="values-interaction is-enhanced" onKeyDown={event => { if (event.key === 'Escape') {
        setActive(null);
        suppressed.current = true;
    } }}><div className="value-tabs" aria-label="Bốn lý do học lập trình thi đấu">{values.map(([key, icon, title], i) => <button key={key} type="button" className={`value-button ${active === key ? 'is-active' : ''}`} aria-expanded={active === key} aria-controls={`value-${key}`} onPointerEnter={event => { if (event.pointerType === 'mouse' && !suppressed.current)
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
export function HomeExperience() {
    return <div className="home-page"><noscript><style>{'.csat-public .home-page .value-panel[hidden]{display:block!important}.csat-public .home-page .value-tabs,.csat-public .home-page .lesson-controls{display:none}.csat-public .home-page .value-static-title{display:block}.csat-public .home-page .values-bulb img{opacity:1;transform:none}.csat-public .home-page .values-bulb:before{opacity:0}'}</style></noscript>
    <TutorHero />
    <LearningValues />
    <TutorTeam />
    <WhyCSAT />
    <section className="home-courses section wrap" id="khoa-hoc" aria-labelledby="courses-title"><Reveal className="section-head" variant="left"><div><p className="eyebrow">Từ bước đầu đến mục tiêu xa hơn</p><h2 id="courses-title">Một nền tảng vững.<br />Nhiều hướng để đi.</h2></div><p className="courses-lead">Bắt đầu ở đâu phụ thuộc vào điều bạn đã học và mục tiêu phía trước. Cùng tìm khóa phù hợp, từng bước một.</p></Reveal><div className="course-list">{courses.map(([code, icon, eyebrow, title, body, detail, price]) => <Reveal className={`course-row course-${code.toLowerCase()}`} key={code} variant={code === "B" ? "right" : "left"}><div className="course-rank" aria-hidden="true"><span className="mono">KHÓA</span><b>{code}</b><i><CodeIcon name={icon}/></i></div><div className="course-info"><p className="eyebrow">{eyebrow}</p><h3>{title}</h3><p>{body}</p><details className="course-details"><summary>Học những gì? <Plus aria-hidden="true"/></summary><p>{detail}</p></details></div><div className="course-meta"><p className="course-price"><strong>{price}<small>đ</small></strong><span>/ buổi</span></p><p className="course-format"><span>90 phút</span><span>5–8 học sinh</span></p><Link className="btn secondary" href={`/lo-trinh/${code.toLowerCase()}`}>Tìm hiểu khóa {code} <ArrowUpRight /></Link></div></Reveal>)}</div><div className="course-specials"><article className="special-course"><span className="special-rank">E</span><div><p className="eyebrow">Tuyển đầu vào từ lớp C</p><h3>Chủ lực</h3><p>Đào sâu kiến thức để hướng đến thứ hạng cao tại HSG Tỉnh và tuyển sinh chuyên Tin. Nhóm 3–4 học sinh, mỗi buổi 2 giờ; lịch thống nhất cùng thành viên lớp.</p></div><Link href="/lo-trinh/e" aria-label="Tìm hiểu lớp E Chủ lực"><ArrowUpRight /></Link></article><article className="special-course"><span className="special-rank">K</span><div><p className="eyebrow">1–1 hoặc nhóm đăng ký riêng</p><h3>Kèm riêng</h3><p>Tùy chỉnh lịch và nhịp học trong các chương trình đã được duyệt, theo nhu cầu của bạn.</p></div><Link href="/lo-trinh/k" aria-label="Tìm hiểu khóa Kèm riêng"><ArrowUpRight /></Link></article></div><div className="course-help"><p>Chưa rõ mình nên bắt đầu ở đâu?</p><Link className="text-link" href="/lo-trinh">Khám phá lộ trình học tập <ArrowRight /></Link></div></section>
    <LessonTimeline />
    <section className="home-parents section wrap" aria-labelledby="parents-title"><div className="parent-copy"><p className="eyebrow">Gia sư hướng dẫn · Phụ huynh đồng hành</p><h2 id="parents-title">Biết con đang học gì.<br /><span className="muted">Cùng con đi tiếp.</span></h2><p>Việc học không chỉ nằm trong một buổi Meet. Phụ huynh có thể theo dõi nhận xét của gia sư, nội dung học, lộ trình và học phí trên Portal.</p><Link className="btn" href="/login">Theo dõi quá trình học của con tại đây <ArrowUpRight /></Link></div><Reveal className="parent-map" variant="rise"><div className="parent-map-blob" aria-hidden="true"/><span className="parent-map-label mono">MỘT LỘ TRÌNH · CÙNG ĐỒNG HÀNH</span><div className="parent-core"><span className="parent-core-icon"><Users aria-hidden="true"/></span><strong>Cùng hiểu.<br />Cùng đồng hành.</strong><span className="mono">CSAT PORTAL</span></div><div className="parent-node node-lessons"><Video aria-hidden="true"/><span>Buổi học<small>Nội dung & điểm danh</small></span></div><div className="parent-node node-reviews"><MessageCircle aria-hidden="true"/><span>Nhận xét gia sư<small>Ghi nhận việc học của con</small></span></div><div className="parent-node node-roadmap"><Route aria-hidden="true"/><span>Lộ trình học tập<small>Biết nội dung đang học</small></span></div><div className="parent-node node-fees"><FileText aria-hidden="true"/><span>Học phí rõ ràng<small>Theo dõi kỳ & thanh toán</small></span></div><svg className="parent-connectors" viewBox="0 0 500 380" aria-hidden="true"><path d="M110 80 250 190M395 88 250 190M95 304 250 190M405 304 250 190"/></svg><p className="parent-map-footnote">Nhận xét, buổi học và lộ trình<br />được kết nối trong cùng một cổng thông tin.</p></Reveal></section>
    <section className="home-final section wrap" aria-labelledby="final-title"><Reveal className="final-inner" tone="lime"><span className="final-mark" aria-hidden="true">{'{ }'}</span><p className="eyebrow">Mỗi người có một điểm khởi đầu</p><h2 id="final-title">Bắt đầu từ<br /><span>chính bạn.</span></h2><p>Bạn đang học đến đâu, muốn hiểu thêm điều gì?<br />Cùng CSAT tìm một hướng đi phù hợp.</p><Link className="btn" href="/lo-trinh#tu-van">Chia sẻ mục tiêu với CSAT <ArrowUpRight /></Link><span className="final-pixel" aria-hidden="true"/></Reveal></section>
  </div>;
}
