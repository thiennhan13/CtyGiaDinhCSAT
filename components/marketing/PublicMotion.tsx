'use client';
import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';
export { CodeIcon } from './CodeIcon';
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
        if (media.matches || !('IntersectionObserver' in window)) {
            el.classList.add('is-revealed');
            return;
        }
        let first = true, finished = false;
        const finish = () => { finished = true; clearTimeout(timer); el.classList.remove('reveal-ready', 'reveal-play'); el.classList.add('is-revealed'); };
        const observer = new IntersectionObserver(entries => {
            const entry = entries[0];
            if (!entry || finished) return;
            // Use the browser's batched geometry instead of interleaving layout reads
            // and class writes across every Reveal during hydration.
            if (first) {
                first = false;
                if (entry.boundingClientRect.top < innerHeight) {
                    finish();
                    observer.disconnect();
                    return;
                }
                el.classList.add('reveal-ready');
            }
            if (entry.isIntersecting) {
                el.classList.remove('reveal-ready');
                el.classList.add('is-revealed');
                if (!media.matches) {
                    el.classList.add('reveal-play');
                    timer = setTimeout(() => el.classList.remove('reveal-play'), 1050 + delay);
                }
                observer.disconnect();
            }
        }, { threshold: 0, rootMargin: '0px' });
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
