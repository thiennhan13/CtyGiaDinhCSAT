'use client';
import { useState } from 'react';
import { classProgramOptions, classProgramLabel } from '@/lib/class-programs';
export function ClassProgramEditor({ classId, code, revision, onSaved }: { classId: string; code?: string | null; revision?: number; onSaved: () => void }) {
  const [editing, setEditing] = useState(false), [next, setNext] = useState(code || ''), [reason, setReason] = useState(''), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!confirmed || busy) return; setBusy(true); setError('');
    try {
      const r = await fetch('/api/admin/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_program', class_id: classId, code: next, revision, reason }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.error);
      setEditing(false); setConfirmed(false); onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa đổi được phân loại.'); } finally { setBusy(false); }
  }
  return <section className="csat-card p-4 space-y-3"><div className="flex gap-4 items-center flex-wrap"><h2 className="font-bold">Chương trình: {classProgramLabel(code, 'Chưa phân loại')}</h2><button className="csat-btn" onClick={() => { setEditing(!editing); setNext(code || ''); }}>Đổi phân loại</button></div>{editing && <form onSubmit={save} className="space-y-3 max-w-xl"><label className="block">Chương trình<select className="block border border-input bg-background rounded-lg min-h-11 p-2 w-full" required value={next} onChange={e => setNext(e.target.value)}><option value="">Chọn chương trình</option>{classProgramOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label><label className="block">Lý do<input className="block border border-input bg-background rounded-lg min-h-11 p-2 w-full" required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label><label className="flex gap-2 items-start"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>Tôi xác nhận đổi phân loại. Giáo án đang công bố giữ nguyên; việc chọn giáo án khác được thực hiện trong mục Lộ trình.</span></label>{error && <p role="alert" className="text-destructive">{error}</p>}<button className="csat-btn" disabled={busy || !confirmed}>{busy ? 'Đang lưu…' : 'Xác nhận thay đổi'}</button></form>}</section>;
}
