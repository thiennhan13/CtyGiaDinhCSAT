'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LogOut, Menu, X,
  Home, Users, GraduationCap, Calendar, FileText, GitBranch,
  ChevronRight,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { GradientOrbs } from '@/components/GradientOrbs';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: string;
    initials: string;
  };
}

const navItems = [
  { href: '/admin/dashboard',   label: 'Trang chủ',          icon: Home },
  { href: '/admin/students',    label: 'Học sinh · Học phí',  icon: Users },
  { href: '/admin/tutors',      label: 'Quản lý Gia sư',      icon: GraduationCap },
  { href: '/admin/tutors-tree', label: 'Sơ đồ Gia sư',        icon: GitBranch },
  { href: '/admin/classes',     label: 'Quản lý Lớp học',     icon: Calendar },
  { href: '/admin/billing',     label: 'Kế toán chốt sổ',     icon: FileText },
];

/** Breadcrumb label mapping */
const PAGE_LABELS: Record<string, string> = {
  '/admin/dashboard':   'Trang chủ',
  '/admin/students':    'Học sinh · Học phí',
  '/admin/tutors':      'Quản lý Gia sư',
  '/admin/tutors-tree': 'Sơ đồ Gia sư',
  '/admin/classes':     'Quản lý Lớp học',
  '/admin/billing':     'Kế toán chốt sổ',
};

function getCurrentLabel(pathname: string): string {
  for (const [key, label] of Object.entries(PAGE_LABELS)) {
    if (pathname.startsWith(key)) return label;
  }
  return 'Admin';
}

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const currentLabel = getCurrentLabel(pathname);
  const showOrbs = pathname === '/admin/dashboard' || pathname === '/admin/tutors-tree';

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground flex-col md:flex-row relative">
      {/* Background Ambient Orbs */}
      {showOrbs && <GradientOrbs />}

      {/* Backdrop overlay — mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 flex flex-col shrink-0
          bg-sidebar border-r border-sidebar-border
          transform transition-transform duration-200 ease-out
          md:static md:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar Header — Glassmorphism + ThemeToggle */}
        <div className="glass-subtle p-4 border-b border-sidebar-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Image
                src="/icon/favicon-32x32.png"
                alt="CSAT Logo"
                width={34}
                height={34}
                className="w-[34px] h-[34px] rounded-lg bg-white shadow-sm"
                unoptimized
              />
              {/* 2-color dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full gradient-google border-2 border-sidebar" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-sidebar-foreground tracking-wide">
                CSAT Tutor
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Hệ thống Quản lý
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* ThemeToggle — góc trên sidebar */}
            <ThemeToggle className="h-8 w-8 text-muted-foreground hover:text-foreground" />
            {/* Close — mobile only */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-sm font-medium min-h-[44px]
                  transition-colors duration-150 cursor-pointer
                  ${isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-secondary hover:text-foreground'
                  }
                `}
              >
                {/* Active left indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-sidebar-primary rounded-r-full" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? 'text-sidebar-accent-foreground' : 'text-muted-foreground'}`}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3 h-3 text-sidebar-accent-foreground opacity-60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer — gọn */}
        <div className="p-2 border-t border-sidebar-border shrink-0">
          {/* User + Logout */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-semibold text-xs shrink-0 select-none">
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-none">{user.name}</p>
              <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mt-0.5">{user.role}</p>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors duration-150 cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Topbar — sticky glass header */}
        <header className="h-14 glass-subtle border-b border-border px-4 md:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-1.5 hover:bg-secondary rounded-lg text-muted-foreground transition-colors cursor-pointer"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground hidden sm:inline">Admin</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground hidden sm:inline" />
              <span className="text-sm font-semibold text-foreground">{currentLabel}</span>
            </div>
          </div>

          {/* Right: Online indicator */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Trực tuyến</span>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl space-y-6 animate-slide-up">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
