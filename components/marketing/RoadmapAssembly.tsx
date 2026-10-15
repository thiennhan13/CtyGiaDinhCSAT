'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { CodeIcon } from './CodeIcon';

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

export function RoadmapAssembly() {
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
