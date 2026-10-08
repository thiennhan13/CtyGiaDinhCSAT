'use client';
import { useState } from 'react';
export function ParentCodeCopy({ code }: { code: string }) {
  const [status, setStatus] = useState('Sao chép');
  return <button className="parent-code-copy print:hidden" type="button" aria-live="polite" onClick={async () => {
    try { await navigator.clipboard.writeText(code); setStatus('Đã sao chép'); }
    catch { setStatus('Hãy chọn và sao chép mã'); }
  }}>{status}</button>;
}
