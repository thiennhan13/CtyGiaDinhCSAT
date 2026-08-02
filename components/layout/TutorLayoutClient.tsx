'use client';

import { CsatBackground } from '@/components/CsatBackground';
import { CsatNavbar } from '@/components/layout/CsatNavbar';

interface TutorLayoutClientProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: string;
    initials: string;
  };
}

export function TutorLayoutClient({ children, user }: TutorLayoutClientProps) {
  return (
    <div className="min-h-screen w-full text-foreground relative">
      {/* CSAT Background: Cream + Dot Grid + Blobs + Watermark + Floaters */}
      <CsatBackground />

      {/* Floating Pill Navbar — csatoj.vn style */}
      <CsatNavbar variant="tutor" user={user} />

      {/* ─── Main content — offset for floating nav ─── */}
      <main
        style={{
          paddingTop: 92,
          paddingBottom: 40,
          paddingLeft: 24,
          paddingRight: 24,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="mx-auto max-w-5xl space-y-6 animate-slide-up">
          {children}
        </div>
      </main>

      {/* ── Responsive padding ── */}
      <style>{`
        @media (max-width: 760px) {
          main { padding-top: 68px !important; padding-left: 12px !important; padding-right: 12px !important; }
        }
      `}</style>
    </div>
  );
}
