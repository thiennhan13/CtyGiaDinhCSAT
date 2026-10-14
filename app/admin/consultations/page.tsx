'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Copy, Inbox, Phone, RefreshCw, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { consultationStatuses } from '@/lib/consultations';
import { intakeChoices } from '@/lib/intake';
import { goals, levels } from '@/lib/learning-guidance';

type Status = keyof typeof consultationStatuses;
type Row = { request_id: string; data: Record<string, string | number | boolean>; created_at: string; status: Status; revision: number; consultation_status_history: { old_status: Status; new_status: Status; revision: number; created_at: string }[] };
const initialFilters = { status: '', course: '', source: '', q: '', from: '', to: '' };
const field = 'min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50';
const tones: Record<Status, string> = { new: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30', contacted: 'bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30', completed: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30' };
const icons = { new: Inbox, contacted: Phone, completed: CheckCircle2 };
const date = (v: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(v));
function label(group: Record<string, string>, value: unknown) { return group[String(value)] || String(value || 'Chưa cung cấp'); }
function courseName(d: Row['data']) { return d.course ? label(intakeChoices.course, d.course) : label({ 'co-ban': 'Cơ bản (hồ sơ cũ)', 'nang-cao': 'Nâng cao (hồ sơ cũ)', hsgqg: 'HSGQG (hồ sơ cũ)', consultation: 'Cần tư vấn' }, d.program); }
function sourceName(d: Row['data']) { const path = String(d.source_path || ''); return path === '/dang-ky-hoc' ? 'Trang đăng ký học' : path.startsWith('/lo-trinh/') ? `Lộ trình lớp ${path.split('/').at(-1)?.toUpperCase()}` : path === '/lo-trinh' ? 'Tổng quan lộ trình' : path === '/' ? 'Trang giới thiệu' : 'Form cũ'; }
function Badge({ status }: { status: Status }) { return <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${tones[status]}`}>{consultationStatuses[status]}</span>; }

export default function ConsultationsAdmin() {
  const [rows, setRows] = useState<Row[]>([]), [filters, setFilters] = useState(initialFilters), [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0), [total, setTotal] = useState(0), [counts, setCounts] = useState<Record<Status, number> | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [conflict, setConflict] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [detailError, setDetailError] = useState('');
  const [selected, setSelected] = useState<Row | null>(null), [nextStatus, setNextStatus] = useState<Status>('new');
  const pending = useRef<AbortController | null>(null), generation = useRef(0), saving = useRef(false);
  const load = useCallback(async () => {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    const current = ++generation.current; setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin/consultations?' + new URLSearchParams({ ...filters, offset: String(offset) }), { cache: 'no-store', signal: controller.signal });
      const result = await r.json(); if (!r.ok) throw new Error(result.error || 'Chưa tải được đơn.');
      if (current !== generation.current || controller.signal.aborted) return;
      setRows(result.data); setTotal(result.total); setCounts({ new: result.newCount, contacted: result.contactedCount, completed: result.completedCount });
      setSelected(previous => previous ? result.data.find((row: Row) => row.request_id === previous.request_id) || null : null);
      setConflict(false); setDetailError('');
    } catch (e) { if (current === generation.current && !controller.signal.aborted) setError(e instanceof Error ? e.message : 'Chưa tải được đơn. Vui lòng thử lại.'); }
    finally { if (current === generation.current && !controller.signal.aborted) setLoading(false); }
  }, [filters, offset]);
  useEffect(() => { void load(); return () => { pending.current?.abort(); generation.current++; }; }, [load]);
  function filter(key: keyof typeof filters, value: string) { setFilters(v => ({ ...v, [key]: value })); setOffset(0); }
  function submitSearch(event: FormEvent) { event.preventDefault(); filter('q', search.trim()); }
  function open(row: Row) { setSelected(row); setNextStatus(row.status); setDetailError(''); setConflict(false); setNotice(''); }
  async function update() {
    if (!selected || saving.current || conflict || loading) return;
    saving.current = true; setBusy(true); setNotice(''); setDetailError('');
    try {
      const r = await fetch('/api/admin/consultations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', request_id: selected.request_id, status: nextStatus, revision: selected.revision }) });
      const result = await r.json(); if (!r.ok) { if (r.status === 409) setConflict(true); throw new Error(result.error || 'Chưa cập nhật được đơn.'); }
      setSelected(null); setNotice('Đã cập nhật trạng thái đơn.'); await load();
    } catch (e) { setDetailError(e instanceof Error ? e.message : 'Chưa cập nhật được đơn. Vui lòng thử lại.'); }
    finally { saving.current = false; setBusy(false); }
  }
  async function copyPhone(phone: string) {
    try { await navigator.clipboard.writeText(phone); setNotice('Đã sao chép số điện thoại.'); }
    catch { setNotice('Chưa sao chép được. Bạn có thể chọn số điện thoại để sao chép thủ công.'); }
  }
  const active = Object.values(filters).some(Boolean);
  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Tiếp nhận & liên hệ</p><h1 className="mt-2 text-3xl font-black">Đăng ký & tư vấn</h1><p className="mt-2 text-sm text-muted-foreground">Mỗi nhu cầu học tập, một bước kết nối. Theo dõi và xử lý các đơn tại đây.</p></div><button className={field + ' inline-flex items-center gap-2'} disabled={loading || busy} onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />Tải lại</button></header>
    <section aria-label="Tổng hợp tất cả đơn" className="grid grid-cols-1 gap-3 sm:grid-cols-3">{(Object.keys(consultationStatuses) as Status[]).map(status => { const Icon = icons[status]; return <button key={status} aria-pressed={filters.status === status} onClick={() => filter('status', filters.status === status ? '' : status)} className={`rounded-2xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${tones[status]} ${filters.status === status ? 'ring-2 ring-current' : ''}`}><span className="flex items-center justify-between text-sm font-semibold">{consultationStatuses[status]}<Icon size={19} aria-hidden="true" /></span><strong className="mt-3 block text-3xl tabular-nums">{counts?.[status] ?? '—'}</strong><span className="text-xs">Trong toàn bộ danh sách</span></button>; })}</section>
    <section className="rounded-2xl border bg-card p-4 sm:p-5" aria-label="Tìm và lọc đơn">
      <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 basis-56 text-sm font-medium">Tên hoặc số điện thoại<input className={field + ' mt-2 w-full'} value={search} maxLength={100} placeholder="Nhập thông tin cần tìm…" onChange={e => setSearch(e.target.value)} /></label><button className={field + ' inline-flex items-center gap-2'} type="submit"><Search size={17} aria-hidden="true" />Tìm kiếm</button></form>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm">Trạng thái<select aria-label="Trạng thái" className={field + ' mt-2 w-full'} value={filters.status} onChange={e => filter('status', e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(consultationStatuses).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        <label className="text-sm">Khóa quan tâm<select aria-label="Khóa quan tâm" className={field + ' mt-2 w-full'} value={filters.course} onChange={e => filter('course', e.target.value)}><option value="">Tất cả khóa học</option>{Object.entries(intakeChoices.course).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
        <label className="text-sm">Nguồn gửi<select aria-label="Nguồn gửi" className={field + ' mt-2 w-full'} value={filters.source} onChange={e => filter('source', e.target.value)}><option value="">Tất cả nguồn</option><option value="enrollment">Trang đăng ký học</option><option value="roadmap">Các trang lộ trình</option><option value="legacy">Form cũ</option></select></label>
        <label className="min-w-0 text-sm">Từ ngày<input type="date" className={field + ' mt-2 w-full min-w-0'} value={filters.from} onChange={e => filter('from', e.target.value)} /></label>
        <label className="min-w-0 text-sm">Đến ngày<input type="date" className={field + ' mt-2 w-full min-w-0'} value={filters.to} onChange={e => filter('to', e.target.value)} /></label>
      </div>{active && <button className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary" onClick={() => { setSearch(''); setFilters(initialFilters); setOffset(0); }}><X size={16} aria-hidden="true" />Xóa bộ lọc</button>}
    </section>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error} <button className="min-h-11 underline" onClick={() => void load()}>Thử tải lại</button></div>}
    <p role="status" className="text-sm text-muted-foreground">{notice || (loading ? 'Đang tải danh sách…' : `${total} đơn${active ? ' phù hợp bộ lọc' : ''} · Mới nhất trước`)}</p>
    <section aria-label="Danh sách đăng ký và tư vấn" aria-busy={loading}>
      {loading ? <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">Đang tải…</div> : error ? null : !rows.length ? <div className="rounded-2xl border border-dashed bg-card px-6 py-14 text-center"><Inbox className="mx-auto mb-4 text-muted-foreground" size={32} aria-hidden="true" /><h2 className="text-lg font-bold">{active ? 'Không tìm thấy đơn phù hợp' : 'Chưa có đơn đăng ký hoặc tư vấn'}</h2><p className="mt-2 text-sm text-muted-foreground">{active ? 'Thử đổi từ khóa hoặc xóa bộ lọc để xem thêm đơn.' : 'Các yêu cầu được gửi thành công sẽ xuất hiện tại đây.'}</p></div> : <div className="overflow-hidden rounded-2xl border bg-card">
        <div aria-hidden="true" className="hidden grid-cols-[1.6fr_1.2fr_1.2fr_1fr_auto] gap-4 border-b bg-muted/50 px-5 py-3 text-xs font-bold uppercase tracking-wide lg:grid"><span>Người liên hệ</span><span>Khóa quan tâm</span><span>Nguồn & thời gian</span><span>Trạng thái</span><span>Chi tiết</span></div>
        {rows.map(row => <article key={row.request_id} className="grid gap-4 border-b p-5 last:border-0 lg:grid-cols-[1.6fr_1.2fr_1.2fr_1fr_auto] lg:items-center"><div className="min-w-0"><h2 className="break-words font-bold">{String(row.data.name)}</h2><a href={'tel:' + row.data.phone} className="inline-flex min-h-11 items-center gap-2 text-sm text-primary"><Phone size={14} aria-hidden="true" />{String(row.data.phone)}</a><p className="text-xs text-muted-foreground">{label({ ...intakeChoices.role, university: 'Sinh viên (hồ sơ cũ)' }, row.data.role)}</p></div><p className="text-sm font-medium">{courseName(row.data)}</p><div className="text-sm"><p>{sourceName(row.data)}</p><time className="mt-1 block text-xs text-muted-foreground" dateTime={row.created_at}>{date(row.created_at)}</time></div><div><Badge status={row.status} /></div><button className={field + ' font-semibold text-primary'} onClick={() => open(row)} aria-label={'Xem đơn của ' + row.data.name}>Xem đơn</button></article>)}
      </div>}
    </section>
    <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Phân trang đơn"><span>Trang {Math.floor(offset / 50) + 1} · Tối đa 50 đơn/trang</span><div className="flex gap-2"><button className={field} disabled={!offset || loading || busy} onClick={() => setOffset(v => Math.max(0, v - 50))}>Trang trước</button><button className={field} disabled={offset + 50 >= total || loading || busy} onClick={() => setOffset(v => v + 50)}>Trang sau</button></div></nav>
    <Dialog open={!!selected} onOpenChange={open => { if (!open && !saving.current) setSelected(null); }}><DialogContent overlayClassName="z-[600]" className="z-[610] max-h-[90dvh] overflow-y-auto p-5 sm:max-w-2xl sm:p-7" showCloseButton={false}>
      {selected && <><div className="flex items-start justify-between gap-4"><div><DialogTitle className="break-words text-xl font-bold">{String(selected.data.name)}</DialogTitle><DialogDescription className="mt-1">{sourceName(selected.data)} · {date(selected.created_at)}</DialogDescription></div><button className={field + ' shrink-0'} disabled={busy} onClick={() => setSelected(null)} aria-label="Đóng chi tiết đơn"><X size={18} aria-hidden="true" /></button></div><Badge status={selected.status} />
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 p-3"><a className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary" href={'tel:' + selected.data.phone}><Phone size={17} aria-hidden="true" />{String(selected.data.phone)}</a><button className={field + ' inline-flex items-center gap-2'} onClick={() => void copyPhone(String(selected.data.phone))}><Copy size={15} aria-hidden="true" />Sao chép số</button></div>{notice && <p role="status" className="text-sm">{notice}</p>}
        <dl className="grid gap-5 text-sm sm:grid-cols-2">{[['Người gửi', label(intakeChoices.role, selected.data.role)], ['Email', String(selected.data.email || 'Không cung cấp')], ['Khóa quan tâm', courseName(selected.data)], ['Cấp học / lớp', `${label({ ...levels, ...intakeChoices.level }, selected.data.level)} ${selected.data.school_year || ''}`], ['Mục tiêu', label({ ...goals, ...intakeChoices.goal }, selected.data.goal)], ['Nền tảng', label(intakeChoices.background, selected.data.background)]].map(([title, value]) => <div key={title} className="min-w-0"><dt className="mb-1 text-muted-foreground">{title}</dt><dd className="break-words font-medium">{value}</dd></div>)}</dl>
        <section className="rounded-xl border p-4"><h3 className="mb-2 font-semibold">Lời nhắn</h3><p className="whitespace-pre-wrap break-words leading-relaxed">{String(selected.data.message || 'Không có lời nhắn.')}</p></section>
        <details className="border-y py-2"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Nguồn và lịch sử xử lý</summary><p className="break-all text-xs text-muted-foreground">{String(selected.data.source_path || 'Form cũ')} · {selected.request_id}</p><p className="mt-3 text-sm">{selected.data.consent === true ? `Đồng ý lưu thông tin khi gửi: ${date(selected.created_at)}` : 'Hồ sơ cũ chưa ghi nhận trường đồng ý lưu thông tin.'}</p><ol className="mt-3 space-y-2 text-sm">{[...(selected.consultation_status_history || [])].sort((a, b) => a.revision - b.revision).map(h => <li key={h.revision}>{date(h.created_at)} · {consultationStatuses[h.old_status]} → {consultationStatuses[h.new_status]}</li>)}</ol></details>
        {detailError && <p role="alert" className="text-sm text-destructive">{detailError}</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {conflict ? <button className={field} disabled={loading} onClick={() => void load()}>Tải lại thông tin đơn</button> : <div className="flex flex-wrap items-end gap-3"><label className="flex-1 text-sm font-medium">Cập nhật trạng thái<select aria-label={'Trạng thái của ' + selected.data.name} className={field + ' mt-2 w-full'} disabled={busy || loading} value={nextStatus} onChange={e => setNextStatus(e.target.value as Status)}>{Object.entries(consultationStatuses).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label><button className="min-h-11 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50" disabled={busy || loading || nextStatus === selected.status} onClick={() => void update()}>{busy ? 'Đang lưu…' : 'Lưu trạng thái'}</button></div>}
      </>}
    </DialogContent></Dialog>
  </div>;
}
