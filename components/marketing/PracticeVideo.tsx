'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Pause, Play } from 'lucide-react';

/** Decorative media: load on demand, pause offscreen, retain a real poster. */
export function PracticeVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const syncPlayback = useRef<() => void>(() => {});
  const preference = useRef<'play' | 'pause' | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    let visible = false, disposed = false, pending = false;
    const sync = () => {
      const allowed = visible && !document.hidden && preference.current !== 'pause'
        && (preference.current === 'play' || (!reduced.matches && !connection?.saveData));
      if (!allowed) { element.pause(); return; }
      if (pending || element.error) return;
      if (!element.getAttribute('src')) { element.src = '/media/writing-960.webm'; element.load(); }
      if (element.paused) {
        pending = true;
        element.play().catch(() => { if (!disposed) setPlaying(false); }).finally(() => {
          pending = false;
          if (disposed || !visible || document.hidden || preference.current === 'pause'
            || (preference.current !== 'play' && (reduced.matches || connection?.saveData))) element.pause();
        });
      }
    };
    syncPlayback.current = sync;
    const observer = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); sync(); }, { threshold: .2 });
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    connection?.addEventListener('change', sync);
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
      connection?.removeEventListener('change', sync);
      syncPlayback.current = () => {};
      element.pause(); element.removeAttribute('src'); element.load();
    };
  }, []);

  return <div className="oj-photo practice-video">
    <Image src="/images/site/writing-poster.webp" width={960} height={720} sizes="(max-width:900px) 90vw, 45vw" alt="Ghi chép ý tưởng bên màn hình lập trình" />
    <video ref={video} muted playsInline loop preload="none" poster="/images/site/writing-poster.webp" aria-hidden="true" hidden={failed}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false); }} />
    {!failed && <button type="button" className="practice-video-toggle" aria-label={playing ? 'Dừng video minh họa' : 'Phát video minh họa'} onClick={() => {
      preference.current = playing ? 'pause' : 'play'; syncPlayback.current();
    }}>{playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}</button>}
    <noscript><style>{'.practice-video-toggle{display:none!important}'}</style></noscript>
  </div>;
}
