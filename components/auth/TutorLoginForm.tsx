'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Users, LogIn, Eye, EyeOff } from 'lucide-react';

export function TutorLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Rate limit check trước khi gọi Supabase
      const rlRes = await fetch('/api/auth/rate-limit', { method: 'POST' });
      if (!rlRes.ok) {
        const rlData = await rlRes.json();
        throw new Error(rlData.error || 'Quá nhiều yêu cầu. Vui lòng thử lại sau.');
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Chỉ dùng role do server quản lý để điều hướng sau đăng nhập.
      const role = data.user.app_metadata?.role || 'tutor';

      if (role === 'admin' || role === 'superadmin') {
        router.push('/admin/dashboard');
      } else if (role === 'tutor' || role === 'staff') {
        router.push('/tutor/dashboard');
      } else {
        await supabase.auth.signOut();
        throw new Error('Tài khoản không có quyền truy cập hệ thống gia sư.');
      }
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
    } finally {
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
          <a href="https://zalo.me/0916246867" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary hover:underline">Hỗ trợ đăng nhập</a>
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

      <button
        type="submit"
        disabled={loading}
        className="csat-btn csat-btn--primary w-full h-11 flex justify-center items-center text-[0.95em]"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
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

