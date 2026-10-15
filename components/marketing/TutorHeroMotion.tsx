'use client';
import { useEffect, useRef, type ReactNode } from 'react';

/** Own only the decorative motion; the hero and tutor facts render on the server. */
export function TutorHeroMotion({ children, label }: { children: ReactNode; label: string }) {
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
    return <section ref={home} className="home-hero wrap" aria-label={label}>{children}</section>;
}
