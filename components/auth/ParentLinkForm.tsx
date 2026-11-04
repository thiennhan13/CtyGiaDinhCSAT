'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Link2, TriangleAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { normalizeParentPhone } from '@/lib/parents';
import styles from './parent-link.module.css';
export function ParentLinkForm() {
  const router = useRouter();
  const [phone, setPhone] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setReady(true); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    const value = normalizeParentPhone(phone);
    if (!value) { setError('Nhập số di động Việt Nam bắt đầu bằng 0 hoặc +84.'); input.current?.focus(); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/parents/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: value }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa liên kết được. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <section className={styles.stage} aria-labelledby="parent-link-title">
    <form onSubmit={submit} className={styles.card}>
      <header className={styles.heading}>
        <span className={styles.icon}><Link2 size={28} strokeWidth={2.5} aria-hidden="true" /></span>
        <h1 id="parent-link-title">Liên kết hồ sơ của con</h1>
        <p>Nhập số điện thoại phụ huynh đã đăng ký với CSAT để bắt đầu theo dõi việc học của con.</p>
      </header>
      <div className={styles.field}>
        <label htmlFor="link-phone">Số điện thoại</label>
        <Input ref={input} className={styles.input} id="link-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} required disabled={!ready || busy} value={phone} onChange={e => setPhone(e.target.value)} aria-invalid={!!error} aria-describedby={'link-hint' + (error ? ' link-error' : '')}/>
        <p id="link-hint" className={styles.hint}>Dùng số đã đăng ký với CSAT, bắt đầu bằng 0 hoặc +84.</p>
        {error && <p id="link-error" role="alert" className={styles.error}><TriangleAlert size={20} aria-hidden="true" /><span>{error}</span></p>}
      </div>
      <button type="submit" disabled={busy || !ready} aria-busy={busy} className={styles.submit}>
        <span>{busy ? 'Đang liên kết…' : 'Liên kết học sinh'}</span><ArrowRight size={22} aria-hidden="true" />
      </button>
      <p className={styles.note}>Mỗi tài khoản được liên kết với một học sinh.</p>
      <noscript><p className={styles.hint}>Vui lòng bật JavaScript để liên kết hồ sơ.</p></noscript>
    </form>
  </section>;
}
