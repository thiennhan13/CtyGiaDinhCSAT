'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function ParentLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function handleLogout() {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/parents/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Chưa đăng xuất được. Vui lòng thử lại.');
      router.replace('/login'); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Chưa đăng xuất được.'); }
    finally { setBusy(false); }
  }
  return <div><button onClick={handleLogout} disabled={busy} className="csat-btn text-sm bg-card border-2 border-foreground shadow-neo flex items-center gap-1.5">
    <LogOut className="w-3.5 h-3.5" />{busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
  </button>{error && <p role="alert" className="text-destructive text-xs mt-2">{error}</p>}</div>;
}