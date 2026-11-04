'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
type Payment = { payment_id: string; student_name: string; class_name: string; period: string; amount: number; balance: number };
const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
export default function TutorPaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Payment | null>(null);
  const requestId = useRef('');
  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch('/api/tutor/payments', { cache: 'no-store' }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setRows(data.payments); }
    catch (e) { setError(e instanceof Error ? e.message : 'Chưa tải được chứng từ.'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function receive() {
    if (!selected || busy) return; setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/tutor/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId: selected.payment_id, requestId: requestId.current, expectedBalance: Number(selected.balance) }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      setSelected(null); setNotice('Đã ghi nhận tiền đã thu.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa xác nhận được kết quả. Có thể thử lại cùng yêu cầu.'); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-5xl space-y-6"><h1 className="text-2xl font-bold">Ghi nhận thu học phí</h1><p>Chứng từ đã chốt của lớp đang phụ trách. Chỉ xác nhận khi đã nhận đủ khoản còn đóng.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}{notice && <p role="status">{notice}</p>}
    {selected && <section aria-label="Xác nhận thu tiền" className="csat-card space-y-4 p-5"><h2 className="font-bold">{selected.student_name} · {selected.class_name}</h2><p>{selected.period} · Xác nhận đã nhận {money(Number(selected.balance))}</p><div className="flex gap-3"><button className="csat-btn" disabled={busy} onClick={receive}>Xác nhận đã thu đủ</button><button className="csat-btn" disabled={busy} onClick={() => setSelected(null)}>Hủy</button></div></section>}
    {loading ? <p role="status">Đang tải…</p> : <div className="space-y-3">{rows.map(p => <article key={p.payment_id} className="csat-card flex flex-wrap items-center justify-between gap-4 p-4"><div><h2 className="font-bold">{p.student_name}</h2><p>{p.class_name} · {p.period}</p><p>{Number(p.balance) > 0 ? 'Còn đóng' : Number(p.balance) < 0 ? 'Dư / cần admin xử lý' : 'Đã đủ'}: {money(Math.abs(Number(p.balance)))}</p></div><button className="csat-btn" disabled={busy || Number(p.balance) <= 0} onClick={() => { requestId.current = crypto.randomUUID(); setSelected(p); setError(''); }}>Đã thu tiền</button></article>)}{!rows.length && <p>Chưa có chứng từ đã chốt thuộc lớp đang phụ trách.</p>}</div>}
  </main>;
}
