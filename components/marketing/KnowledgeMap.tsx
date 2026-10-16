'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Search } from 'lucide-react';
import type { KnowledgeLevel, KnowledgeStage } from '@/lib/knowledge-map';
import { matchesKnowledgeTopic } from '@/lib/knowledge-map-search';

type View = { level: KnowledgeLevel | 'all'; query: string; topic: string };
const levels = [{ code: 'A', label: 'Nền tảng C++' }, { code: 'B', label: 'Phương pháp cơ bản' }, { code: 'C', label: 'Thuật toán nâng cao' }] as const;

export function KnowledgeMap({ stages }: { stages: KnowledgeStage[] }) {
  const [view, setView] = useState<View>({ level: 'all', query: '', topic: '' });
  const [ready, setReady] = useState(false);
  const map = useRef<HTMLDivElement>(null);
  const focusTopic = useRef(false);
  const focusGroup = useRef('');
  const topics = stages.flatMap(stage => stage.topics);

  useEffect(() => {
    const readLocation = () => {
      const url = new URL(window.location.href);
      const requested = url.hash.replace('#chu-de-', '');
      const topic = stages.some(stage => stage.topics.some(item => item.code === requested)) ? requested : '';
      const level = url.searchParams.get('lop');
      const group = /^#nhom-[ABC]$/.test(url.hash) ? url.hash.slice(1) : '';
      focusGroup.current = group;
      focusTopic.current = Boolean(topic);
      setView({ level: topic || group ? 'all' : level === 'A' || level === 'B' || level === 'C' ? level : 'all', query: topic || group ? '' : (url.searchParams.get('q') || '').slice(0, 120), topic });
    };
    readLocation();
    setReady(true);
    window.addEventListener('popstate', readLocation);
    window.addEventListener('hashchange', readLocation);
    return () => { window.removeEventListener('popstate', readLocation); window.removeEventListener('hashchange', readLocation); };
  }, [stages]);

  useEffect(() => {
    if (focusGroup.current) {
      map.current?.querySelector(`#${focusGroup.current}`)?.scrollIntoView({ block: 'start' });
      focusGroup.current = '';
    }
    if (!focusTopic.current || !view.topic) return;
    focusTopic.current = false;
    const summary = map.current?.querySelector<HTMLElement>(`#chu-de-${view.topic} > summary`);
    summary?.focus({ preventScroll: true });
    summary?.scrollIntoView({ block: 'start' });
  }, [view]);

  function navigate(next: View, replace = false) {
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.delete('lop');
    url.searchParams.delete('q');
    if (next.level !== 'all') url.searchParams.set('lop', next.level);
    if (next.query) url.searchParams.set('q', next.query);
    url.hash = next.topic ? `chu-de-${next.topic}` : 'kham-pha';
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  }

  function selectTopic(code: string) {
    focusTopic.current = true;
    navigate({ level: 'all', query: '', topic: code });
  }

  function topicLinks(codes: string[]) {
    return <ul className="km-related">{codes.map(code => <li key={code}><a href={`#chu-de-${code}`} onClick={event => { event.preventDefault(); selectTopic(code); }}><b>{code}</b> {topics.find(topic => topic.code === code)?.title}</a></li>)}</ul>;
  }

  const count = stages.filter(stage => view.level === 'all' || stage.level === view.level).flatMap(stage => stage.topics).filter(topic => matchesKnowledgeTopic(topic, view.query)).length;

  return <section className="km-explorer" id="kham-pha" aria-labelledby="km-explore-title" ref={map}>
    <div className="km-explorer-heading"><h2 id="km-explore-title">Bạn muốn học gì?</h2><p>Mở một chủ đề để bắt đầu.</p></div>
    <div className="km-controls" hidden={!ready}>
      <div className="km-filters" role="group" aria-label="Lọc phần kiến thức">
        <button type="button" aria-pressed={view.level === 'all'} onClick={() => navigate({ ...view, level: 'all', topic: '' })}>Tất cả <span>43</span></button>
        {levels.map(level => <button type="button" key={level.code} aria-pressed={view.level === level.code} onClick={() => navigate({ ...view, level: level.code, topic: '' })}>{level.code} · {level.label}</button>)}
      </div>
      <label className="km-search"><span>Tìm theo tên, mã hoặc thuật toán</span><span className="km-search-input"><Search size={20} aria-hidden="true" /><input type="search" value={view.query} maxLength={120} placeholder="Ví dụ: mảng, nhi phan, D03…" onChange={event => navigate({ ...view, query: event.target.value, topic: '' }, true)} /></span></label>
      <p className="km-results" role="status" aria-live="polite" aria-atomic="true">Đang hiển thị {count} / 43 chủ đề{view.level !== 'all' ? ` · Phần ${view.level}` : ''}.</p>
    </div>
    <noscript><p className="km-nojs">Bạn có thể xem đủ 43 chủ đề bên dưới và mở từng mục để đọc hướng học, kiến thức liên quan và bài luyện.</p></noscript>
    {count === 0 && <div className="km-empty"><h3>Chưa tìm thấy chủ đề phù hợp</h3><p>Thử tên ngắn hơn như “mảng”, “xâu” hoặc mã chủ đề.</p><button type="button" className="km-secondary" onClick={() => navigate({ level: 'all', query: '', topic: '' })}>Xóa tìm kiếm và bộ lọc</button></div>}
    {levels.map(level => {
      const visibleStages = stages.filter(stage => stage.level === level.code && (view.level === 'all' || view.level === level.code)).map(stage => ({ ...stage, topics: stage.topics.filter(topic => matchesKnowledgeTopic(topic, view.query)) })).filter(stage => stage.topics.length);
      return <section key={level.code} id={`nhom-${level.code}`} className="km-level" data-level={level.code} hidden={!visibleStages.length} aria-labelledby={`km-level-${level.code}`}>
        <div className="km-level-heading"><span className="km-level-code" aria-hidden="true">{level.code}</span><div><p>PHẦN {level.code}</p><h3 id={`km-level-${level.code}`}>{level.label}</h3></div><span className="km-level-total">{stages.filter(stage => stage.level === level.code).flatMap(stage => stage.topics).length} chủ đề</span></div>
        <div className="km-stages">{visibleStages.map(stage => <section key={stage.id} className="km-stage" aria-labelledby={`km-${stage.id}`}>
          <div className="km-stage-heading"><h4 id={`km-${stage.id}`}>{stage.title}</h4><p>{stage.description}</p></div>
          <div className="km-topics">{stage.topics.map(topic => <details key={topic.code} id={`chu-de-${topic.code}`} className="km-topic" open={view.topic === topic.code}>
            <summary onClick={event => { event.preventDefault(); navigate({ ...view, topic: view.topic === topic.code ? '' : topic.code }); }}><span className="km-topic-code">{topic.code}</span><span><strong>{topic.title}</strong><span className="km-topic-purpose">{topic.purpose}</span></span><ChevronDown size={18} aria-hidden="true" /></summary>
            <div className="km-topic-body">
              {topic.description && <p className="km-topic-scope">{topic.description}</p>}
              <h5>Cách tiếp cận</h5><p>{topic.approach}</p>
              <h5>Điều cần rèn luyện</h5><p>{topic.skill}</p>
              <h5>Nền tảng nên ôn</h5>{topic.prerequisites.length ? topicLinks(topic.prerequisites) : <p>Bạn có thể bắt đầu tại đây, từ việc làm quen môi trường lập trình.</p>}
              {topic.next.length > 0 && <><h5>Có thể tìm hiểu tiếp</h5>{topicLinks(topic.next)}</>}
              <a className="km-practice" href={topic.practiceUrl} target="_blank" rel="noopener noreferrer">Luyện {topic.code} trên CSATOJ <ArrowUpRight size={18} aria-hidden="true" /><span className="sr-only"> (mở tab mới)</span></a>
              <a className="km-permalink" href={`#chu-de-${topic.code}`} onClick={event => { event.preventDefault(); selectTopic(topic.code); }}>Liên kết đến {topic.code}</a>
            </div>
          </details>)}</div>
        </section>)}</div>
      </section>;
    })}
  </section>;
}
