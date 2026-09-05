'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle, Phone, Search, BookOpen, Trophy, UserCheck,
  ExternalLink, Facebook,
} from 'lucide-react';
import { CsatBackground } from '@/components/CsatBackground';
import { CsatNavbar } from '@/components/layout/CsatNavbar';
import { cn } from '@/lib/utils';
import { normalizeParentPhone } from '@/lib/parents';



// ─── Dynamic Stats Hook ──────────────────────────────────────
function usePortalStats() {
  const stats = { tutors: '20+', classes: '50+', sessions: '350+' };
  const loaded = true;
  return { stats, loaded };
}

// ─── Form Phụ Huynh ──────────────────────────────────────────
function ParentForm() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const clean = normalizeParentPhone(phone);
    if (!clean) {
      setError('Vui lòng nhập số di động Việt Nam, bắt đầu bằng 0 hoặc +84.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/parents/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra.');
      }
      
      router.replace('/parents');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="parent-phone" className="text-sm font-semibold text-foreground">
          Số điện thoại Phụ huynh
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="parent-phone"
            type="tel"
            inputMode="numeric"
            placeholder="0912 345 678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="username"
            maxLength={30}
            className="pl-9 h-11 bg-background border border-input rounded-xl text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Nhập số điện thoại đã đăng ký với trung tâm CSAT
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="parent-password">Mật khẩu</Label>
        <Input id="parent-password" type="password" autoComplete="current-password" required maxLength={128}
          value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-xl" />
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2 bg-secondary border border-border rounded-lg p-3 text-[13px] text-muted-foreground">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <span>Đăng nhập bằng mật khẩu do admin cấp. Nếu chưa có tài khoản hoặc quên mật khẩu, vui lòng liên hệ CSAT.</span>
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
            <Search className="w-4 h-4" />
            Truy cập cổng thông tin
          </>
        )}
      </button>
    </form>
  );
}

// ─── StatCard ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, bgClass, iconClass }: { icon: any, label: string, value: string, bgClass: string, iconClass: string }) {
  return (
    <div className="bg-card border-2 border-foreground rounded-[14px] px-4 py-[18px] shadow-neo-hover text-center flex-1 min-w-0">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2.5", bgClass)}>
        <Icon className={cn("w-[18px] h-[18px]", iconClass)} />
      </div>
      <div className="font-heading font-black text-[1.5em] text-foreground leading-[1.1]">
        {value}
      </div>
      <div className="text-[0.72em] font-bold text-muted-foreground uppercase tracking-[0.04em] mt-1">
        {label}
      </div>
    </div>
  );
}

// ─── Main Login Page ──────────────────────────────────────────
export default function LoginPage() {
  const { stats, loaded } = usePortalStats();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background: Cream + Dot Grid + Blobs + Watermark */}
      <CsatBackground />

      {/* ── Floating Pill Navbar ── */}
      <CsatNavbar variant="guest" />

      {/* ── MAIN: 2 cột ── */}
      <main
        className="flex flex-col lg:grid lg:grid-cols-2 items-center justify-center min-h-screen"
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 1440,
          margin: '0 auto',
          padding: '80px 24px 40px',
          gap: 'clamp(40px, 6vw, 80px)',
        }}
      >
        {/* ── LEFT: Hero text + Art Box + Stats ── */}
        <div style={{ flex: '1 1 0', minWidth: 0, width: '100%' }} className="flex flex-col gap-10">

          {/* ── Hero Text ── */}
          <div className="animate-fade-in">
            {/* 3 Sticker badges */}
            <div className="flex gap-2 flex-wrap mb-4">
              <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>Nền tảng CSATOJ</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-csat-lime/20 border border-csat-lime/40 text-foreground text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">
                <span>✦</span><span>C++</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">
                <span>✦</span><span>Lập trình thi đấu</span>
              </div>
            </div>

            <h1 className="font-heading font-black text-[clamp(2.16em,4.2vw,3.36em)] text-foreground leading-[1.14] tracking-[-0.015em] mb-3 uppercase">
              Luyện thi{' '}
              <span className="text-primary">HSG Tin học</span>{' '}
              &amp; <span className="text-sky-500">Chuyên Tin</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base text-muted-foreground leading-relaxed mb-5 max-w-[420px]">
              Gia sư chuyên Tin, lộ trình 6 giai đoạn, luyện đề với chấm bài tự động ngay trên nền tảng CSAT.
            </p>

            {/* 2 CTA buttons */}
            <div className="flex gap-3 flex-wrap">
              <a
                href="https://csatoj.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="csat-btn csat-btn--primary no-underline text-[0.9em]"
              >
                Truy cập CSATOJ.VN
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://facebook.com/csat.tutor"
                target="_blank"
                rel="noopener noreferrer"
                className="csat-btn no-underline text-[0.9em] bg-card text-foreground border-2 border-foreground shadow-neo"
              >
                <Facebook className="w-3.5 h-3.5" />
                Liên hệ
              </a>
            </div>
          </div>

          {/* ── CSAT-Mark Hero Art Box ── */}
          <div className="animate-slide-up relative max-w-[480px]">
            {/* Main card with retro shadow */}
            <div
              className="bg-card border-[3px] border-foreground rounded-2xl overflow-hidden -rotate-[1.5deg] transition-transform duration-200 hover:-rotate-[0.5deg] hover:scale-[1.01]"
              style={{ boxShadow: '9px 9px 0 var(--shadow-color)' }}
            >
              <Image
                src="/images/csat-mark.png"
                alt="CSAT Online — Trust Me Bro. Tin Anh."
                width={960}
                height={480}
                className="w-full h-auto block"
                priority
                unoptimized
              />
            </div>

            {/* Sticker — "TUYỂN SINH 2026" */}
            <div
              className="absolute -top-3.5 -right-3 bg-csat-lime text-foreground font-heading font-extrabold text-[1.23em] px-[18px] py-2 rounded-xl border-[3px] border-foreground rotate-[2.5deg] uppercase tracking-wide whitespace-nowrap z-10"
              style={{ boxShadow: '4px 4px 0 var(--shadow-color)' }}
            >
              TUYỂN SINH 2026
            </div>
          </div>

          {/* ── Stats Section ── */}
          <div className="animate-slide-up">
            <p className="text-[0.72em] font-bold text-muted-foreground uppercase tracking-[0.06em] mb-3">
              // HỆ THỐNG GIA SƯ · THỐNG KÊ NHANH
            </p>
            <div className="flex gap-3">
              <StatCard
                icon={BookOpen}
                label="Buổi học"
                value="350+"
                bgClass="bg-primary/10"
                iconClass="text-primary"
              />
              <StatCard
                icon={Trophy}
                label="Lớp đang hoạt động"
                value="50+"
                bgClass="bg-csat-lime/20"
                iconClass="text-foreground"
              />
              <StatCard
                icon={UserCheck}
                label="Gia sư"
                value="20+"
                bgClass="bg-green-500/10"
                iconClass="text-green-600 dark:text-green-400"
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT: Login Card ── */}
        <div className="animate-slide-up w-full max-w-[500px] shrink-0 mx-auto">
          {/* White card — csatoj.vn card style */}
          <div className="csat-card bg-card p-8 relative z-10">
            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-2">
                <div className="w-14 h-14 bg-card border-2 border-border rounded-xl flex items-center justify-center shadow-sm">
                  <Image src="/icon/android-chrome-192x192.png" alt="CSAT" width={40} height={40} className="rounded-lg" unoptimized />
                </div>
                {/* Lime dot accent */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-csat-lime border-2 border-border rounded-full" />
              </div>
              <h2 className="font-heading font-black text-[1.3rem] text-foreground tracking-[-0.01em]">
                Cổng Phụ Huynh CSAT
              </h2>
              <p className="text-[0.8rem] text-muted-foreground mt-0.5">Tra cứu thông tin học sinh và kết quả học tập</p>
            </div>

            <ParentForm />

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-border text-center">
              <p className="text-[0.72rem] text-muted-foreground">Dành riêng cho Phụ huynh học sinh Trung Tâm CSAT</p>
            </div>
          </div>

          {/* Mobile branding under card */}
          <div className="lg:hidden flex items-center justify-center gap-2 mt-5">
            <Image src="/icon/favicon-32x32.png" alt="CSAT" width={20} height={20} className="rounded" unoptimized />
            <span className="text-[0.8rem] text-muted-foreground">CSAT · csatoj.vn</span>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center py-5 px-6 text-[0.75rem] text-muted-foreground border-t border-border bg-background/80">
        <div className="max-w-[800px] mx-auto">
          <p className="mb-1">
            © 2025 CSAT · Hệ thống Quản lý Gia sư&nbsp;|&nbsp;Chuyên luyện thi HSG Tin học &amp; Chuyên Tin
          </p>
          <p>
            <a
              href="https://www.facebook.com/csat.tutor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold no-underline hover:underline"
            >
              Facebook CSAT
            </a>
            &nbsp;·&nbsp;
            <a
              href="https://csatoj.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold no-underline hover:underline"
            >
              csatoj.vn
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}