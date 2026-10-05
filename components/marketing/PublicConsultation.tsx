'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Check, Copy, Pencil } from 'lucide-react';
import { PublicSelect } from './PublicSelect';
import { parentPhoneSchema } from '@/lib/parents';

const choices = {
  role: ['Phụ huynh', 'Học sinh', 'Sinh viên'],
  level: ['Trao đổi thêm', 'Tiểu học', 'THCS', 'THPT', 'Đại học'],
  course: ['Cần tư vấn thêm', 'A — Nhập môn', 'B — Thi đấu cơ bản', 'C — Thi đấu nâng cao', 'E — PreVOI', 'K — Học riêng / tùy chọn'],
  goal: ['Khám phá, cần tư vấn', 'Bắt đầu học lập trình', 'HSG THCS', 'Chuyên Tin', 'HSG tỉnh THPT', 'HSG Quốc gia'],
  background: ['Chưa rõ, muốn trao đổi', 'Chưa học lập trình', 'Đang làm quen cú pháp', 'Đã tự giải một số bài'],
};
function Select({ name, label, full = false }: { name: keyof typeof choices; label: string; full?: boolean }) {
  return <PublicSelect name={name} label={label} full={full} defaultValue={choices[name][0]} options={choices[name].map(value => ({ value, label: value }))} />;
}

/** Frontend only: user reviews/copies; no API, persistent storage or email side effects. */
export function PublicConsultation({ kind = 'consultation', context = '' }: { kind?: 'materials' | 'consultation'; context?: string }) {
  const [ready, setReady] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const summary = useRef<HTMLTextAreaElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => setReady(true), []);
  useEffect(() => { if (review !== null) heading.current?.focus(); }, [review]);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) || '').trim();
    const phone = parentPhoneSchema.safeParse(value('phone'));
    if (value('name').length < 2 || !phone.success) {
      const field = value('name').length < 2 ? 'name' : 'phone';
      setError(field === 'name' ? 'Vui lòng nhập tên liên hệ, tối thiểu 2 ký tự.' : 'Vui lòng nhập số điện thoại Việt Nam hợp lệ.');
      const input = event.currentTarget.elements.namedItem(field);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setError(''); setCopyState('idle');
    setReview([
      kind === 'materials' ? 'CSAT — Yêu cầu tài liệu học tập' : 'CSAT — Tư vấn lộ trình học tập',
      `Người liên hệ: ${value('name')} (${value('role')})`, `Số điện thoại: ${phone.data}`,
      value('email') && `Email: ${value('email')}`, `Cấp học: ${value('level')}`,
      value('school_year') && `Lớp đang học: ${value('school_year')}`,
      `Khóa quan tâm: ${value('course')}`, `Mục tiêu: ${value('goal')}`, `Nền tảng: ${value('background')}`,
      context && `Ngữ cảnh tìm hiểu: ${context}`, value('message') && `Lời nhắn: ${value('message')}`,
    ].filter(Boolean).join('\n'));
  }
  async function copy() {
    if (review === null) return;
    try { await navigator.clipboard.writeText(review); setCopyState('copied'); }
    catch { setCopyState('failed'); summary.current?.focus(); summary.current?.select(); }
  }

  return <div className="public-intake" data-intake-mode="frontend">
    {ready ? <>
      <form hidden={review !== null} onSubmit={prepare} aria-label={kind === 'materials' ? 'Đăng ký nhận tài liệu' : 'Thông tin tư vấn học tập'} aria-describedby={`${id}-note`}>
        <div className="intake-step mono">01 / CHIA SẺ CÙNG CSAT</div>
        <div className="form-grid">
          <Select name="role" label="Bạn là" />
          <label className="field">Tên liên hệ *<input name="name" autoComplete="name" required minLength={2} maxLength={100} aria-describedby={error ? `${id}-error` : undefined} /></label>
          <label className="field">Số điện thoại *<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={30} aria-describedby={error ? `${id}-error` : undefined} /></label>
          <label className="field">Email<input name="email" type="email" autoComplete="email" maxLength={254} /></label>
          <Select name="level" label="Cấp học" />
          <label className="field">Lớp đang học<input name="school_year" maxLength={50} placeholder="Ví dụ: Lớp 8" /></label>
          <Select name="course" label="Khóa bạn quan tâm" full />
          <Select name="goal" label="Mục tiêu học tập" full />
          <Select name="background" label="Bạn đã học đến đâu?" full />
          <label className="field full">{kind === 'materials' ? 'Bạn muốn tìm tài liệu về nội dung nào?' : 'Bạn muốn trao đổi điều gì?'}<textarea name="message" maxLength={2000} rows={3} placeholder="Chia sẻ điều đang học, phần còn vướng hoặc lịch học mong muốn…" /></label>
        </div>
        <p id={`${id}-error`} className="form-feedback" role={error ? 'alert' : undefined}>{error}</p>
        <button ref={reviewButton} type="submit" className="btn">Kiểm tra thông tin <ArrowRight size={18} aria-hidden="true" /></button>
        <p id={`${id}-note`} className="intake-note">Kiểm tra và sao chép thông tin để trao đổi cùng CSAT. Nội dung chỉ được giữ trong trang đang mở.</p>
      </form>
      {review !== null && <section className="intake-review" aria-labelledby={`${id}-review`}>
        <div className="intake-step mono">02 / KIỂM TRA THÔNG TIN</div>
        <h3 ref={heading} tabIndex={-1} id={`${id}-review`}>Sẵn sàng trao đổi cùng CSAT.</h3>
        <p>Thông tin chưa được gửi. Bạn có thể sao chép nội dung bên dưới rồi nhắn cho đội ngũ gia sư.</p>
        <label className="field">Nội dung của bạn<textarea ref={summary} readOnly value={review} rows={11} /></label>
        <div className="intake-review-actions"><button type="button" className="btn" onClick={copy}>{copyState === 'copied' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}Sao chép nội dung</button><button type="button" className="text-link" onClick={() => { setReview(null); setCopyState('idle'); requestAnimationFrame(() => reviewButton.current?.focus()); }}><Pencil size={16} aria-hidden="true" />Chỉnh lại</button></div>
        <p role="status" className="intake-note">{copyState === 'copied' ? 'Đã sao chép. Hãy dán vào cuộc trò chuyện với CSAT để gửi.' : copyState === 'failed' ? 'Trình duyệt chưa cho phép sao chép. Nội dung đã được chọn; bạn có thể sao chép thủ công.' : ''}</p>
      </section>}
    </> : <p>Chia sẻ nhu cầu học tập hoặc tài liệu bạn đang tìm cùng đội ngũ CSAT.</p>}
    <div className="intake-contact-links"><a className="text-link" href="https://zalo.me/0916246867" target="_blank" rel="noopener noreferrer">Nhắn qua Zalo <ArrowUpRight size={17} aria-hidden="true" /></a><a className="text-link" href="https://www.facebook.com/csat.tutor" target="_blank" rel="noopener noreferrer">Nhắn qua Facebook <ArrowUpRight size={17} aria-hidden="true" /></a></div>
  </div>;
}
