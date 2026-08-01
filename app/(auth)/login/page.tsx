'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-mesh-google px-4 relative overflow-hidden">

      {/* Decorative floating orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/5 w-48 h-48 rounded-full bg-[#4285F4] opacity-[0.08] blur-3xl animate-float-1" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full bg-[#34A853] opacity-[0.07] blur-3xl animate-float-2" />
        <div className="absolute top-1/2 right-1/5 w-40 h-40 rounded-full bg-[#FBBC05] opacity-[0.09] blur-3xl animate-float-3" />
        <div className="absolute top-10 right-1/3 w-32 h-32 rounded-full bg-[#EA4335] opacity-[0.06] blur-3xl animate-float-1" />
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="glass rounded-2xl shadow-2xl shadow-black/10 p-8 space-y-6 border border-white/30 dark:border-white/10">

          {/* Logo & Title */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center ring-4 ring-primary/10">
                <Image
                  src="/icon/android-chrome-192x192.png"
                  alt="CSAT Logo"
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-xl"
                  unoptimized
                />
              </div>
              {/* Google color strip */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full gradient-google" />
            </div>
            <div className="space-y-1 pt-1">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Đăng nhập</h1>
              <p className="text-sm text-muted-foreground">Hệ thống Quản lý Gia sư CSAT</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ten@csat.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 bg-background/60 border-border focus:border-primary focus:ring-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 bg-background/60 border-border focus:border-primary focus:ring-primary pr-10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error alert */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 text-sm text-destructive bg-destructive/8 border border-destructive/20 p-3 rounded-lg animate-fade-in"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-semibold gap-2 transition-all duration-150 active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Đăng nhập
                </>
              )}
            </Button>
          </form>

          {/* Footer note */}
          <div className="pt-2 border-t border-border/60 text-center space-y-1">
            <p className="text-xs text-muted-foreground">Dành cho nội bộ Hệ Thống CSAT</p>
            <p className="text-xs text-muted-foreground">Gia sư dùng email được cấp · Mật khẩu mặc định là số điện thoại</p>
          </div>
        </div>
      </div>
    </div>
  );
}
