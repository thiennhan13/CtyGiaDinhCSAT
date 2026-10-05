'use client';
import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';
const paths: Record<string, string[]> = {
    terminal: ['M5 4h33l5 5v35H5z', 'M5 14h38M11 9h2m4 0h2m4 0h2M13 23l7 6-7 6m12 0h10'],
    brackets: ['M16 6H8v14l-5 4 5 4v14h8m16-36h8v14l5 4-5 4v14h-8M28 13l-8 22'],
    branch: ['M12 7v25l9 9h15M12 23h16l8-8V7', 'M7 3h10v10H7zm24 0h10v10H31zm0 33h10v10H31z'],
    loop: ['M34 10H14L6 18v16l8 8h20l8-8V18l-8-8M25 3l9 7-9 7M23 35l-9 7 9 5'],
    array: ['M4 12h40v24H4zM17 12v24m14-24v24M9 20h3v8H9m13-8h4v8h-4m14-8h3v8h-3', 'M4 6h13m14 36h13'],
    graph: ['M12 12l24 4-12 22L12 12m0 0L5 33l19 5', 'M7 7h10v10H7zm24 4h10v10H31zM19 33h10v10H19zM1 29h8v8H1z'],
    search: ['M5 6h20l7 7v16l-7 7H12l-7-7zM31 32l13 13M12 15h13m-13 7h8'],
    pointers: ['M4 12h40v24H4zM16 12v24m16-24v24M9 4v5m30-5v5M8 42l8-5m24 5-8-5'],
    merge: ['M5 5h12v10H5zm26 0h12v10H31zM11 15v9l13 8 13-8v-9M18 33h12v11H18z'],
    knapsack: ['M16 12V5h16v7M10 12h28l5 31H5zM15 23h18v12H15zM21 23v12'],
    cube: ['M24 3 44 14v22L24 47 4 36V14zM4 14l20 11 20-11M24 25v22M14 9l20 11v12'],
    function: ['M5 4h38v40H5zM31 12h-8l-5 25M12 22h19M33 32l6 6m0-6-6 6'],
};
export function CodeIcon({ name, className = '' }: {
    name: string;
    className?: string;
}) {
    return <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={`code-icon ${className}`} aria-hidden="true" focusable="false">{(paths[name] || paths.terminal).map((d, i) => <path d={d} key={i}/>)}</svg>;
}
export function Reveal({ children, className = '', tone = 'blue', variant = 'wipe', delay = 0, id }: {
    children: ReactNode;
    className?: string;
    tone?: 'blue' | 'lime';
    variant?: 'wipe' | 'rise' | 'left' | 'right';
    delay?: number;
    id?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const media = matchMedia('(prefers-reduced-motion:reduce)');
        let timer: ReturnType<typeof setTimeout>;
        // Do not sweep a cover over content that was already visible at first paint.
        // Off-screen sections share one animation timeline for cover and content.
        if (media.matches || el.getBoundingClientRect().top < innerHeight) {
            el.classList.add('is-revealed');
            return;
        }
        el.classList.add('reveal-ready');
        const finish = () => { clearTimeout(timer); el.classList.remove('reveal-ready', 'reveal-play'); el.classList.add('is-revealed'); };
        const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) {
            el.classList.remove('reveal-ready');
            el.classList.add('is-revealed');
            if (!media.matches) {
                el.classList.add('reveal-play');
                timer = setTimeout(() => el.classList.remove('reveal-play'), 1050 + delay);
            }
            observer.disconnect();
        } }, { threshold: 0, rootMargin: '0px' });
        observer.observe(el);
        const change = () => { if (media.matches) finish(); };
        media.addEventListener('change', change);
        el.addEventListener('focusin', finish);
        return () => { observer.disconnect(); clearTimeout(timer); media.removeEventListener('change', change); el.removeEventListener('focusin', finish); };
    }, []);
    return <div id={id} ref={ref} className={`public-reveal ${className}`} data-reveal={tone} data-reveal-variant={variant} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}>{children}</div>;
}
/** Visual overlay only: original text, selection and accessible name stay intact. */
export function GlyphHeading({ as: Tag = 'h2', children, className = '' }: {
    as?: 'h1' | 'h2' | 'h3';
    children: ReactNode;
    className?: string;
}) {
    const ref = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        const el = ref.current;
        const api = CSS as typeof CSS & {
            highlights?: Map<string, unknown>;
        };
        const H = (window as unknown as {
            Highlight?: new (...r: Range[]) => unknown;
        }).Highlight;
        if (!el || !api.highlights || !H || !Intl.Segmenter)
            return;
        const fine = matchMedia('(hover:hover) and (pointer:fine)'), reduced = matchMedia('(prefers-reduced-motion:reduce)');
        const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' });
        const layer = document.createElement('div');
        layer.className = 'csat-glyph-layer';
        layer.setAttribute('aria-hidden', 'true');
        document.body.append(layer);
        const key = `csat-glyph-${crypto.randomUUID()}`;
        let raf = 0, started = 0, phaseStarted = 0, last = 0, units: HTMLElement[] = [], active = false;
        const stop = () => { cancelAnimationFrame(raf); api.highlights?.delete(key); layer.replaceChildren(); active = false; };
        const allowed = () => fine.matches && !reduced.matches && !document.hidden && !getSelection()?.toString();
        const animate = (now: number) => { if (!allowed() || now - started > 420) {
            stop();
            return;
        } const pool = '{}<>01+=[]'; units.forEach((u, i) => { u.textContent = pool[(Math.floor((now - phaseStarted) / (el.closest('.roadmap-experience') ? 88 : 80)) + i * 3) % pool.length]; }); raf = requestAnimationFrame(animate); };
        const move = (event: PointerEvent) => {
            if (event.pointerType !== 'mouse' || !allowed() || performance.now() - last < 35)
                return;
            const letters: {
                range: Range;
                rect: DOMRect;
                parent: Element;
            }[] = [];
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            let node: Node | null;
            while ((node = walker.nextNode())) {
                if (node.parentElement?.closest('svg,[aria-hidden=true]'))
                    continue;
                for (const part of segmenter.segment(node.textContent || '')) {
                    if (!part.segment.trim())
                        continue;
                    const range = new Range();
                    range.setStart(node, part.index);
                    range.setEnd(node, part.index + part.segment.length);
                    const rect = range.getBoundingClientRect();
                    if (rect.width && event.clientY >= rect.top - 4 && event.clientY <= rect.bottom + 4)
                        letters.push({ range, rect, parent: node.parentElement! });
                }
            }
            if (!letters.length)
                return;
            const nearest = letters.reduce((a, b) => Math.abs(a.rect.left + a.rect.width / 2 - event.clientX) < Math.abs(b.rect.left + b.rect.width / 2 - event.clientX) ? a : b);
            const line = letters.filter(l => Math.abs(l.rect.top - nearest.rect.top) < 3), index = line.indexOf(nearest), start = Math.max(0, Math.min(index - 3, line.length - 7)), selected = line.slice(start, start + 7);
            if (!active) phaseStarted = performance.now();
            stop();
            last = started = performance.now();
            active = true;
            api.highlights.set(key, new H(...selected.map(s => s.range)));
            layer.append(Object.assign(document.createElement('style'), { textContent: `::highlight(${key}){color:transparent;background-color:transparent}` }));
            const dark = document.documentElement.classList.contains('dark') || !!el.closest('.rm-advanced');
            const colors = dark ? ['#a9bdff', '#d9e64c', '#ffad8b'] : ['#2348db', '#687313', '#b7431a'];
            units = selected.map((s, i) => { const unit = document.createElement('span'), font = getComputedStyle(s.parent); unit.className = 'csat-glyph-unit'; Object.assign(unit.style, { left: s.rect.left + 'px', top: s.rect.top + 'px', width: s.rect.width + 'px', height: s.rect.height + 'px', fontSize: font.fontSize, fontWeight: font.fontWeight, lineHeight: s.rect.height + 'px', color: colors[i % 3] }); layer.append(unit); return unit; });
            raf = requestAnimationFrame(animate);
        };
        const leave = () => { if (active)
            stop(); };
        const selection = () => { if (getSelection()?.toString())
            stop(); };
        el.addEventListener('pointermove', move, { passive: true });
        el.addEventListener('pointerleave', leave);
        el.addEventListener('pointerdown', stop);
        const events = ['scroll', 'resize', 'blur', 'pagehide'];
        events.forEach(e => window.addEventListener(e, stop));
        document.addEventListener('visibilitychange', stop);
        document.addEventListener('selectionchange', selection);
        document.addEventListener('keydown', stop);
        reduced.addEventListener('change', stop);
        fine.addEventListener('change', stop);
        return () => { stop(); layer.remove(); el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.removeEventListener('pointerdown', stop); events.forEach(e => window.removeEventListener(e, stop)); document.removeEventListener('visibilitychange', stop); document.removeEventListener('selectionchange', selection); document.removeEventListener('keydown', stop); reduced.removeEventListener('change', stop); fine.removeEventListener('change', stop); };
    }, []);
    return <Tag ref={ref} className={className} data-glyph-hover>{children}</Tag>;
}
