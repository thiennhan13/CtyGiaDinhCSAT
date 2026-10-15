'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { BookOpen, Code2, Lightbulb, MessageCircle, Users, Video } from 'lucide-react';
import { CodeIcon } from './CodeIcon';

const values = [
    ['thinking', 'branch', 'Rèn lập luận và phản biện', 'KIỂM TRA Ý TƯỞNG BẰNG LÝ LẼ', 'Tính đúng của một lời giải cần được bảo vệ bằng lập luận, kể cả ở những trường hợp chưa nhìn thấy. Khi tìm phản ví dụ và kiểm tra giả định, học sinh tập phân biệt điều có vẻ hợp lý với điều có đủ căn cứ. Việc giải thích vì sao chương trình đúng vì thế trở thành một cách thực hành tư duy phản biện trong từng bài toán.'],
    ['building', 'terminal', 'Tìm cách giải có hệ thống', 'TỪ VẤN ĐỀ ĐẾN THUẬT TOÁN', 'Giới hạn thời gian và bộ nhớ đặt ra câu hỏi: tổ chức cách giải thế nào để vừa đúng, vừa hiệu quả? Người học phải xác định dữ liệu cần dùng, chia vấn đề thành các bước và so sánh những phương án có thể thực hiện. Qua quá trình ấy, thuật toán trở thành công cụ để sắp xếp suy nghĩ và giải quyết vấn đề có phương pháp.'],
    ['depth', 'search', 'Hiểu tin học sau công nghệ', 'THÊM MỘT GÓC NHÌN VỀ THẾ GIỚI', 'Đằng sau thao tác tìm kiếm hay sắp xếp thông tin là cách biểu diễn dữ liệu và những quy tắc xử lý cụ thể. Tự xây dựng chương trình giúp học sinh tìm hiểu các cơ chế ấy bằng trải nghiệm, từ câu lệnh đến thuật toán. Góc nhìn về công nghệ nhờ đó có thêm chiều sâu: biết đặt câu hỏi về cách một hệ thống hoạt động và những giới hạn của nó.'],
    ['patience', 'loop', 'Kiên trì học cùng bạn bè', 'THỬ, TRAO ĐỔI VÀ TIẾP TỤC', 'Một lần nộp bài chưa đúng cung cấp dữ kiện để tìm lỗi, xem lại ý tưởng và lựa chọn bước thử tiếp theo. Khi trao đổi lời giải với bạn và gia sư, học sinh vừa tập trình bày lập luận, vừa học cách lắng nghe một hướng tiếp cận khác. Tiến bộ được nuôi dưỡng qua những lần điều chỉnh có chủ đích, cùng tinh thần tự học và trách nhiệm với việc học của mình.'],
] as const;
const lessonSteps = [
    { Icon: Video, title: 'Nhận học liệu, sẵn sàng vào lớp.', text: 'Gia sư gửi link Google Meet, contest bài tập và tài liệu lý thuyết để cả lớp cùng chuẩn bị.', caption: 'Học liệu đã sẵn sàng.', chip: 'SẴN SÀNG VÀO HỌC' },
    { Icon: Users, title: 'Có mặt. Kết nối. Bắt đầu.', text: 'Điểm danh đầu buổi, kiểm tra kết nối và sẵn sàng cho nội dung học hôm nay.', caption: 'Cả lớp cùng kết nối.', chip: 'ĐIỂM DANH ĐẦU BUỔI' },
    { Icon: Lightbulb, title: 'Hiểu ý tưởng trước khi viết code.', text: 'Gia sư giảng lý thuyết, phân tích ví dụ và cùng học sinh làm rõ cách tiếp cận bài toán.', caption: 'Hiểu ý tưởng trước.', chip: 'LÝ THUYẾT & VÍ DỤ' },
    { Icon: Code2, title: 'Đến lượt bạn tìm lời giải.', text: 'Tự làm bài tập trên CSATOJ, viết chương trình, nộp bài và kiểm tra kết quả.', caption: 'Tự tay viết lời giải.', chip: 'THỰC HÀNH TRÊN CSATOJ' },
    { Icon: MessageCircle, title: 'Cùng chữa bài, gỡ từng chỗ vướng.', text: 'Gia sư chữa bài, nhận xét cách làm và giải thích những điểm học sinh còn chưa rõ.', caption: 'Tháo gỡ từng chỗ vướng.', chip: 'CHỮA BÀI & NHẬN XÉT' },
    { Icon: BookOpen, title: 'Khép lại buổi học. Mở thêm một bước.', text: 'Nhận bản ghi và bài tập về nhà để xem lại, luyện thêm và chuẩn bị cho buổi tiếp theo.', caption: 'Luyện thêm sau buổi học.', chip: 'BẢN GHI & BÀI VỀ NHÀ' },
] as const;
export function LearningValues() {
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
    return <section className="home-values section wrap" aria-labelledby="values-title"><div className="values-heading"><div className="values-kicker"><span ref={bulb} className={`values-bulb ${revealed ? 'is-revealed' : ''}`} aria-hidden="true"><Image src="/images/site/light-bulb-small.webp" unoptimized width={156} height={234} sizes="(max-width:680px) 42px, 52px" alt=""/></span><p className="eyebrow">Bốn lý do để bắt đầu</p></div><h2 id="values-title">Vì sao nên học<br /><span className="muted">lập trình thi đấu?</span></h2><p>Mỗi bài toán đặt ra một yêu cầu rõ ràng: hiểu dữ kiện, xây dựng cách giải và kiểm chứng bằng chương trình. Giới hạn thời gian, bộ nhớ cùng các trường hợp thử khiến ý tưởng phải được xem xét cả về tính đúng lẫn hiệu quả. Qua tự luyện và trao đổi, học sinh có cơ hội hình thành thói quen học tập có căn cứ, biết kiểm tra và biết điều chỉnh.</p></div><div className="values-interaction is-enhanced" onKeyDown={event => { if (event.key === 'Escape') {
        setActive(null);
        suppressed.current = true;
    } }}><div className="value-tabs" aria-label="Bốn lý do học lập trình thi đấu">{values.map(([key, icon, title], i) => <button key={key} type="button" className={`value-button ${active === key ? 'is-active' : ''}`} aria-expanded={active === key} aria-controls={`value-${key}`} onPointerEnter={event => { if (event.pointerType === 'mouse' && !suppressed.current)
        setActive(key); }} onPointerLeave={() => { suppressed.current = false; }} onFocus={event => { if (event.currentTarget.matches(':focus-visible'))
        setActive(key); }} onClick={() => { setActive(current => current === key ? null : key); suppressed.current = true; }}><span className="value-symbol"><CodeIcon name={icon}/><i aria-hidden="true"/></span><span>{title}</span><small className="mono">0{i + 1}</small></button>)}</div><div className="value-panels">{values.map(([key, , title, label, text]) => <div id={`value-${key}`} key={key} className="value-panel" hidden={active !== key}><h3 className="value-static-title">{title}</h3><span className="mono">{label}</span><p>{text}</p></div>)}</div></div></section>;
}
export function LessonTimeline() {
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
