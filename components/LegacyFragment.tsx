'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import aliases from '@/lib/route-aliases.json';
export function LegacyFragment() {
  const path = usePathname();
  useEffect(() => {
    function restore() {
      const old = location.hash.slice(1);
      const section = /^muc-(\d+)-/.exec(old);
      const id = Object.hasOwn(aliases.anchors, old) ? aliases.anchors[old as keyof typeof aliases.anchors] : section && 'section-'+section[1];
      const target = id && document.getElementById(id);
      if (!target) return;
      history.replaceState(history.state, '', location.pathname + location.search + '#' + id);
      target.scrollIntoView();
    }
    restore();
    window.addEventListener('hashchange', restore);
    return () => window.removeEventListener('hashchange', restore);
  }, [path]);
  return null;
}
