import Link from 'next/link';
import { Users, GraduationCap, Calendar, Receipt, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans text-slate-800 flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl">GĐ</div>
            <div>
              <h1 className="text-sm font-bold leading-tight uppercase">CÔNG TY GIA ĐÌNH</h1>
              <p className="text-[10px] text-slate-400 tracking-widest uppercase">CSAT TUTOR MS</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          <Link href="/admin/students" className="px-4 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
            Học sinh - Học phí
          </Link>
          <Link href="/admin/tutors" className="px-4 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
            Quản lý Gia sư
          </Link>
          <Link href="/admin/classes" className="px-4 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
            Quản lý Lớp học
          </Link>
          <Link href="/admin/billing" className="px-4 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
            Kế toán chốt sổ
          </Link>
        </nav>

        <div className="p-6 border-t border-slate-800">
          <form action="/api/auth/signout" method="POST">
             <button type="submit" className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border-none bg-transparent cursor-pointer justify-start">
               <LogOut className="h-5 w-5" />
               <span>Đăng xuất</span>
             </button>
           </form>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">Tổng quan hệ thống</h2>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Hệ thống Sẵn sàng</span>
          </div>
        </header>
        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
