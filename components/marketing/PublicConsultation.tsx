'use client';
import { publicZaloUrl } from '@/lib/public-contact';

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Check, Copy, Pencil } from 'lucide-react';
import { PublicSelect } from './PublicSelect';
import { parentPhoneSchema } from '@/lib/parents';
import type { PublicCourseCode } from '@/lib/public-courses';
import { intakeChoices, intakeSchema, type IntakeInput } from '@/lib/intake';

const choices = {
  role: ['Phụ huynh', 'Học sinh'],
  level: ['Tiểu học', 'THCS', 'THPT'],
  course: ['Cần tư vấn thêm', 'A — Nhập môn', 'B — Thi đấu cơ bản', 'C — Thi đấu nâng cao', 'E — Chủ lực', 'K — Học riêng / tùy chọn'],
  goal: ['Khám phá, cần tư vấn', 'Bắt đầu học lập trình', 'HSG THCS', 'Chuyên Tin', 'HSG tỉnh THPT'],
  background: ['Chưa rõ, muốn trao đổi', 'Chưa học lập trình', 'Đang làm quen cú pháp', 'Đã tự giải một số bài'],
};
function Select({ name, label, full = false, defaultValue }: { name: keyof typeof choices; label: string; full?: boolean; defaultValue?: string }) {
  return <PublicSelect name={name} label={label} full={full} defaultValue={defaultValue || choices[name][0]} options={choices[name].map(value => ({ value, label: value }))} />;
}

/** Registration submits directly; materials retain their copy/contact review. */
export function PublicConsultation({ kind = 'consultation', context = '', defaultCourse, showInstructions = true }: { kind?: 'materials' | 'consultation'; context?: string; defaultCourse?: PublicCourseCode; showInstructions?: boolean }) {
  const courseDefault = choices.course.find(value => value.startsWith(`${defaultCourse} —`));
  const [ready, setReady] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const summary = useRef<HTMLTextAreaElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const restoreReviewFocus = useRef(false);
  const id = useId();
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(false);
  const sendLock = useRef(false);
  const requestKey = useRef<{ body: string; id: string } | null>(null);
  useEffect(() => setReady(true), []);
  useLayoutEffect(() => {
    if (review !== null || saved) heading.current?.focus();
    else if (restoreReviewFocus.current) {
      // The form must be visible in the committed DOM before it can receive focus.
      restoreReviewFocus.current = false;
      reviewButton.current?.focus();
    }
  }, [review, saved]);

  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendLock.current || saved) return;
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
    if (kind !== 'materials') {
      const choice = (field: keyof typeof intakeChoices) => Object.entries(intakeChoices[field]).find(([, label]) => label === value(field))?.[0];
      const body = { schema_version: 2, name: value('name'), phone: phone.data, email: value('email'), role: choice('role'), level: choice('level'), course: choice('course'), goal: choice('goal'), background: choice('background'), school_year: value('school_year'), message: value('message'), source_path: window.location.pathname, consent: data.get('consent') === 'on', website: value('website') };
      const signature = JSON.stringify(body);
      if (requestKey.current?.body !== signature) requestKey.current = { body: signature, id: crypto.randomUUID() };
      const parsed = intakeSchema.safeParse({ ...body, request_id: requestKey.current.id });
      if (!parsed.success) { setError('Vui lòng kiểm tra thông tin và đồng ý để CSAT lưu đơn, liên hệ tư vấn.'); return; }
      void send(parsed.data);
      return;
    }
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
  async function send(submission: IntakeInput) {
    if (sendLock.current || saved) return;
    sendLock.current = true;
    setSending(true); setError('');
    try {
      const response = await fetch('/api/consultations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submission) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Chưa lưu được đơn. Vui lòng thử lại.');
      setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Kết nối bị gián đoạn. Thông tin vẫn được giữ để bạn thử lại.'); }
    finally { sendLock.current = false; setSending(false); }
  }

  return <div className="public-intake" data-intake-mode={kind === 'materials' ? 'frontend' : 'registration'}>
    {ready ? <>
      <form hidden={review !== null || saved} onSubmit={prepare} aria-busy={sending} aria-label={kind === 'materials' ? 'Đăng ký nhận tài liệu' : 'Thông tin tư vấn học tập'} aria-describedby={showInstructions ? `${id}-note` : undefined}>
        {showInstructions && <div className="intake-step mono">01 / CHIA SẺ CÙNG CSAT</div>}
        <fieldset disabled={sending} aria-label="Thông tin liên hệ và nhu cầu học tập" className="form-grid">
          <Select name="role" label="Bạn là" />
          <label className="field">Tên liên hệ *<input name="name" autoComplete="name" required minLength={2} maxLength={100} aria-describedby={error ? `${id}-error` : undefined} /></label>
          <label className="field">Số điện thoại *<input name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={30} aria-describedby={error ? `${id}-error` : undefined} /></label>
          <label className="field">Email<input name="email" type="email" autoComplete="email" maxLength={254} /></label>
          <Select name="level" label="Cấp học" />
          <label className="field">Lớp đang học<input name="school_year" maxLength={50} placeholder="Ví dụ: Lớp 8" /></label>
          <Select key={defaultCourse || 'undecided'} name="course" label="Khóa bạn quan tâm" full defaultValue={courseDefault} />
          <Select name="goal" label="Mục tiêu học tập" full />
          <Select name="background" label="Bạn đã học đến đâu?" full />
          <label className="field full">{kind === 'materials' ? 'Bạn muốn tìm tài liệu về nội dung nào?' : 'Bạn muốn trao đổi điều gì?'}<textarea name="message" maxLength={2000} rows={3} placeholder="Chia sẻ điều đang học, phần còn vướng hoặc lịch học mong muốn…" /></label>
          {kind !== 'materials' && <><label className="full intake-consent"><input name="consent" type="checkbox" required /><span>Tôi đồng ý để CSAT lưu thông tin và liên hệ về nhu cầu học tập.</span></label><div hidden aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div></>}
        </fieldset>
        <p id={`${id}-error`} className="form-feedback" role={error ? 'alert' : undefined}>{error}</p>
        <button ref={reviewButton} type="submit" className="btn intake-submit" disabled={sending}>{kind === 'materials' ? 'Kiểm tra thông tin' : sending ? 'Đang gửi…' : 'Đăng kí ngay'} <ArrowRight size={18} aria-hidden="true" /></button>
        {showInstructions && <p id={`${id}-note`} className="intake-note">{kind === 'materials' ? 'Kiểm tra và sao chép thông tin để trao đổi cùng CSAT. Nội dung chỉ được giữ trong trang đang mở.' : 'CSAT sẽ liên hệ với bạn sau khi tiếp nhận đăng ký.'}</p>}
      </form>
      {saved && <section className="intake-review intake-success" aria-labelledby={`${id}-success`}>
        <h3 ref={heading} tabIndex={-1} id={`${id}-success`}>Cảm ơn bạn đã đăng ký!</h3>
        <p role="status">CSAT đã tiếp nhận đăng ký. Đội ngũ sẽ liên hệ để trao đổi với bạn.</p>
      </section>}
      {review !== null && <section className="intake-review" aria-labelledby={`${id}-review`}>
        <div className="intake-step mono">02 / KIỂM TRA THÔNG TIN</div>
        <h3 ref={heading} tabIndex={-1} id={`${id}-review`}>Sẵn sàng trao đổi cùng CSAT.</h3>
        <p role="status">Thông tin chưa được gửi. Bạn có thể sao chép nội dung bên dưới rồi nhắn cho đội ngũ gia sư.</p>
        {error && <p role="alert" className="form-feedback">{error}</p>}
        <label className="field">Nội dung của bạn<textarea ref={summary} readOnly value={review} rows={11} /></label>
        <div className="intake-review-actions"><button type="button" className="btn" onClick={copy}>{copyState === 'copied' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}Sao chép nội dung</button>{!saved && <button type="button" className="text-link" disabled={sending} onClick={() => { restoreReviewFocus.current = true; setReview(null); setCopyState('idle'); }}><Pencil size={16} aria-hidden="true" />Chỉnh lại</button>}</div>
        <p role="status" className="intake-note">{copyState === 'copied' ? 'Đã sao chép. Hãy dán vào cuộc trò chuyện với CSAT để gửi.' : copyState === 'failed' ? 'Trình duyệt chưa cho phép sao chép. Nội dung đã được chọn; bạn có thể sao chép thủ công.' : ''}</p>
      </section>}
    </> : <p>Chia sẻ nhu cầu học tập hoặc tài liệu bạn đang tìm cùng đội ngũ CSAT.</p>}
    <div className="intake-contact-links"><a className="text-link" href={publicZaloUrl} target="_blank" rel="noopener noreferrer">Nhắn qua Zalo <ArrowUpRight size={17} aria-hidden="true" /></a><a className="text-link" href="https://www.facebook.com/csat.tutor" target="_blank" rel="noopener noreferrer">Nhắn qua Facebook <ArrowUpRight size={17} aria-hidden="true" /></a></div>
  </div>;
}
