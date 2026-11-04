'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { normalizeParentPhone } from '@/lib/parents';
export function ParentLinkForm() {
  const router = useRouter();
  const [phone, setPhone] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    const value = normalizeParentPhone(phone);
    if (!value) { setError('Nhập số di động Việt Nam bắt đầu bằng 0 hoặc +84.'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/parents/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: value }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa liên kết được. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="max-w-md space-y-4"><h1 className="text-2xl font-bold">Liên kết hồ sơ của con</h1>
    <p>Nhập số điện thoại phụ huynh đã đăng ký với CSAT. Mỗi tài khoản được liên kết với một học sinh.</p>
    <label className="block space-y-2" htmlFor="link-phone"><span>Số điện thoại</span><Input id="link-phone" type="tel" autoComplete="tel" maxLength={30} required disabled={!ready || busy} value={phone} onChange={e => setPhone(e.target.value)} aria-invalid={!!error} aria-describedby={error ? 'link-error' : undefined}/></label>
    {error && <p id="link-error" role="alert" className="text-destructive">{error}</p>}
    <button type="submit" disabled={busy || !ready} className="csat-btn csat-btn--primary min-h-11">{busy ? 'Đang liên kết…' : 'Liên kết học sinh'}</button>
  </form>;
}
