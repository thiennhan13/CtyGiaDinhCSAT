'use client';
import { useEffect } from 'react';
export function PublicFeedback() {
    useEffect(() => {
        const reduced = matchMedia('(prefers-reduced-motion:reduce)'), active = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
        let variant = crypto.getRandomValues(new Uint32Array(1))[0] % 3;
        const clear = () => { active.forEach((timer, el) => { clearTimeout(timer); el.remove(); }); active.clear(); };
        const click = (event: MouseEvent) => {
            if (reduced.matches || document.hidden)
                return;
            const target = (event.target as Element).closest<HTMLElement>('.csat-public .btn,.csat-public .nav-links a,.csat-public .icon-btn');
            if (!target || target.matches(':disabled'))
                return;
            const box = target.getBoundingClientRect(), el = document.createElement('span');
            el.className = `csat-click-feedback variant-${variant}`;
            variant = (variant + 1) % 3;
            el.setAttribute('aria-hidden', 'true');
            el.style.left = (event.detail ? event.clientX : box.left + box.width / 2) + 'px';
            el.style.top = (event.detail ? event.clientY : box.top + box.height / 2) + 'px';
            for (let i = 0; i < 3; i++) {
                const pixel = document.createElement('i');
                pixel.style.setProperty('--i', String(i));
                el.append(pixel);
            }
            document.body.append(el);
            active.set(el, setTimeout(() => { el.remove(); active.delete(el); }, 280));
        };
        document.addEventListener('click', click);
        document.addEventListener('visibilitychange', clear);
        reduced.addEventListener('change', clear);
        return () => { clear(); document.removeEventListener('click', click); document.removeEventListener('visibilitychange', clear); reduced.removeEventListener('change', clear); };
    }, []);
    return null;
}
