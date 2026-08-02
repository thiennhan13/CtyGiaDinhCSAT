'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home, BookOpen, FileText, Trophy, Users, GraduationCap,
  Calendar, GitBranch, DollarSign, Info, LogOut, Menu, X, Sun, Moon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/* ================================================================
   CSAT Floating Pill Navbar — exact csatoj.vn style (Design Token Compliant)
   ================================================================ */

// ── Nav item definition ─────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor: string;
  activeBg: string;
  activeText: string;
  children?: { href: string; label: string }[];
}

// ── Admin nav items ─────────────────────────────────────────────
const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard',   label: 'Trang chủ',      icon: Home,          iconColor: '#38a9f0', activeBg: 'rgba(56,169,240,0.12)',  activeText: '#1272b8' },
  { href: '/admin/students',    label: 'Học sinh',        icon: Users,         iconColor: '#7d2fc4', activeBg: 'rgba(125,47,196,0.12)',  activeText: '#6f29ae' },
  { href: '/admin/tutors',      label: 'Gia sư',         icon: GraduationCap, iconColor: '#108a51', activeBg: 'rgba(16,138,81,0.12)',   activeText: '#0e7a47',
    children: [
      { href: '/admin/tutors-tree', label: 'Sơ đồ Gia sư' },
    ],
  },
  { href: '/admin/classes',     label: 'Lớp học',        icon: Calendar,      iconColor: '#2b50e0', activeBg: 'rgba(43,80,224,0.12)',   activeText: '#2b50e0' },
  { href: '/admin/billing',     label: 'Kế toán',        icon: FileText,      iconColor: '#ee4f2e', activeBg: 'rgba(238,79,46,0.12)',   activeText: '#c43a1c' },
];

// ── Tutor nav items ─────────────────────────────────────────────
const tutorNavItems: NavItem[] = [
  { href: '/tutor/dashboard', label: 'Trang chủ',      icon: Home,          iconColor: '#38a9f0', activeBg: 'rgba(56,169,240,0.12)',  activeText: '#1272b8' },
  { href: '/tutor/classes',   label: 'Lớp giảng dạy',  icon: BookOpen,      iconColor: '#2b50e0', activeBg: 'rgba(43,80,224,0.12)',   activeText: '#2b50e0' },
  { href: '/tutor/salary',    label: 'Bảng Lương',      icon: DollarSign,    iconColor: '#108a51', activeBg: 'rgba(16,138,81,0.12)',   activeText: '#0e7a47' },
];

// ── Guest/Landing nav items ─────────────────────────────────────
const guestNavItems: NavItem[] = [
  { href: '/login',         label: 'Phụ huynh',     icon: Users,         iconColor: '#7d2fc4', activeBg: 'rgba(125,47,196,0.12)',  activeText: '#6f29ae' },
  { href: '/tutor',         label: 'Gia sư',        icon: GraduationCap, iconColor: '#108a51', activeBg: 'rgba(16,138,81,0.12)',   activeText: '#0e7a47' },
  { href: 'https://csatoj.vn/awards/', label: 'Vinh danh', icon: Trophy, iconColor: '#f59e0b', activeBg: 'rgba(245,158,11,0.12)', activeText: '#b45309' },
  { href: 'https://csatoj.vn/users/',  label: 'Bảng xếp hạng', icon: Trophy, iconColor: '#38a9f0', activeBg: 'rgba(56,169,240,0.12)', activeText: '#1272b8' },
];

// ── Props ───────────────────────────────────────────────────────
interface CsatNavbarProps {
  variant: 'admin' | 'tutor' | 'login' | 'guest';
  user?: {
    name: string;
    role: string;
    initials: string;
  };
}

// ── Theme Toggle ────────────────────────────────────────────────
function CsatThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted ? (resolvedTheme === 'dark') : false;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Chuyển đổi sáng/tối"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title="Chuyển đổi giao diện"
      className="shrink-0 relative box-border w-12 h-[26px] mx-1 px-0 border border-border rounded-full bg-secondary shadow-inner cursor-pointer transition-colors"
    >
      <span
        className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full bg-card shadow-sm flex items-center justify-center text-[11px] transition-all duration-200",
          isDark ? "left-6" : "left-0.5"
        )}
      >
        {isDark
          ? <Moon className="w-3 h-3 text-primary" />
          : <Sun className="w-3 h-3 text-amber-500" />
        }
      </span>
    </button>
  );
}

// ── Main Navbar Component ───────────────────────────────────────
export function CsatNavbar({ variant, user }: CsatNavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Select nav items by variant
  const navItems = variant === 'admin' ? adminNavItems
                 : variant === 'tutor' ? tutorNavItems
                 : variant === 'guest' ? guestNavItems
                 : [];

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  return (
    <nav
      ref={navRef}
      className="fixed top-2.5 left-3 right-3 pointer-events-none"
      style={{ zIndex: 500 }}
    >
      {/* ── Pill container ── */}
      <div
        id="nav-container"
        className="pointer-events-auto mx-auto h-[58px] bg-card/95 backdrop-blur-md border border-border rounded-full shadow-sm flex items-center px-3 gap-0"
      >
        {/* ── Hamburger — mobile ── */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="csat-navicon text-foreground p-2 bg-transparent border-none cursor-pointer transition-colors rounded-full"
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
          style={{ display: 'none' }}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* ── Logo ── */}
        <Link
          href={variant === 'admin' ? '/admin/dashboard' : variant === 'tutor' ? '/tutor/dashboard' : '/'}
          className="flex items-center px-2 py-0 h-11 bg-transparent no-underline shrink-0"
        >
          <Image
            src="/icon/csat-nav-logo.png"
            alt="CSAT"
            width={30}
            height={30}
            className="h-[30px] w-auto rounded-lg block"
            unoptimized
          />
        </Link>

        {/* ── Nav items — desktop ── */}
        <ul
          id="nav-list"
          className="csat-nav-list flex items-center m-0 p-0 min-w-0 list-none flex-1"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isExternal = item.href.startsWith('http');
            const isActive = !isExternal && pathname.startsWith(item.href);
            const hasSubmenu = item.children && item.children.length > 0;

            return (
              <li
                key={item.href}
                className="block relative"
                onMouseEnter={() => hasSubmenu && setOpenSubmenu(item.href)}
                onMouseLeave={() => hasSubmenu && setOpenSubmenu(null)}
              >
                  {item.href.startsWith('http') ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-1.5 no-underline font-heading font-bold text-[13.5px] px-3.5 h-[38px] rounded-full mx-0.5 whitespace-nowrap transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: item.iconColor }} />
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-1.5 no-underline font-heading font-bold text-[13.5px] px-3.5 h-[38px] rounded-full mx-0.5 whitespace-nowrap transition-colors cursor-pointer",
                        isActive
                          ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground font-extrabold"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <Icon
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: isActive ? undefined : item.iconColor }}
                      />
                      {item.label}
                    </Link>
                  )}

                {/* ── Submenu dropdown ── */}
                {hasSubmenu && openSubmenu === item.href && (
                  <ul
                    className="absolute top-full left-1 min-w-[12em] bg-card border border-border rounded-xl shadow-lg p-1.5 m-0 list-none z-510 animate-fade-in"
                  >
                    {/* Invisible hover bridge */}
                    <div className="absolute left-0 right-0 bottom-full h-2" />
                    {item.children!.map((child) => (
                      <li key={child.href} className="block">
                        <Link
                          href={child.href}
                          className="flex items-center h-9 rounded-lg px-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/50 no-underline transition-colors cursor-pointer"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        {/* ── Right section: user links ── */}
        <div
          id="user-links"
          className="flex items-center gap-0.5 ml-auto shrink-0"
        >
          {/* Theme toggle */}
          <CsatThemeToggle />

          {user ? (
            <div className="flex items-center gap-1">
              <div
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-full cursor-pointer hover:bg-accent/50 transition-colors font-heading font-bold text-[13px] text-foreground"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary select-none">
                  {user.initials}
                </div>
                <span className="csat-nav-username whitespace-nowrap">{user.name}</span>
              </div>

              {/* Logout */}
              <form action="/api/auth/signout" method="POST" className="m-0">
                <button
                  type="submit"
                  title="Đăng xuất"
                  className="flex items-center justify-center w-8 h-8 rounded-full border-none bg-transparent text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          ) : variant === 'guest' || variant === 'login' ? (
            /* ── Not logged in: guest/login specific buttons can go here if needed ── */
            null
          ) : null}
        </div>
      </div>

      {/* ── Mobile dropdown menu ── */}
      {mobileOpen && (
        <ul
          className="csat-mobile-menu pointer-events-auto fixed top-16 left-2 w-60 bg-card border border-border rounded-2xl shadow-xl p-2 m-0 list-none z-510 animate-fade-in"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isExternal = item.href.startsWith('http');
            const isActive = !isExternal && pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                {isExternal ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 no-underline font-heading font-bold text-[13.5px] px-3.5 h-10 rounded-xl transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: item.iconColor }} />
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 no-underline font-heading font-bold text-[13.5px] px-3.5 h-10 rounded-xl transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: item.iconColor }} />
                    {item.label}
                  </Link>
                )}
                {/* Sub-items */}
                {item.children?.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center h-9 rounded-lg pl-8 pr-3 text-[13px] font-semibold no-underline transition-colors cursor-pointer",
                      pathname.startsWith(child.href)
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    {child.label}
                  </Link>
                ))}
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Responsive CSS — show hamburger, hide nav-list on mobile ── */}
      <style>{`
        @media (max-width: 760px) {
          .csat-navicon { display: flex !important; }
          .csat-nav-list { display: none !important; }
          .csat-nav-username { display: none !important; }
          #nav-container {
            height: 48px !important;
            border-radius: 16px !important;
            padding: 0 6px !important;
          }
        }
      `}</style>
    </nav>
  );
}
