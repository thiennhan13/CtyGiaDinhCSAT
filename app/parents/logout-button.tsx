'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function ParentLogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/parents/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="csat-btn no-underline text-sm bg-card text-foreground border-2 border-foreground shadow-neo flex items-center gap-1.5 cursor-pointer"
    >
      <LogOut className="w-3.5 h-3.5" />
      Đăng xuất
    </button>
  );
}
