/**
 * CsatBackground — Background chính thức CSAT Portal (4-Layer Stacking Architecture)
 * 100% match csatoj.vn style.css:
 *   - Blob Lime (RIGHT): hình tròn #d9e64c, top-right
 *   - Blob Mint: hình tròn rgba(13,127,110,0.16), dưới lime
 *   - Watermark "C+SAT": text-stroke outline, rotate(-5deg), theme-reactive stroke
 *   - 2 Floaters: favicon-96x96.png, 52px, opacity 0.5
 *   - Responsive: mobile blob nhỏ hơn, floaters ẩn ≤1250px
 */
export function CsatBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
    >
      {/* ── Responsive styles ── */}
      <style>{`
        .csat-floater { display: block; }
        @media (max-width: 1250px) {
          .csat-floater { display: none !important; }
        }
        @media (max-width: 760px) {
          .csat-blob--lime {
            top: -22vw !important;
            right: -26vw !important;
            width: 52vw !important;
            height: 52vw !important;
          }
          .csat-blob--mint { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .csat-blob--lime, .csat-blob--mint,
          .csat-floater { transition: none !important; }
        }
      `}</style>

      {/* ── Blob Lime — hình TRÒN, csatoj.vn exact ── */}
      <div
        className="csat-blob--lime fixed top-[-15vw] right-[-13vw] w-[36vw] h-[36vw] rounded-full bg-[#d9e64c] pointer-events-none"
      />

      {/* ── Blob Mint — hình tròn nhỏ, csatoj.vn exact ── */}
      <div
        className="csat-blob--mint fixed top-[20vw] right-[-6vw] w-[15vw] h-[15vw] rounded-full bg-[rgba(13,127,110,0.16)] dark:bg-[rgba(13,127,110,0.25)] pointer-events-none"
      />

      {/* ── Watermark "C+SAT" — text-stroke outline, csatoj.vn body::before ── */}
      <div
        className="csat-watermark fixed top-[2vh] left-[-3vw] rotate-[-5deg] whitespace-nowrap pointer-events-none"
      >
        C+SAT
      </div>

      {/* ── Floater 1 — left side, csatoj.vn exact ── */}
      <img
        src="/icon/favicon-96x96.png"
        alt=""
        className="csat-floater fixed w-[52px] h-[52px] opacity-50 rounded-[14px] shadow-sm pointer-events-none rotate-[-8deg] left-[1.2vw] top-[38vh]"
      />

      {/* ── Floater 2 — right side, csatoj.vn exact ── */}
      <img
        src="/icon/favicon-96x96.png"
        alt=""
        className="csat-floater fixed w-[52px] h-[52px] opacity-50 rounded-[14px] shadow-sm pointer-events-none rotate-[7deg] right-[1.1vw] top-[64vh]"
      />
    </div>
  );
}
