'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X, Home, Users, GraduationCap, Calendar, FileText, CheckCircle2, GitBranch } from 'lucide-react';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: string;
    initials: string;
  };
}

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      href: '/admin/dashboard',
      label: 'Trang chủ',
      icon: Home,
    },
    {
      href: '/admin/students',
      label: 'Học sinh - Học phí',
      icon: Users,
    },
    {
      href: '/admin/tutors',
      label: 'Quản lý Gia sư',
      icon: GraduationCap,
    },
    {
      href: '/admin/tutors-tree',
      label: 'Sơ đồ Gia sư',
      icon: GitBranch,
    },
    {
      href: '/admin/classes',
      label: 'Quản lý Lớp học',
      icon: Calendar,
    },
    {
      href: '/admin/billing',
      label: 'Kế toán chốt sổ',
      icon: FileText,
    },
  ];

  return (
    <div className="flex min-h-screen w-full bg-[#f1f3f4]/50 font-sans text-slate-800 flex-col md:flex-row relative">
      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#f8f9fa] border-r border-[#dadce0] flex flex-col shrink-0 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[#dadce0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/icon/favicon-32x32.png"
              alt="CSAT Logo"
              width={32}
              height={32}
              className="w-8 h-8 rounded-sm bg-white"
              unoptimized
            />
            <div>
              <h1 className="text-sm font-bold leading-tight text-slate-800 uppercase tracking-wide">CSAT TUTOR</h1>
              <p className="text-[9px] text-slate-500 font-medium tracking-wider uppercase">Hệ thống Quản lý</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1.5 hover:bg-slate-200 rounded-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`relative px-4 py-3 flex items-center gap-3 text-sm font-medium transition-all min-h-[44px] ${
                  isActive
                    ? 'bg-blue-50/70 text-blue-600 rounded-md font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md'
                }`}
              >
                {/* Google Style active left-border indicator */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[4px] bg-blue-600 rounded-r-md" />
                )}
                <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer (Logout) */}
        <div className="p-4 border-t border-[#dadce0]">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50/60 rounded-md transition-colors border-none bg-transparent cursor-pointer justify-start min-h-[44px]"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Đăng xuất</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main content container */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-[#dadce0] px-4 md:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger button on mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1.5 hover:bg-slate-100 rounded-sm text-slate-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline-block">Đang trực tuyến</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider sm:hidden">Online</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-none">{user.name}</p>
              <p className="text-[10px] font-semibold text-blue-600 uppercase mt-0.5 tracking-wider">{user.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 select-none">
              {user.initials}
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl space-y-6">
            {children}
          </div>
        </div>
      </main>

      {/* Google Orb — decorative, góc phải dưới, không cản UI */}
      <div
        aria-hidden="true"
        className="fixed bottom-0 right-0 pointer-events-none z-0 w-56 h-56 overflow-hidden"
      >
        {/* Blue */}
        <div className="absolute bottom-4 right-4 w-24 h-24 rounded-full bg-[#4285f4] opacity-[0.18] blur-2xl" />
        {/* Yellow */}
        <div className="absolute bottom-12 right-20 w-16 h-16 rounded-full bg-[#fbbc05] opacity-[0.22] blur-2xl" />
        {/* Green */}
        <div className="absolute bottom-20 right-6 w-14 h-14 rounded-full bg-[#34a853] opacity-[0.18] blur-2xl" />
      </div>
    </div>
  );
}
