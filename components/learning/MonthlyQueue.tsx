'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getVietnamMonthRange } from '@/lib/calendar';
import type { MonthlyRow } from '@/lib/learning';
const labels = { missing: 'Chưa viết', draft: 'Bản nháp', published: 'Đã gửi' };
export function MonthlyQueue({ admin = false }: { admin?: boolean }) {
  const [month,setMonth] = useState(getVietnamMonthRange().startDate.slice(0,7));
  const [rows,setRows] = useState<MonthlyRow[]>([]);
  const [filter,setFilter] = useState('all');
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setRows([]);
    fetch('/api/learning?month='+month, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error); if (!controller.signal.aborted) setRows(data);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month]);
  return <section className="space-y-5">
    <header><h1 className="text-3xl font-black">Nhận xét tháng</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">Mỗi học sinh một nhận xét trong tháng cho từng lớp. Ngày 28, hệ thống nhắc gia sư và gửi tổng hợp cho admin khi email đã được kích hoạt. Admin chốt sổ học phí riêng theo thực tế.</p></header>
    <div className="flex flex-wrap items-end gap-4"><label className="space-y-2 text-sm">Tháng nhận xét<input aria-label="Tháng nhận xét" type="month" value={month} onChange={e => setMonth(e.target.value)} className="block min-h-11 rounded-lg border bg-background px-3" /></label><label className="space-y-2 text-sm">Trạng thái<select className="block min-h-11 rounded-lg border bg-background px-3" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Tất cả</option>{Object.entries(labels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading ? <p role="status">Đang tải danh sách…</p> : error ? null : <>
      <div className="grid grid-cols-3 gap-3">{Object.entries(labels).map(([key,label]) => <div key={key} className="rounded-xl border bg-card p-4"><strong className="text-2xl">{rows.filter(r => r.status === key).length}</strong><p className="mt-2 text-xs">{label}</p></div>)}</div>
      <div className="space-y-3">{rows.filter(r => filter === 'all' || r.status === filter).map(r => <div key={r.class_id+'-'+r.student_id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4"><div><strong>{r.student_name}</strong><p className="mt-1 text-xs text-muted-foreground">{r.class_name}{admin && ' · '+(r.tutor_name || 'Chưa phân gia sư')}</p>{!r.actionable && <p className="mt-2 text-xs text-amber-700">Cần admin kiểm tra phân công hoặc tình trạng theo học.</p>}</div><div className="flex items-center gap-3"><span className="text-xs">{labels[r.status]}</span>{!admin && r.actionable && <Link className="csat-btn text-xs" href={'/tutor/classes/'+r.class_id+'/students/'+r.student_id+'/review?month='+month}>{r.status === 'published' ? 'Xem nhận xét' : 'Mở nhận xét'}</Link>}{admin && <Link className="csat-btn text-xs" href={'/admin/learning/'+r.class_id+'?month='+month}>Xem lớp</Link>}</div></div>)}</div>
      {!rows.length && <p className="rounded-xl border border-dashed p-6 text-sm">Chưa có học sinh với buổi học trong tháng đã chọn.</p>}
    </>}
  </section>;
}
