import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import csatLogo from '@/public/icon/favicon-32x32.png';

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const rawRole = user.app_metadata?.role || 'tutor';
  const role = rawRole === 'admin' ? 'Admin' : 'Tutor';
  const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Người dùng';
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans text-slate-800 flex-col">
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-lg md:text-xl relative overflow-hidden">
             <Image src={csatLogo} alt="CSAT Logo" fill className="object-contain p-0.5" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-white uppercase">Hệ Thống CSAT</h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase truncate hidden sm:block">Gia Sư Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4 hidden md:flex">
             <Link href="/tutor/dashboard" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Trang chủ</Link>
             <Link href="/tutor/classes" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Lớp giảng dạy</Link>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-200 leading-none">{name}</p>
              <p className="text-[10px] font-bold text-indigo-400 uppercase mt-1">{role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 font-bold text-sm">
              {initials}
            </div>
          </div>
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
