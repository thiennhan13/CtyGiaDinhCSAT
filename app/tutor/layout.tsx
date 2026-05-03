import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans text-slate-800 flex-col">
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-lg md:text-xl">GĐ</div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-white uppercase">CÔNG TY GIA ĐÌNH</h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase truncate hidden sm:block">Gia Sư Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4 hidden md:flex">
             <Link href="/tutor/dashboard" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Lịch Dạy & Điểm Danh</Link>
        </div>
        <div className="flex items-center gap-4">
          <form action="/api/auth/signout" method="POST">
             <button type="submit" className="flex items-center gap-2 px-3 justify-center py-1.5 md:px-4 md:py-2 text-sm text-red-400 font-bold hover:bg-slate-800 rounded-lg transition-colors bg-transparent border-none cursor-pointer">
               <LogOut className="h-4 w-4 md:h-5 md:w-5" />
               <span className="hidden sm:inline">Đăng xuất</span>
             </button>
           </form>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
