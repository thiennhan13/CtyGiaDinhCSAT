'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, BookOpen, ExternalLink, Minus, Plus, Scan, X } from 'lucide-react';
import type { LearningBody, LearningTemplate } from '@/lib/learning';
import { PROGRAMS } from '@/lib/learning';
import { effectiveStages } from '@/lib/curriculum';
import type { ParentCurriculumProgress } from '@/lib/parent-curriculum-progress';
import { getReviewTag } from '@/lib/student-reviews';
import dependencies from '@/lib/knowledge-map-links.json';
import { layoutRoadmap, renderRoadmapSvg, type RoadmapNode } from '@/lib/roadmap-graph';
import './parent-knowledge-map.css';

interface Props {
 body: LearningBody;
 template?: LearningTemplate | null;
 progress: ParentCurriculumProgress;
 canonical?: boolean;
 articleLinks?: Record<string, string>;
 practiceLinks?: Record<string, string>;
}

/** Receives only the published, effective curriculum and authorized actions from its server caller. */
export function ParentKnowledgeMap({body, template, progress, canonical = false, articleLinks = {}, practiceLinks = {}}: Props) {
 const prefix = 'parent-map-' + useId().replace(/:/g, '') + '-';
 const viewport = useRef<HTMLDivElement>(null);
 const drawer = useRef<HTMLDialogElement>(null);
 const detailHeading = useRef<HTMLHeadingElement>(null);
 const returnFocus = useRef<SVGElement | null>(null);
 const manualScale = useRef(false);
 const [scale, setScale] = useState(1);
 const [selected, setSelected] = useState<string | null>(null);
 const stages = effectiveStages(template, body);
 const current = stages.find(stage => stage.originalIndex === progress.stage?.originalIndex);
 const graph = useMemo(() => {
  const effective = effectiveStages(template, body);
  const linked = dependencies as Record<string, {prerequisites: string[]}>;
  const usedIds = new Set<string>();
  const records = effective.flatMap(stage => stage.lessons.map((lesson, index) => {
   // Custom templates may reuse a code in different stages; DOM ids must stay unique.
   const base = lesson.code ?? `P${stage.originalIndex + 1}-${index + 1}`;
   const id = usedIds.has(base) ? `${base}-${stage.originalIndex + 1}-${index + 1}` : base;
   usedIds.add(id);
   return {id, stage, lesson};
  }));
  const nodes: RoadmapNode[] = records.map(record => ({
   id: record.id, title: record.lesson.title,
   group: record.stage.id ?? `stage-${record.stage.originalIndex}`,
   prerequisites: canonical ? linked[record.id]?.prerequisites ?? [] : [],
   foot: 'Xem nội dung ↗',
  }));
  const groups = effective.map((stage, index) => ({
   id: stage.id ?? `stage-${stage.originalIndex}`,
   title: `CHẶNG ${String(index + 1).padStart(2, '0')} / ${stage.title}${stage.originalIndex === progress.stage?.originalIndex ? (progress.preparing ? ' · CHUẨN BỊ' : ' · ĐANG TẬP TRUNG') : ''}`,
   current: stage.originalIndex === progress.stage?.originalIndex,
  }));
  return {records, nodes, groups, layout: layoutRoadmap(nodes, groups), svg: renderRoadmapSvg(nodes, groups, {idPrefix: prefix})};
 }, [template, body, canonical, progress.stage?.originalIndex, progress.preparing, prefix]);
 const detail = graph.records.find(record => record.id === selected);
 useEffect(() => {if (selected) detailHeading.current?.focus({preventScroll: true});}, [selected]);
 useEffect(() => {
  const region = viewport.current;
  if (!region) return;
  // Narrow stages share the full graph's centerline; keep that line visible on phones.
  const center = () => {region.scrollLeft = Math.max(0, (graph.layout.width * scale - region.clientWidth) / 2);};
  center();
  const observer = new ResizeObserver(() => {
   // Default framing fits one full card (including its shadow), without restricting manual zoom.
   if (!manualScale.current) setScale(Math.min(1, Math.max(.35, (region.clientWidth - 28) / 242)));
   center();
  });
  observer.observe(region);
  return () => observer.disconnect();
 }, [graph.layout.width, scale]);
 function changeScale(value: number) {manualScale.current = true; setScale(value);}
 const actions = (code: string | undefined, title: string) => code && (articleLinks[code] || practiceLinks[code]) ? <div className="parent-topic-actions">
  {articleLinks[code] && <Link className="parent-read-topic" href={articleLinks[code]} aria-label={'Đọc chuyên đề: ' + title}><BookOpen size={17} aria-hidden="true"/>Đọc chuyên đề</Link>}
  {practiceLinks[code] && <a className="parent-practice-link" href={practiceLinks[code]} target="_blank" rel="noopener noreferrer" aria-label={'Luyện tập trên CSATOJ: ' + title + ' (mở tab mới)'}><ExternalLink size={17} aria-hidden="true"/>Luyện tập trên CSATOJ</a>}
 </div> : null;
 function openNode(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const node = target.closest<SVGElement>('[data-node]');
  const id = node?.getAttribute('data-node');
  if (!id || !graph.records.some(record => record.id === id)) return;
  returnFocus.current = node; setSelected(id); drawer.current?.showModal();
 }
 function jump() {
  if (!current || !viewport.current) return;
  const box = graph.layout.boxes.find(item => item.id === (current.id ?? `stage-${current.originalIndex}`));
  if (!box) return;
  viewport.current.scrollTo({top: Math.max(0, box.y * scale - 16), left: Math.max(0, (box.x + box.width / 2) * scale - viewport.current.clientWidth / 2), behavior: 'instant'});
 }
 return <div className="parent-knowledge-map">
  <noscript><style>{'.parent-knowledge-map .pkm-paper,.parent-knowledge-map .pkm-jump{display:none!important}'}</style></noscript>
  <div className="pkm-program">{body.program && <span>{PROGRAMS[body.program]}</span>}{body.format && <span>{body.format === 'individual' ? 'Học 1–1' : 'Học nhóm'}</span>}</div>
  <div className="pkm-session-card">
   <div><p>{progress.completedSessions === null ? 'Số buổi lớp: chưa có dữ liệu' : progress.completedSessions === 0 ? 'Chưa hoàn thành buổi nào' : `Lớp đã hoàn thành ${progress.completedSessions} buổi`}</p><span>{progress.preparing ? 'Chặng chuẩn bị' : 'Chặng đang tập trung'}</span><strong>{current?.title ?? 'Chưa xác nhận'}</strong></div>
   {current && <button className="pkm-jump" type="button" onClick={jump}><ArrowDownToLine size={18} aria-hidden="true"/>Đến chặng hiện tại</button>}
  </div>
  {graph.nodes.length > 0 ? <>
   <div className="pkm-paper">
    <div className="pkm-controls" aria-label="Điều chỉnh bản đồ"><span>{graph.nodes.length} chủ đề</span><div><button type="button" onClick={() => changeScale(Math.max(.35, scale - .15))} disabled={scale <= .35} aria-label="Thu nhỏ bản đồ"><Minus size={18}/></button><output aria-live="polite">{Math.round(scale * 100)}%</output><button type="button" onClick={() => changeScale(Math.min(1.6, scale + .15))} disabled={scale >= 1.6} aria-label="Phóng to bản đồ"><Plus size={18}/></button><button type="button" onClick={() => changeScale(Math.min(1, Math.max(.2, ((viewport.current?.clientWidth ?? 600) - 24) / graph.layout.width)))} aria-label="Vừa chiều ngang"><Scan size={18}/></button></div></div>
    <div className="pkm-viewport" ref={viewport} tabIndex={0} role="region" aria-label="Bản đồ nội dung học của lớp, cuộn để xem các chặng">
     <div className="pkm-diagram" style={{width: graph.layout.width * scale, height: graph.layout.height * scale}} onClick={event => openNode(event.target)} onKeyDown={event => {if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof Element && event.target.closest('[data-node]')) {event.preventDefault(); openNode(event.target);}}} dangerouslySetInnerHTML={{__html: graph.svg}}/>
    </div>
   </div>
   <details className="pkm-readable"><summary>Nội dung học của lớp</summary><div>{stages.map(stage => <section key={stage.id ?? stage.originalIndex}><h4>{stage.title}</h4>{stage.description && <p>{stage.description}</p>}{stage.lessons.map((lesson, index) => <details key={lesson.code ?? index}><summary>{lesson.code ? lesson.code + ' · ' : ''}{lesson.title}</summary><div>{lesson.description && <p>{lesson.description}</p>}{actions(lesson.code, lesson.title)}</div></details>)}</section>)}</div></details>
  </> : <p className="pkm-empty">{body.program === 'voi' ? 'Khung PreVOI chờ giáo án riêng được trung tâm xác nhận.' : 'Gia sư chưa công bố nội dung học của lớp.'}</p>}
  <aside className="pkm-focus"><h4>Trọng tâm đồng hành</h4><p>{body.goal || 'Gia sư sẽ bổ sung mục tiêu sau khi trao đổi và ghi nhận quá trình học.'}</p>{body.focus_tags.length > 0 && <div>{body.focus_tags.map(id => <span key={id}>{getReviewTag(id)?.label || id}</span>)}</div>}{body.next_step && <p><strong>Bước tiếp theo: </strong>{body.next_step}</p>}</aside>
  <dialog className="pkm-drawer" ref={drawer} aria-labelledby={prefix + 'detail-title'} onClose={() => {setSelected(null); returnFocus.current?.focus({preventScroll: true});}} onClick={event => {if (event.target === event.currentTarget) drawer.current?.close();}}>
   <div className="pkm-drawer-inner"><button type="button" className="pkm-close" aria-label="Đóng nội dung chủ đề" onClick={() => drawer.current?.close()}><X size={22}/></button>{detail && <><p className="pkm-detail-code">{detail.lesson.code ?? 'NỘI DUNG HỌC'}</p><h4 ref={detailHeading} tabIndex={-1} id={prefix + 'detail-title'}>{detail.lesson.title}</h4><p className="pkm-detail-stage">{detail.stage.title}</p>{detail.stage.description && <p>{detail.stage.description}</p>}{detail.lesson.description && <p>{detail.lesson.description}</p>}{actions(detail.lesson.code, detail.lesson.title)}</>}</div>
  </dialog>
 </div>;
}
