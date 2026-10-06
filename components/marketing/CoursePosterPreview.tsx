'use client';

import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import { Expand, X } from 'lucide-react';
import { publicCourses, type PublicCourseCode } from '@/lib/public-courses';
import './course-poster-preview.css';

export function CoursePosterPreview({ code, className, sizes = '144px', priority = false, background = false }: { code: PublicCourseCode; className: string; sizes?: string; priority?: boolean; background?: boolean }) {
  const course = publicCourses.find(item => item.code === code)!;
  const label = code === 'E' || code === 'K' ? 'lớp E và K' : `lớp ${code}`;
  const src = `/images/site/${course.image}.webp`;
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return <>
    <a className={`course-poster-trigger ${className}`} href={src} aria-label={`Xem ảnh ${label}`} aria-haspopup="dialog" onClick={event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); setOpen(true); dialog.current?.showModal();
    }}><Image src={src} width={1000} height={1000} alt={`Poster ${label} của CSAT`} sizes={sizes} priority={priority} /><span className={`course-poster-expand${background ? ' is-background' : ''}`}><Expand size={18} aria-hidden="true" />{background && <span>Xem ảnh lớp {code}</span>}</span></a>
    <dialog ref={dialog} className="course-poster-lightbox" aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }} onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); closeButton.current?.focus(); } }}>
      <div className="course-poster-lightbox-heading"><h2 id={titleId}>Ảnh giới thiệu {label}</h2><button ref={closeButton} type="button" className="course-poster-close" aria-label="Đóng ảnh" onClick={() => dialog.current?.close()}><X size={24} aria-hidden="true" /><span>Đóng</span></button></div>
      {open && <figure><Image src={src} width={1000} height={1000} alt={`Thông tin ${label} trên poster CSAT`} unoptimized /></figure>}
    </dialog>
  </>;
}
