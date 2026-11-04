'use client';
import { useState } from 'react';
import { useLoginCaptcha, type LoginCaptchaConfig } from './LoginCaptcha';
export function ParentLoginForm({ captcha, active = true }: { captcha?: LoginCaptchaConfig; active?: boolean }) {
  const verification = useLoginCaptcha(captcha, active, 'parent_login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(event: React.FormEvent) {
    event.preventDefault(); if (busy || !verification.ready) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/parents/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ captchaToken: verification.token }) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Chưa mở được đăng nhập Google.');
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa mở được đăng nhập.'); setBusy(false); verification.reset(); }
  }
  return <form onSubmit={login} className="space-y-4">
    <p className="text-sm text-muted-foreground">Đăng nhập Google, sau đó nhập số điện thoại đã đăng ký với CSAT để liên kết hồ sơ của con.</p>
    <button className="parent-google-button" disabled={busy || !verification.ready} type="submit" aria-busy={busy} aria-describedby={captcha?.enabled ? 'parent-google-verification-help' : undefined}>
      {/* Official Google sign-in asset; decorative alongside the visible label. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/auth/google-g.png" width={20} height={20} alt="" aria-hidden="true" />
      <span>{busy ? 'Đang mở Google…' : 'Đăng nhập bằng Google'}</span>
    </button>
    {captcha?.enabled && <p id="parent-google-verification-help" className="text-sm text-muted-foreground">Hoàn tất xác minh bên dưới để đăng nhập.</p>}
    {error && <p role="alert" className="rounded-lg border border-destructive p-3 text-destructive">{error}</p>}
    {verification.widget}
  </form>;
}
