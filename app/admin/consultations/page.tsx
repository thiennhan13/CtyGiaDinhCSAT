'use client';
import { useCallback, useEffect, useState } from 'react';
import { consultationStatuses } from '@/lib/consultations';
import { intakeChoices } from '@/lib/intake';
import { goals, levels } from '@/lib/learning-guidance';
type Status = keyof typeof consultationStatuses;
type Row = { request_id: string; data: Record<string, string | number | boolean>; created_at: string; status: Status; revision: number; consultation_status_history: { old_status: Status; new_status: Status; revision: number; created_at: string }[] };
const field = 'min-h-11 rounded-lg border border-input bg-card px-3 py-2 text-sm';
const date = (v: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(v));
function label(group: Record<string, string>, value: unknown) { return group[String(value)] || String(value || 'Chưa cung cấp'); }
export default function ConsultationsAdmin() {
  const [rows, setRows] = useState<Row[]>([]), [status, setStatus] = useState(''), [course, setCourse] = useState('');
  const [offset, setOffset] = useState(0), [total, setTotal] = useState(0), [loading, setLoading] = useState(true), [busy, setBusy] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/consultations?' + new URLSearchParams({ status, course, offset: String(offset) }), { cache: 'no-store', signal });
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      if (!signal?.aborted) { setRows(data.data); setTotal(data.total); setError(''); }
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'Chưa tải được đơn.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [status, course, offset]);
  useEffect(() => { const c = new AbortController(); void load(c.signal); return () => c.abort(); }, [load]);
  async function update(row: Row, next: string) {
    if (busy) return; setBusy(row.request_id); setNotice('');
    try {
      const r = await fetch('/api/admin/consultations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', request_id: row.request_id, status: next, revision: row.revision }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      setNotice('Đã cập nhật trạng thái đơn.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa cập nhật được đơn.'); } finally { setBusy(''); }
  }
  return <div className="space-y-6"><header><p className="text-xs font-bold uppercase tracking-widest text-primary">Tiếp nhận & liên hệ</p><h1 className="text-3xl font-black mt-2">Đăng ký và tư vấn</h1><p className="text-sm text-muted-foreground mt-2">Theo dõi nhu cầu học tập và liên hệ để chọn lớp phù hợp.</p></header>
    <div className="flex flex-wrap gap-3 items-end"><label>Trạng thái<select className={field + ' block'} value={status} onChange={e => { setStatus(e.target.value); setOffset(0); }}><option value="">Tất cả</option>{Object.entries(consultationStatuses).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label><label>Khóa quan tâm<select className={field + ' block'} value={course} onChange={e => { setCourse(e.target.value); setOffset(0); }}><option value="">Tất cả</option>{Object.entries(intakeChoices.course).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label><button className={field} disabled={loading} onClick={() => void load()}>Tải lại</button><span>{total} đơn</span></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}{notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Đang tải…</p> : !rows.length && !error ? <p>Chưa có đơn trong nhóm này.</p> : rows.map(row => { const d = row.data; return <article key={row.request_id} className="csat-card p-5 space-y-4"><div className="flex justify-between gap-4 flex-wrap"><div><h2 className="text-lg font-bold">{String(d.name)}</h2><p className="text-sm text-muted-foreground">{label({ ...intakeChoices.role, university: 'Sinh viên (hồ sơ cũ)' }, d.role)} · {date(row.created_at)}</p></div><label>Trạng thái<select aria-label={'Trạng thái của ' + d.name} className={field + ' block'} disabled={!!busy} value={row.status} onChange={e => void update(row, e.target.value)}>{Object.entries(consultationStatuses).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label></div>
      <dl className="grid sm:grid-cols-2 gap-3 text-sm"><div><dt className="font-semibold">Điện thoại</dt><dd><a className="underline" href={'tel:' + d.phone}>{String(d.phone)}</a></dd></div><div><dt className="font-semibold">Email</dt><dd className="break-all">{String(d.email || 'Không cung cấp')}</dd></div><div><dt className="font-semibold">Khóa quan tâm</dt><dd>{d.course ? label(intakeChoices.course, d.course) : label({ 'co-ban': 'Cơ bản (hồ sơ cũ)', 'nang-cao': 'Nâng cao (hồ sơ cũ)', hsgqg: 'HSGQG (hồ sơ cũ)', consultation: 'Cần tư vấn' }, d.program)}</dd></div><div><dt className="font-semibold">Cấp học</dt><dd>{label({ ...levels, ...intakeChoices.level }, d.level)} {String(d.school_year || '')}</dd></div><div><dt className="font-semibold">Mục tiêu</dt><dd>{label({ ...goals, ...intakeChoices.goal }, d.goal)}</dd></div><div><dt className="font-semibold">Nền tảng</dt><dd>{label(intakeChoices.background, d.background)}</dd></div></dl>
      <p className="whitespace-pre-wrap break-words">{String(d.message || 'Không có lời nhắn.')}</p><details><summary className="cursor-pointer py-3 font-semibold">Nguồn và lịch sử xử lý</summary><p className="text-sm break-all">{String(d.source_path || 'Form cũ')} · {row.request_id}</p><p className="text-sm">{d.consent === true ? `Đồng ý lưu thông tin khi gửi: ${date(row.created_at)}` : 'Hồ sơ cũ chưa ghi nhận trường đồng ý lưu thông tin.'}</p><ul className="text-sm space-y-2 mt-3">{[...(row.consultation_status_history || [])].sort((a, b) => a.revision - b.revision).map(h => <li key={h.revision}>{date(h.created_at)} · {consultationStatuses[h.old_status]} → {consultationStatuses[h.new_status]}</li>)}</ul></details></article>; })}
    <nav className="flex items-center gap-3" aria-label="Phân trang đơn"><button className={field} disabled={!offset || loading} onClick={() => setOffset(v => Math.max(0, v - 50))}>Trang trước</button><span>Trang {Math.floor(offset / 50) + 1}</span><button className={field} disabled={offset + 50 >= total || loading} onClick={() => setOffset(v => v + 50)}>Trang sau</button></nav>
  </div>;
}
