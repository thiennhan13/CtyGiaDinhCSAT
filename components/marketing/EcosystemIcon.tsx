type EcosystemIconKind = 'practice' | 'community' | 'mentors' | 'parents';

/** Icon riêng cho hệ sinh thái: góc cắt, đường mạch và các điểm pixel. */
export function EcosystemIcon({ kind }: { kind: EcosystemIconKind }) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" aria-hidden="true" focusable="false">
    {kind === 'practice' ? <>
      <path d="M17 7h33l7 7v35M7 16h35l10 10v31H7zM42 16v10h10M7 31h45" />
      <path d="m17 39 6 5-6 5M29 49h10" /><path d="M13 24h3m4 0h3m4 0h3" strokeWidth="3" />
      <path d="M57 55h5v5h-5z" fill="currentColor" stroke="none" />
    </> : kind === 'community' ? <>
      <path d="M24 7h16v15H24zM7 42h16v15H7zM41 42h16v15H41z" />
      <path d="M32 22v10H15v10M32 32h17v10M23 49h18" />
      <path d="m27 13 3 3-3 3m8 0h3M11 49h8m26 0h8" />
      <path d="M29 29h6v6h-6z" fill="currentColor" stroke="none" />
    </> : kind === 'parents' ? <>
      <path d="M7 9h38l12 12v34H7zM45 9v12h12M7 25h50" />
      <path d="M14 18h3m4 0h3m4 0h3M15 46v-8m8 8V32m8 14V36M38 35h11m-11 7h8" />
      <path d="M15 51h18M48 51h5v5h-5z" fill="currentColor" stroke="none" />
    </> : <>
      <path d="M7 9h38l12 12v26H31L19 57V47H7zM45 9v12h12M7 26h50" />
      <path d="m23 32-6 5 6 5m18-10 6 5-6 5m-6-12-6 14M13 18h3m4 0h3m4 0h3" />
      <path d="M49 53h7v7h-7z" fill="currentColor" stroke="none" />
    </>}
  </svg>;
}
