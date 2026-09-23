'use client';
import { ParentShell } from '@/components/learning/ParentShell';
import { ParentLogoutButton } from './logout-button';
export default function ParentError({ reset }: { reset: () => void }) {
  return <ParentShell navigationEnabled={false}><div className="parent-card space-y-4"><h1 className="text-2xl font-bold">Chưa tải được cổng phụ huynh</h1>
    <p>Vui lòng thử lại sau. Nếu lỗi tiếp tục, hãy liên hệ CSAT.</p>
    <div className="flex flex-wrap gap-3"><button onClick={reset} className="csat-btn csat-btn--primary">Thử lại</button><ParentLogoutButton /></div>
  </div></ParentShell>;
}
