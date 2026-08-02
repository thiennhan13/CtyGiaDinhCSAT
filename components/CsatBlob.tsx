'use client';

interface CsatBlobProps {
  variant?: 'login' | 'dashboard';
}

/**
 * CsatBlob — Nền trang trí hữu cơ theo phong cách csatoj.vn
 * Gồm: 2 Blob màu lime + mint + Icon CSAT nổi lơ lửng
 */
export function CsatBlob({ variant = 'login' }: CsatBlobProps) {
  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Blob Lime — Góc trên trái */}
      <div
        style={{
          position: 'absolute',
          top: '-8%',
          left: '-6%',
          width: '45vw',
          height: '45vw',
          maxWidth: '650px',
          maxHeight: '650px',
          background: 'radial-gradient(circle, rgba(163,230,53,0.35) 0%, rgba(132,204,22,0.20) 40%, transparent 70%)',
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          filter: 'blur(55px)',
          opacity: 0.8,
          animation: 'csatBlobMorph 14s ease-in-out infinite',
        }}
      />

      {/* Blob Mint / Cyan — Góc dưới phải */}
      <div
        style={{
          position: 'absolute',
          bottom: '-6%',
          right: '-5%',
          width: '50vw',
          height: '50vw',
          maxWidth: '720px',
          maxHeight: '720px',
          background: 'radial-gradient(circle, rgba(6,182,212,0.28) 0%, rgba(8,145,178,0.15) 40%, transparent 70%)',
          borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
          filter: 'blur(65px)',
          opacity: 0.75,
          animation: 'csatBlobMorph 18s ease-in-out infinite reverse',
        }}
      />

      {/* Blob Accent Sky — Góc trên phải (nhỏ) */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          right: '-2%',
          width: '30vw',
          height: '30vw',
          maxWidth: '380px',
          maxHeight: '380px',
          background: 'radial-gradient(circle, rgba(56,189,248,0.20) 0%, transparent 65%)',
          borderRadius: '50% 50% 30% 70% / 30% 70% 50% 50%',
          filter: 'blur(50px)',
          opacity: 0.6,
          animation: 'csatBlobMorph 11s ease-in-out infinite 3s',
        }}
      />

      {/* Floating Icon 1 — CSAT Logo góc trái */}
      <img
        src="/icon/favicon-96x96.png"
        alt=""
        style={{
          position: 'absolute',
          top: variant === 'login' ? '12%' : '8%',
          left: variant === 'login' ? '4%' : '2%',
          width: '64px',
          height: '64px',
          opacity: 0.18,
          animation: 'csatFloaterDrift 9s ease-in-out infinite',
          filter: 'drop-shadow(0 4px 8px rgba(36,67,203,0.3))',
        }}
      />

      {/* Floating Icon 2 — CSAT Logo nhỏ góc dưới */}
      <img
        src="/icon/favicon-96x96.png"
        alt=""
        style={{
          position: 'absolute',
          bottom: variant === 'login' ? '18%' : '12%',
          left: variant === 'login' ? '8%' : '5%',
          width: '40px',
          height: '40px',
          opacity: 0.12,
          animation: 'csatFloaterDrift 12s ease-in-out infinite reverse 2s',
          filter: 'drop-shadow(0 4px 8px rgba(36,67,203,0.3))',
        }}
      />

      {/* Keyframes */}
      <style>{`
        @keyframes csatBlobMorph {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          25%       { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          50%       { border-radius: 50% 50% 40% 60% / 40% 60% 60% 40%; }
          75%       { border-radius: 40% 60% 50% 50% / 30% 40% 70% 60%; }
        }
        @keyframes csatFloaterDrift {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-18px) rotate(5deg); }
          66%       { transform: translateY(-8px) rotate(-4deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="csatBlobMorph"], [style*="csatFloaterDrift"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
