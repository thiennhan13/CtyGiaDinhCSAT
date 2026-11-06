'use client';
import { publicZaloUrl } from '@/lib/public-contact';
import { LoadingSpinner } from '@/components/ui/LoadingStatus';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Users, LogIn, Eye, EyeOff } from 'lucide-react';
import { useLoginCaptcha, type LoginCaptchaConfig } from './LoginCaptcha';

export function TutorLoginForm({ captcha, active = true }: { captcha?: LoginCaptchaConfig; active?: boolean }) {
  const verification = useLoginCaptcha(captcha, active, 'staff_login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!verification.ready) { setError('Vui lòng hoàn tất xác minh bảo mật.'); return; }
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', { method: 'POST', signal: AbortSignal.timeout(20000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, captchaToken: verification.token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Chưa đăng nhập được.');
      window.location.replace(result.redirectUrl);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('Email hoặc mật khẩu không chính xác.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Đã xảy ra lỗi không xác định.');
      }
      verification.reset();
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="tutor-email" className="text-sm font-semibold text-foreground">
          Email / Tên đăng nhập
        </Label>
        <div className="relative">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="tutor-email"
            type="email"
            placeholder="giasu@csatoj.vn"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="pl-9 h-11 bg-background border border-input rounded-xl text-sm"
          />
        </div>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label htmlFor="tutor-password" className="text-sm font-semibold text-foreground">
            Mật khẩu
          </Label>
          <a href={publicZaloUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:underline">Hỗ trợ đăng nhập</a>
        </div>
        <div className="relative">
          <Input
            id="tutor-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="pl-3 pr-10 h-11 bg-background border border-input rounded-xl text-sm font-mono tracking-wider"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors border-none bg-transparent"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 text-[13px] text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {verification.widget}
      <button
        type="submit"
        aria-busy={loading}
        disabled={loading || !verification.ready}
        className="csat-btn csat-btn--primary w-full h-11 flex justify-center items-center text-[0.95em]"
      >
        {loading ? (
          <>
            <LoadingSpinner compact />
            Đang đăng nhập...
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            Đăng nhập hệ thống
          </>
        )}
      </button>
    </form>
  );
}

