type AuthUser = { app_metadata?: Record<string, unknown> } | null;
export function authRedirect(pathname: string, user: AuthUser): string | null {
  const within = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  const role = user?.app_metadata?.role || 'tutor';
  const home = role === 'admin' ? '/admin/dashboard' : role === 'parent' ? '/login' : '/tutor/dashboard';
  if (within('/parents') || pathname === '/login') return null;
  if (within('/admin')) return !user ? '/tutor' : role !== 'admin' ? home : null;
  if (pathname.startsWith('/tutor/')) return !user ? '/tutor' : role === 'parent' ? '/login' : null;
  if (pathname === '/tutor' && user) return home;
  return null;
}
