import Image from 'next/image';
import Link from 'next/link';
import { CsatNavbar } from '@/components/layout/CsatNavbar';
import { CsatBackground } from '@/components/CsatBackground';
import { ArrowRight, Trophy, BookOpen, GraduationCap, Award, Target, Zap, Users, ExternalLink, Facebook } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <CsatBackground />
      <CsatNavbar variant="guest" />

      {/* ════════════════════════════════════════════════════════
          SECTION 1: HERO — Thông điệp chính
          ════════════════════════════════════════════════════════ */}
      <section
        className="flex flex-col lg:grid lg:grid-cols-2 items-center justify-center min-h-screen"
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 1440,
          margin: '0 auto',
          padding: '100px 24px 60px',
          gap: 'clamp(40px, 6vw, 80px)',
        }}
      >
        {/* LEFT: Hero text */}
        <div style={{ flex: '1 1 0', minWidth: 0, width: '100%' }} className="flex flex-col gap-10">
          <div className="animate-fade-in">
            {/* Badges */}
            <div className="flex gap-2 flex-wrap mb-5">
              <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>CSAT Tutor</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-csat-lime/20 border border-csat-lime/40 text-foreground text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">
                <span>✦</span><span>C++ · Competitive Programming</span>
              </div>
            </div>

            <h1 className="font-heading font-black text-[clamp(2rem,4.2vw,3.36em)] text-foreground leading-[1.12] tracking-[-0.015em] mb-4">
              Học sinh giỏi Quốc gia Tin học{' '}
              <span className="text-primary">chưa bao giờ</span>{' '}
              là một hành trình dễ dàng.
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6 max-w-[520px]">
              Đó là cuộc đua của tư duy, của sự kiên trì và của hàng nghìn giờ luyện tập phía sau những dòng code. Nhưng một <strong className="text-foreground">lộ trình đúng đắn</strong> có thể giúp bạn đi nhanh hơn, đi xa hơn.
            </p>

            {/* CTA buttons */}
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/login"
                className="csat-btn csat-btn--primary no-underline text-[0.9em]"
              >
                Cổng Phụ Huynh
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              <a
                href="https://csatoj.vn"
                target="_blank"
                rel="noopener noreferrer"
                className="csat-btn no-underline text-[0.9em] bg-card text-foreground border-2 border-foreground shadow-neo"
              >
                Truy cập CSATOJ.VN
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* CSAT-Mark Hero Art Box */}
          <div className="animate-slide-up relative max-w-[480px]">
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
            <div
              className="absolute -top-3.5 -right-3 bg-csat-lime text-foreground font-heading font-extrabold text-[1.23em] px-[18px] py-2 rounded-xl border-[3px] border-foreground rotate-[2.5deg] uppercase tracking-wide whitespace-nowrap z-10"
              style={{ boxShadow: '4px 4px 0 var(--shadow-color)' }}
            >
              TUYỂN SINH 2026
            </div>
          </div>
        </div>

        {/* RIGHT: Thành tích Đội ngũ + CTA */}
        <div className="animate-slide-up w-full max-w-[520px] shrink-0 mx-auto space-y-6">
          {/* Giới thiệu Đội ngũ Card */}
          <div className="csat-card bg-card p-7 relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-black text-[1.35rem] text-foreground tracking-tight">
                Gặp gỡ Đội ngũ Gia sư
              </h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              Đằng sau mỗi buổi học chất lượng là những người thầy, người anh đã từng trải qua chính hành trình mà các bạn học sinh đang hướng tới hôm nay.
            </p>

            {/* Stats thành tích */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-amber-500/10 border-2 border-foreground rounded-xl p-4 text-center shadow-neo-hover">
                <Award className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                <div className="font-heading font-black text-2xl text-foreground">1</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Giải Nhất QG</div>
              </div>
              <div className="bg-slate-400/10 border-2 border-foreground rounded-xl p-4 text-center shadow-neo-hover">
                <Trophy className="w-6 h-6 text-slate-500 mx-auto mb-1.5" />
                <div className="font-heading font-black text-2xl text-foreground">8</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Giải Nhì QG</div>
              </div>
              <div className="bg-amber-700/10 border-2 border-foreground rounded-xl p-4 text-center shadow-neo-hover">
                <Trophy className="w-6 h-6 text-amber-700 mx-auto mb-1.5" />
                <div className="font-heading font-black text-2xl text-foreground">1</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Giải Ba QG</div>
              </div>
            </div>

            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Các anh đã từng là những học sinh chuyên Tin. Và hôm nay, họ sẵn sàng <strong className="text-foreground">đồng hành để giúp thế hệ tiếp theo tiến xa hơn</strong> 🚀
            </p>
          </div>

          {/* Quick Nav Card */}
          <div className="csat-card bg-card p-5 relative z-10">
            <h3 className="text-[0.85rem] font-bold uppercase tracking-wider mb-3">Dành cho Phụ Huynh & Gia Sư</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/login" className="flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-semibold hover:bg-accent transition-colors no-underline text-foreground">
                <Users className="w-4 h-4 text-primary" />
                Phụ huynh
              </Link>
              <Link href="/tutor" className="flex items-center justify-center gap-2 py-2.5 border border-border rounded-lg text-sm font-semibold hover:bg-accent transition-colors no-underline text-foreground">
                <GraduationCap className="w-4 h-4 text-green-500" />
                Gia sư
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 2: LỘ TRÌNH & 3 GIÁ TRỊ CỐT LÕI
          ════════════════════════════════════════════════════════ */}
      <section
        className="relative z-10"
        style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}
      >
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full tracking-wide mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>Tại sao chọn CSAT?</span>
          </div>
          <h2 className="font-heading font-black text-[clamp(1.5rem,3vw,2.25rem)] text-foreground mb-3">
            Lộ trình bài bản, trọng tâm đề thi
          </h2>
          <p className="text-muted-foreground max-w-[600px] mx-auto text-sm md:text-base leading-relaxed">
            Từ kiến thức nền tảng về thuật toán, cấu trúc dữ liệu đến các chuyên đề chuyên sâu thường xuất hiện trong đề thi HSGQG — CSAT Tutor xây dựng chương trình học tập bài bản.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-slide-up">
          {/* Card 1: Lộ trình */}
          <div className="csat-card bg-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-bold text-base text-foreground mb-2">
              Lộ trình rõ ràng
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tiến thẳng đến trọng tâm đề thi, không lan man. Tiết kiệm thời gian quý báu cho học sinh.
            </p>
          </div>

          {/* Card 2: Chữa bài */}
          <div className="csat-card bg-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>
            <div className="w-11 h-11 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-heading font-bold text-base text-foreground mb-2">
              Chữa bài chi tiết
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nhận xét cụ thể về bài làm, mức độ kiến thức và góp ý hoàn thiện — kể cả khi đã kết thúc buổi học.
            </p>
          </div>

          {/* Card 3: Kho bài tập */}
          <div className="csat-card bg-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>
            <div className="w-11 h-11 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="font-heading font-bold text-base text-foreground mb-2">
              Kho bài tập CSATOJ
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Hệ thống chấm bài tự động, cập nhật liên tục, chọn lọc phù hợp. Luyện tập mọi lúc 24/7.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 3: FOOTER CTA
          ════════════════════════════════════════════════════════ */}
      <section
        className="relative z-10"
        style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 60px' }}
      >
        <div className="csat-card bg-card p-8 md:p-10 text-center animate-fade-in">
          <h2 className="font-heading font-black text-xl md:text-2xl text-foreground mb-3">
            Sẵn sàng bắt đầu hành trình?
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-[480px] mx-auto">
            Với CSAT Tutor, mục tiêu không chỉ là giúp học sinh giải được bài toán, mà còn là xây dựng tư duy lập trình, khả năng tự học và sự tự tin.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/login"
              className="csat-btn csat-btn--primary no-underline text-[0.9em]"
            >
              Cổng Phụ Huynh
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <a
              href="https://facebook.com/csat.tutor"
              target="_blank"
              rel="noopener noreferrer"
              className="csat-btn no-underline text-[0.9em] bg-card text-foreground border-2 border-foreground shadow-neo"
            >
              <Facebook className="w-3.5 h-3.5" />
              Liên hệ tư vấn
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
