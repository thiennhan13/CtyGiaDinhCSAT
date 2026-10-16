'use client';

import { useEffect, useRef } from 'react';
import { selfStudyMarkup } from '@/lib/self-study-markup';
import { mountSelfStudyRoadmap } from '@/lib/self-study-runtime';

export function SelfStudyRoadmap() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (root.current) return mountSelfStudyRoadmap(root.current);
  }, []);

  return <div ref={root} className="self-study-roadmap" dangerouslySetInnerHTML={{ __html: selfStudyMarkup }} />;
}
