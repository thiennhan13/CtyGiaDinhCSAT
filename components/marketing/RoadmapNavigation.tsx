'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ArrowUpRight } from 'lucide-react';

const courses = [
  ['a', 'Nhập môn lập trình'],
  ['b', 'Thi đấu cơ bản'],
  ['c', 'Thi đấu nâng cao'],
  ['e', 'Chủ lực'],
  ['k', 'Kèm riêng'],
] as const;

export function RoadmapNavigation({ onNavigate }: { onNavigate: () => void }) {
  const path = usePathname();
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!disclosure.current?.contains(event.target as Node) && disclosure.current) disclosure.current.open = false;
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  const close = () => { if (disclosure.current) disclosure.current.open = false; onNavigate(); };
  return <details ref={disclosure} className="nav-roadmap" key={path}
    onPointerEnter={event => { if (event.pointerType === 'mouse' && matchMedia('(min-width:1281px) and (hover:hover)').matches) event.currentTarget.open = true; }}
    onPointerLeave={event => { if (!event.currentTarget.contains(document.activeElement)) event.currentTarget.open = false; }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false; }}
    onKeyDown={event => {
      if (event.key === 'Escape' && event.currentTarget.open) {
        event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus();
      }
    }}>
    <summary aria-current={path.startsWith('/lo-trinh') ? 'page' : undefined}>Lộ trình <ChevronDown size={14} aria-hidden="true" /></summary>
    <div className="nav-roadmap-panel">
      <Link href="/lo-trinh" aria-current={path === '/lo-trinh' ? 'page' : undefined} onClick={close}>Tìm hiểu lộ trình <ArrowUpRight size={16} aria-hidden="true" /></Link>
      {courses.map(([code, title]) => <Link key={code} href={`/lo-trinh/${code}`} aria-current={path === `/lo-trinh/${code}` ? 'page' : undefined} onClick={close}><span className="nav-course-code">{code.toUpperCase()}</span><span>{title}</span></Link>)}
    </div>
  </details>;
}
