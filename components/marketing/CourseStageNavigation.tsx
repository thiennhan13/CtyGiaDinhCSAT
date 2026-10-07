'use client';
import { ArrowRight } from 'lucide-react';
import type { CSSProperties } from 'react';

/** Native anchor fallback; opening a selected disclosure needs no stored state. */
export function CourseStageNavigation({ stages }: { stages: { id: string; title: string }[] }) {
  return <nav aria-label="Đi tới chặng kiến thức"><ol className="rm-stage-map" style={{ '--stage-count': stages.length } as CSSProperties}>{stages.map((stage, index) => <li key={stage.id}><a href={`#${stage.id}`} onClick={() => { const target = document.getElementById(stage.id); if (target instanceof HTMLDetailsElement) target.open = true; }}><b>{String(index + 1).padStart(2, '0')}</b><span>{stage.title}</span></a>{index < stages.length - 1 && <ArrowRight className="rm-stage-direction" size={22} aria-hidden="true" />}</li>)}</ol></nav>;
}
