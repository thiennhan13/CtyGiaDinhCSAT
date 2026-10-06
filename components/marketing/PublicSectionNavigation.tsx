'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './public-section-navigation.css';

export function PublicSectionNavigation() {
  const path = usePathname();
  const sections = useRef<HTMLElement[]>([]);
  const [position, setPosition] = useState({ index: 0, count: 0 });
  const supported = path === '/dang-ky-hoc' || path.startsWith('/lo-trinh');
  useEffect(() => {
    if (!supported) { sections.current = []; setPosition({ index: 0, count: 0 }); return; }
    let frame: number | null = null;
    sections.current = Array.from(document.querySelectorAll<HTMLElement>('main > div > section, main > div > header'));
    const update = () => {
      frame = null;
      const clearance = (document.querySelector('.site-header')?.getBoundingClientRect().bottom || 100) + 24;
      let index = 0;
      sections.current.forEach((section, current) => { if (section.getBoundingClientRect().top <= clearance + 12) index = current; });
      setPosition(previous => previous.index === index && previous.count === sections.current.length ? previous : { index, count: sections.current.length });
    };
    const queue = () => { if (frame === null) frame = requestAnimationFrame(update); };
    queue();
    const observer = new ResizeObserver(queue);
    const main = document.querySelector('main');
    if (main) observer.observe(main);
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); if (frame !== null) cancelAnimationFrame(frame); };
  }, [path, supported]);
  function move(direction: -1 | 1) {
    const target = sections.current[position.index + direction];
    if (!target) return;
    const clearance = (document.querySelector('.site-header')?.getBoundingClientRect().bottom || 100) + 24;
    window.scrollTo({ top: Math.max(0, scrollY + target.getBoundingClientRect().top - clearance), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  if (!supported || position.count < 2) return null;
  return <nav className="public-section-jump" aria-label="Chuyển giữa các mục trên trang"><button type="button" aria-label="Mục trước" title="Mục trước" disabled={position.index === 0} onClick={() => move(-1)}><ChevronUp size={22} aria-hidden="true" /></button><button type="button" aria-label="Mục tiếp theo" title="Mục tiếp theo" disabled={position.index === position.count - 1} onClick={() => move(1)}><ChevronDown size={22} aria-hidden="true" /></button></nav>;
}
