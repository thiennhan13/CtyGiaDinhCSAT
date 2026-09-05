'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function ParentPasswordForm() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (password !== confirmation) { setError('Hai lần nhập mật khẩu mới chưa khớp.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/parents/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: current, newPassword: password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrent(''); setPassword(''); setConfirmation(''); setMessage(data.message);
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa đổi được mật khẩu.'); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="csat-card space-y-5 p-6">
    <div className="space-y-2"><Label htmlFor="current-password">Mật khẩu hiện tại</Label><Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} maxLength={128} required /></div>
    <div className="space-y-2"><Label htmlFor="new-password">Mật khẩu mới</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={12} maxLength={128} required /><p className="text-xs text-muted-foreground">Ít nhất 12 ký tự. Nên dùng mật khẩu riêng cho CSAT.</p></div>
    <div className="space-y-2"><Label htmlFor="confirm-password">Nhập lại mật khẩu mới</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} minLength={12} maxLength={128} required /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    <Button type="submit" disabled={saving} className="w-full">{saving ? 'Đang lưu…' : 'Lưu mật khẩu mới'}</Button>
  </form>;
}
