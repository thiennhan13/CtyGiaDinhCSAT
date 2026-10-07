'use client';

import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import { Expand, X } from 'lucide-react';
import { publicCourses, publicCourseIllustrations, type PublicCourseCode } from '@/lib/public-courses';
import './course-poster-preview.css';

export function CoursePosterPreview({ code, className, sizes = '144px', priority = false, background = false, variant = 'poster', showExpand = true, interactive = true }: { code: PublicCourseCode; className: string; sizes?: string; priority?: boolean; background?: boolean; variant?: 'poster' | 'illustration'; showExpand?: boolean; interactive?: boolean }) {
  const course = publicCourses.find(item => item.code === code)!;
  const illustration = variant === 'illustration' ? publicCourseIllustrations[code] : undefined;
  const label = !illustration && (code === 'E' || code === 'K') ? 'lớp E và K' : `lớp ${code}`;
  const src = `/images/site/${illustration?.image || course.image}.webp`;
  const { width, height } = illustration || { width: 1000, height: 1000 };
  const alt = illustration ? `Ảnh minh họa lộ trình ${label}` : `Poster ${label} của CSAT`;
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  if (!interactive) return <div className={`course-poster-static ${className}`}><Image src={src} width={width} height={height} alt={alt} sizes={sizes} priority={priority} quality={illustration && code === 'E' ? 90 : undefined} /></div>;
  return <>
    <a className={`course-poster-trigger ${className}`} href={src} aria-label={`Xem ảnh ${label}`} aria-haspopup="dialog" onClick={event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); setOpen(true); dialog.current?.showModal();
    }}><Image src={src} width={width} height={height} alt={alt} sizes={sizes} priority={priority} />{showExpand && <span className={`course-poster-expand${background ? ' is-background' : ''}`}><Expand size={18} aria-hidden="true" />{background && <span>Xem ảnh lớp {code}</span>}</span>}</a>
    <dialog ref={dialog} className="course-poster-lightbox" aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }} onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); closeButton.current?.focus(); } }}>
      <div className="course-poster-lightbox-heading"><h2 id={titleId}>Ảnh giới thiệu {label}</h2><button ref={closeButton} type="button" className="course-poster-close" aria-label="Đóng ảnh" onClick={() => dialog.current?.close()}><X size={24} aria-hidden="true" /><span>Đóng</span></button></div>
      {open && <figure><Image src={src} width={width} height={height} alt={alt} unoptimized /></figure>}
    </dialog>
  </>;
}
