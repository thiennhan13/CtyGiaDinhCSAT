'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Check, Loader2, Plus, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/components/ui/use-dialog';
import { getVietnamMonthRange } from '@/lib/calendar';
import {
  saveReviewSchema, snapshotReviewTags, tagReadiness,
  type ReviewTagInput, type ReviewWorkspaceData, type StudentReview,
} from '@/lib/student-reviews';
import { ReviewTagEditor } from './ReviewTagEditor';
import { ReviewContent } from './ReviewContent';

interface ReviewForm {
  month_year: string; review_context: string; general_assessment: string;
  learning_attitude: string; logical_thinking: string; tags: ReviewTagInput[];
}
const leaveOptions = { title: 'Còn nội dung chưa lưu', description: 'Lưu bản nháp nếu muốn tiếp tục sau. Rời nhận xét này sẽ bỏ các thay đổi chưa lưu.', confirmText: 'Bỏ thay đổi', cancelText: 'Tiếp tục viết', variant: 'destructive' as const };
const blankForm = (): ReviewForm => ({ month_year: getVietnamMonthRange().startDate.slice(0, 7), review_context: '', general_assessment: '', learning_attitude: '', logical_thinking: '', tags: [] });
async function readResponse(response: Response) {
  try { return await response.json(); }
  catch { throw new Error('Chưa nhận được phản hồi hợp lệ. Vui lòng thử lại; nội dung đang nhập được giữ nguyên.'); }
}
function formFromReview(review: StudentReview): ReviewForm {
  return {
    month_year: review.month_year || getVietnamMonthRange().startDate.slice(0, 7),
    review_context: review.review_context || '', general_assessment: review.general_assessment || '',
    learning_attitude: review.learning_attitude || '', logical_thinking: review.logical_thinking || '',
    tags: (review.review_tags || []).map(tag => ({ tag_id: tag.tag_id, level: tag.level, evidence: tag.evidence, comparison: tag.comparison, next_step: tag.next_step, propose_focus: tag.propose_focus })),
  };
}

export function TutorReviewWorkspace({ classId, studentId }: { classId: string; studentId: string }) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [data, setData] = useState<ReviewWorkspaceData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [form, setForm] = useState<ReviewForm>(blankForm);
  const [baseline, setBaseline] = useState(() => JSON.stringify(blankForm()));
  const [reviewId, setReviewId] = useState(() => crypto.randomUUID());
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState<'draft' | 'published' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [validation, setValidation] = useState<string[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);
  const saving = useRef(false);
  const dirty = !published && JSON.stringify(form) !== baseline;
  const readyTags = form.review_context.trim() ? form.tags.filter(tag => !tagReadiness(tag).length) : [];
  const incomplete = form.tags.length - readyTags.length;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tutor/reviews?class_id=${classId}&student_id=${studentId}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const payload = await readResponse(response);
        if (!response.ok) throw new Error(payload.error || 'Không tải được nhận xét.');
        if (!controller.signal.aborted) { setData(payload); setLoadError(''); }
      }).catch((reason: Error) => { if (!controller.signal.aborted) setLoadError(reason.message); });
    return () => controller.abort();
  }, [classId, studentId, retry]);

  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);

  // Next.js links do not trigger beforeunload; protect in-app navigation too.
  useEffect(() => {
    if (!dirty && !busy) return;
    let asking = false;
    const navigate = async (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (saving.current || asking) return;
      asking = true;
      try { if (!dirty || await confirm(leaveOptions)) router.push(url.pathname + url.search + url.hash); }
      finally { asking = false; }
    };
    document.addEventListener('click', navigate, true);
    return () => document.removeEventListener('click', navigate, true);
  }, [dirty, busy, confirm, router]);

  async function mayLeave() {
    return !dirty || await confirm(leaveOptions);
  }
  async function newReview() {
    if (saving.current || !await mayLeave()) return;
    const next = blankForm(); setForm(next); setBaseline(JSON.stringify(next)); setReviewId(crypto.randomUUID());
    setExpectedUpdatedAt(null); setPublished(false); setError(''); setNotice(''); setValidation([]);
  }
  async function resumeReview(review: StudentReview) {
    if (saving.current || !await mayLeave()) return;
    const next = formFromReview(review); setForm(next); setBaseline(JSON.stringify(next));
    setReviewId(review.review_id); setExpectedUpdatedAt(review.updated_at || null); setPublished(false);
    setError(''); setValidation([]); setNotice('Đang tiếp tục bản nháp đã lưu.');
    document.getElementById('review-editor-heading')?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function update(patch: Partial<ReviewForm>) { setForm(current => ({ ...current, ...patch })); setNotice(''); }

  async function save(status: 'draft' | 'published') {
    if (saving.current || published) return;
    const parsed = saveReviewSchema.safeParse({ ...form, review_id: reviewId, student_id: studentId, class_id: classId, expected_updated_at: expectedUpdatedAt, review_status: status });
    if (!parsed.success) {
      setError('Kiểm tra nội dung trước khi tiếp tục.'); setValidation([...new Set(parsed.error.issues.map(issue => issue.message))]);
      requestAnimationFrame(() => errorRef.current?.focus()); return;
    }
    saving.current = true; setBusy(status); setError(''); setValidation([]); setNotice('');
    try {
      const response = await fetch('/api/tutor/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) });
      const payload = await readResponse(response);
      if (!response.ok) throw new Error(payload.error || 'Chưa lưu được nhận xét.');
      const saved = payload.review as StudentReview;
      if (!saved?.review_id || !saved.updated_at) throw new Error('Chưa xác nhận được kết quả lưu. Vui lòng thử lại để kiểm tra.');
      const next = formFromReview(saved); setForm(next); setBaseline(JSON.stringify(next));
      setExpectedUpdatedAt(saved.updated_at); setReviewId(saved.review_id); setPublished(saved.review_status === 'published');
      setData(current => current ? { ...current, reviews: [saved, ...current.reviews.filter(review => review.review_id !== saved.review_id)].slice(0, 30) } : current);
      setNotice(saved.review_status === 'published' ? 'Đã gửi nhận xét lên cổng phụ huynh.' : 'Đã lưu bản nháp. Phụ huynh chưa nhìn thấy nội dung này.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa lưu được nhận xét. Nội dung đang nhập được giữ lại.');
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { saving.current = false; setBusy(null); }
  }

  if (!data) return <div className="rounded-2xl border border-foreground/15 bg-card p-7">
    {loadError ? <><h1 className="text-xl font-bold">Chưa mở được trang nhận xét</h1><p role="alert" className="my-4 text-sm">{loadError}</p><div className="flex gap-3"><Button onClick={() => { setLoadError(''); setRetry(value => value + 1); }}>Thử lại</Button><Button variant="outline" onClick={() => router.push(`/tutor/classes/${classId}`)}>Về lớp học</Button></div></> : <p role="status" className="flex items-center gap-2"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" />Đang tải thông tin học sinh và nhận xét…</p>}
  </div>;

  return <div className="space-y-6">
    <ConfirmDialog />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" className="min-h-11 px-0" disabled={!!busy} onClick={async () => { if (await mayLeave()) router.push(`/tutor/classes/${classId}`); }}><ArrowLeft className="size-4" /> Về lớp học</Button>
      <span className="rounded-full border border-foreground/15 bg-card px-3 py-1 text-xs">{data.class.class_type}</span>
    </div>
    <header className="rounded-2xl border border-foreground bg-primary p-6 text-primary-foreground shadow-neo sm:p-8">
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/80">Nhận xét học sinh · {data.class.name}</p>
      <h1 id="review-editor-heading" className="mt-3 scroll-mt-28 font-heading text-3xl font-black tracking-tight sm:text-4xl">ĐỒNG HÀNH CÙNG<br /><span className="text-csat-lime">{data.student.name}</span></h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/90">Ghi nhận kiến thức, kỹ năng và điều con đang tiến bộ. Minh chứng cụ thể giúp phụ huynh hiểu việc học và cùng con thực hiện bước tiếp theo.</p>
    </header>
    <div ref={errorRef} tabIndex={-1} hidden={!error} role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm outline-none">
      <p className="font-semibold">{error}</p>{validation.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">{validation.map(message => <li key={message}>{message}</li>)}</ul>}
    </div>
    {notice && <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-600/25 bg-emerald-50 p-4 text-sm text-emerald-900"><Check className="mt-0.5 size-4 shrink-0" />{notice}</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,.9fr)]">
      <fieldset disabled={!!busy || published} className="min-w-0 space-y-5">
        <legend className="sr-only">Soạn nhận xét cho {data.student.name}</legend>
        <section className="space-y-4 rounded-xl border border-foreground/15 bg-card p-4 sm:p-5">
          <div><label className="mb-2 block text-xs font-semibold" htmlFor="review-month">Kỳ nhận xét</label><Input id="review-month" type="month" value={form.month_year} onChange={event => update({ month_year: event.target.value })} className="min-h-11" /></div>
          <div><label className="mb-2 block text-xs font-semibold" htmlFor="review-context">Buổi / giai đoạn được nhận xét</label><Input id="review-context" value={form.review_context} maxLength={120} onChange={event => update({ review_context: event.target.value })} placeholder="Ví dụ: Buổi 14–18 · Ôn tập dãy và mảng" className="min-h-11" /></div>
          <p className="text-xs text-muted-foreground">Nhận xét gắn với phạm vi đã quan sát. Thẻ và mức độ được để trống để gia sư lựa chọn.</p>
        </section>
        <ReviewTagEditor value={form.tags} onChange={tags => update({ tags })} classType={data.class.class_type} disabled={!!busy || published} />
        <section className="space-y-4 rounded-xl border border-foreground/15 bg-card p-4 sm:p-5">
          <h2 className="text-lg font-extrabold">Nhận xét bằng lời</h2><p className="text-xs text-muted-foreground">Bổ sung những điều cần trao đổi ngoài các thẻ đã chọn. Có thể gửi nhận xét bằng lời khi chưa cần dùng thẻ.</p>
          {([
            ['general_assessment', 'Đánh giá chung', 'Điều con đã thực hiện được và mục tiêu gần…'],
            ['learning_attitude', 'Thái độ học tập', 'Hành vi học tập đã quan sát trong giai đoạn này…'],
            ['logical_thinking', 'Tư duy logic / Giải quyết vấn đề', 'Cách phân tích, lựa chọn và giải thích lời giải…'],
          ] as const).map(([key, label, placeholder]) => <div key={key}><label className="mb-2 block text-xs font-semibold" htmlFor={`review-${key}`}>{label}</label><Textarea id={`review-${key}`} value={form[key]} onChange={event => update({ [key]: event.target.value })} maxLength={3000} placeholder={placeholder} className="min-h-24" /></div>)}
        </section>
      </fieldset>
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 [@media(max-height:850px)]:static" aria-label="Xem trước và lưu nhận xét">
        <section className="overflow-hidden rounded-xl border border-foreground bg-card shadow-neo">
          <div className="border-b border-foreground/15 bg-accent p-5 text-accent-foreground"><p className="flex items-center gap-2 text-[11px] font-bold"><BookOpen className="size-4" />PHỤ HUYNH SẼ THẤY</p><h2 className="mt-3 break-words text-2xl font-black">Nhìn lại việc học<br />của {data.student.name}.</h2><p className="mt-2 text-xs">Kỳ {form.month_year || 'chưa chọn'} · {published ? 'Đã gửi' : 'Đang soạn, chưa gửi'}</p></div>
          <div className="p-5 lg:max-h-[min(30dvh,240px)] lg:overflow-y-auto" tabIndex={0} role="region" aria-label="Nội dung nhận xét xem trước">
            <ReviewContent review={{ ...form, review_tags: snapshotReviewTags(readyTags) }} />
          </div>
        </section>
        <p className="text-xs leading-relaxed text-muted-foreground" aria-live="polite">{form.tags.length ? `${readyTags.length}/${form.tags.length} thẻ đủ thông tin để xem trước. ${incomplete ? 'Các thẻ còn thiếu thông tin sẽ cần hoàn thiện trước khi gửi.' : ''}` : 'Có thể chọn thẻ hoặc viết nhận xét bằng lời.'}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="min-h-11" disabled={!!busy || published} onClick={() => save('draft')}>{busy === 'draft' ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Save className="size-4" />}Lưu bản nháp</Button>
          <Button className="min-h-11" disabled={!!busy || published} onClick={() => save('published')}>{busy === 'published' ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Send className="size-4" />}{published ? 'Đã gửi nhận xét' : 'Gửi nhận xét'}</Button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">Bản nháp chỉ dành cho gia sư và quản trị. Nhận xét đã gửi sẽ xuất hiện trên cổng phụ huynh.</p>
        {(published || expectedUpdatedAt) && <Button variant="ghost" className="min-h-11 w-full" disabled={!!busy} onClick={newReview}><Plus className="size-4" />Tạo nhận xét mới</Button>}
        {dirty && <p className="text-xs font-medium text-primary">Có thay đổi chưa lưu.</p>}
      </aside>
    </div>
    <section className="rounded-xl border border-foreground/15 bg-card p-4 sm:p-6" aria-labelledby="review-history-title">
      <h2 id="review-history-title" className="text-xl font-extrabold">Nhận xét gần đây của bạn</h2><p className="mt-2 text-xs text-muted-foreground">Tối đa 30 nhận xét gần đây cho học sinh trong lớp này. Mở bản nháp để tiếp tục; nhận xét đã gửi được giữ nguyên.</p>
      <div className="mt-5 space-y-3">{data.reviews.map(review => <details key={review.review_id} className="rounded-xl border border-foreground/15">
        <summary className="cursor-pointer p-4 text-sm"><strong>Kỳ {review.month_year || 'chưa ghi'}</strong><span className="ml-3 rounded-full bg-secondary px-2.5 py-1 text-[11px]">{review.review_status === 'draft' ? 'Bản nháp' : 'Đã gửi'}</span>{review.review_context && <span className="mt-2 block text-xs text-muted-foreground">{review.review_context}</span>}</summary>
        <div className="space-y-4 border-t border-foreground/10 p-4"><ReviewContent review={review} />{review.review_status === 'draft' && <Button variant="outline" className="min-h-11" disabled={!!busy || review.review_id === reviewId} onClick={() => resumeReview(review)}>{review.review_id === reviewId ? 'Bản nháp đang mở' : 'Tiếp tục bản nháp'}</Button>}</div>
      </details>)}{!data.reviews.length && <p className="text-sm text-muted-foreground">Chưa có nhận xét nào cho học sinh trong lớp này.</p>}</div>
    </section>
  </div>;
}
