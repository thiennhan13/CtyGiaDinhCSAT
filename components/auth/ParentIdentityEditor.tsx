'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
export function ParentIdentityEditor({ parentId, identity, onSaved }: { parentId: string; identity: { auth_uid: string; state: string; revision: number } | null; onSaved: () => void }) {
  const [email, setEmail] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function change(blocked: boolean) {
    if (busy) return; setBusy(true); setError('');
    try {
      let uid = identity?.auth_uid;
      if (!blocked && email.trim()) {
        const found = await fetch('/api/admin/parents?view=google&q=' + encodeURIComponent(email.trim()), { cache: 'no-store' });
        const data = await found.json(); if (!found.ok || data.users?.length !== 1) throw new Error('Không tìm thấy tài khoản đã đăng nhập Google với email này.');
        uid = data.users[0].id;
      }
      if (!uid) throw new Error('Nhập email tài khoản Google đã đăng nhập.');
      const res = await fetch('/api/admin/parents/identity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentId, authUid: uid, revision: identity?.revision ?? 0, reason, blocked }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error); setEmail(''); setReason(''); onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa lưu được liên kết.'); } finally { setBusy(false); }
  }
  return <details className="rounded-lg border p-3"><summary className="cursor-pointer font-medium">Google: {identity ? identity.state === 'active' ? 'Đã liên kết' : 'Đã khóa' : 'Chưa liên kết'}</summary>
    <div className="mt-4 space-y-3"><p className="text-sm">Chuyển quyền sẽ ngừng quyền của tài khoản cũ ngay khi lưu.</p>
      <label className="block text-sm">Email Google nhận quyền<Input type="email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} placeholder="Nhập khi chuyển tài khoản"/></label>
      <label className="block text-sm">Lý do<Input required maxLength={2000} value={reason} onChange={e => setReason(e.target.value)}/></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={busy || !reason.trim()} onClick={() => change(false)} className="csat-btn">Xác nhận liên kết</button>
      {identity && <button type="button" disabled={busy || !reason.trim()} onClick={() => change(true)} className="csat-btn">Khóa quyền</button>}</div>
    </div></details>;
}
