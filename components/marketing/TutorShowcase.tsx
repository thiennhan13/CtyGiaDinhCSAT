'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Trophy } from 'lucide-react';
import { CodeIcon, GlyphHeading, Reveal } from './PublicMotion';
import './home-experience.css';
const tutors = [
    { name: 'Ngô Tuấn Hiệp', photo: 'tutor-tuan-hiep', awards: [['Giải Nhì HSGQG', '2025–2026'], ['Giải Nhất tỉnh Nghệ An', '2025–2026']] },
    { name: 'Trần Đăng Quang', photo: 'tutor-dang-quang', awards: [['Giải Nhì HSGQG', '2024–2025 và 2025–2026']] },
    { name: 'Nguyễn Ngọc Bảo Toàn', photo: 'tutor-bao-toan', awards: [['Giải Nhì HSGQG', '2025–2026'], ['Giải Ba HSGQG', '2024–2025']] },
] as const;

export function TutorHero({ teamPage = false }: { teamPage?: boolean }) {
    const home = useRef<HTMLElement>(null);
    useEffect(() => {
        const art = home.current?.querySelector<HTMLElement>('.hero-art');
        const orbit = art?.querySelector<HTMLElement>('.hero-orbit');
        const grid = art?.querySelector<HTMLElement>('.hero-art-grid');
        if (!art || !orbit || !grid)
            return;
        const pointer = matchMedia('(min-width:901px) and (hover:hover) and (pointer:fine)');
        const reduced = matchMedia('(prefers-reduced-motion:reduce)');
        let visible = false, listening = false, frame = 0;
        const reset = () => { orbit.style.removeProperty('translate'); grid.style.removeProperty('translate'); };
        const paint = () => {
            frame = 0;
            if (!listening)
                return;
            const rect = art.getBoundingClientRect();
            const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - rect.top - rect.height / 2) / (innerHeight / 2)));
            orbit.style.translate = '0 ' + Math.round(progress * 18) + 'px';
            grid.style.translate = '0 ' + Math.round(progress * -9) + 'px';
        };
        const queue = () => { if (listening && !frame)
            frame = requestAnimationFrame(paint); };
        const sync = () => {
            const enabled = visible && pointer.matches && !reduced.matches && !document.hidden;
            if (enabled !== listening) {
                listening = enabled;
                if (enabled)
                    window.addEventListener('scroll', queue, { passive: true });
                else {
                    window.removeEventListener('scroll', queue);
                    cancelAnimationFrame(frame);
                    frame = 0;
                    reset();
                }
            }
            queue();
        };
        const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); sync(); });
        observer.observe(art);
        pointer.addEventListener('change', sync);
        reduced.addEventListener('change', sync);
        window.addEventListener('resize', sync, { passive: true });
        document.addEventListener('visibilitychange', sync);
        return () => { observer.disconnect(); cancelAnimationFrame(frame); reset(); window.removeEventListener('scroll', queue); window.removeEventListener('resize', sync); document.removeEventListener('visibilitychange', sync); pointer.removeEventListener('change', sync); reduced.removeEventListener('change', sync); };
    }, []);
    return <section ref={home} className="home-hero wrap" aria-label={teamPage ? "Đội ngũ gia sư CSAT" : "Giới thiệu CSAT"}><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot" aria-hidden="true"/>{teamPage ? "Đội ngũ CSAT · Gia sư chuyên Phan" : "CSAT · Gia sư chuyên Phan"}</p><GlyphHeading as="h1">{teamPage ? "Cùng học Tin." : "Hiểu bài toán."}<br />{teamPage ? "Cùng tìm " : "Tự tìm "}<span className="hero-highlight">lời giải.<svg viewBox="0 0 350 20" aria-hidden="true"><path d="M4 14Q155 -5 345 8"/></svg></span></GlyphHeading><p className="hero-lead">{teamPage ? "Gia sư chuyên Phan, cùng bạn học lập trình." : "Lập trình thi đấu & Tư duy thuật toán."}</p><p className="hero-intro">{teamPage ? "CSAT được xây dựng bởi những cựu học sinh chuyên Tin Trường THPT Chuyên Phan Bội Châu. Từ kinh nghiệm học và luyện bài, gia sư cùng học sinh phân tích đề, lý giải cách làm và thử lại khi chương trình chưa đúng." : "CSAT cùng bạn học C++ từ cách phân tích bài toán, xây dựng lời giải đến viết chương trình và kiểm chứng kết quả. Đội ngũ gia sư là cựu học sinh chuyên Tin Trường THPT Chuyên Phan Bội Châu."}</p><div className="hero-actions"><Link className="btn" href="/lo-trinh">Tìm lộ trình của bạn <ArrowUpRight /></Link><a className="text-link" href={teamPage ? "#gia-su-csat" : "#khoa-hoc"}>{teamPage ? "Gặp đội ngũ CSAT" : "Khám phá khóa học"} <ArrowDown /></a></div><div className="hero-bottom"><span className="hero-code mono" aria-hidden="true">&lt;hiểu /&gt; → &lt;làm /&gt; → &lt;tiến bộ /&gt;</span><p>Học để hiểu.<br />Luyện để tự mình làm được.</p></div></div><Reveal className="hero-art" tone="lime"><div className="hero-art-grid" aria-hidden="true"/><div className="hero-orbit" aria-hidden="true"/><div className="hero-code-accents" aria-hidden="true">{["terminal", "branch", "array"].map(name => <span className="hero-code-accent" key={name}><CodeIcon name={name}/></span>)}</div><span className="hero-symbol hero-cpp" aria-hidden="true">C<span>++</span></span><span className="hero-star" aria-hidden="true">✳</span><div className="hero-portrait-window"><Image className="hero-portrait" src="/images/site/haidang.webp" width={1080} height={1620} alt="Gia sư Trần Hải Đăng" priority sizes="(max-width:680px) 90vw, 50vw"/></div><div className="hero-pixels" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i}/>)}</div><div className="hero-award"><Trophy aria-hidden="true"/><div><span className="mono">2025–2026</span><strong>Giải Nhất HSGQG</strong><span>Hạng 3 toàn quốc</span></div></div><div className="hero-name"><span className="hero-distinction">Thủ khoa khóa 52</span><strong>Trần Hải Đăng</strong><span>Chuyên Tin · THPT Chuyên Phan Bội Châu</span><span className="hero-award-history">Giải Nhì &amp; Giải Ba HSGQG · 2023–2025</span></div><span className="hero-bracket" aria-hidden="true">{' }'}</span></Reveal></section>;
}
export function TutorTeam() { return <section className="home-team section wrap" id="gia-su-csat" aria-labelledby="team-title"><Reveal className="team-heading" variant="rise"><p className="eyebrow">Đội ngũ gia sư CSAT</p><h2 id="team-title">Gia sư chuyên Phan.<br /><span className="muted">Cùng bạn học Tin.</span></h2><p>Cựu học sinh chuyên Tin Trường THPT Chuyên Phan Bội Châu cùng bạn phân tích bài toán, trao đổi chỗ chưa rõ và thử lại với một hướng tốt hơn.</p><div className="team-code-art" aria-hidden="true"><CodeIcon name="graph"/><span className="mono">HỎI · HIỂU · THỬ</span></div></Reveal><div className="team-gallery">{tutors.map((tutor, i) => <Reveal className={`team-profile team-profile-${i}`} key={tutor.name} variant={i % 2 ? "right" : "rise"} delay={i * 90}><figure><div className="team-poster"><Image src={`/images/site/${tutor.photo}.webp`} width={1080} height={1080} sizes="(max-width:680px) 90vw, (max-width:1000px) 30vw, 23vw" alt={`Poster giới thiệu gia sư ${tutor.name}`}/></div><figcaption><span className="eyebrow">Gia sư CSAT</span><h3>{tutor.name}</h3><ul>{tutor.awards.map(([title, year]) => <li key={title}><strong>{title}</strong><span>{year}</span></li>)}</ul></figcaption></figure></Reveal>)}</div></section>; }
