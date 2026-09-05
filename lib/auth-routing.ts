type AuthUser = { app_metadata?: Record<string, unknown> } | null;
export function authRedirect(pathname: string, user: AuthUser): string | null {
  const within = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);
  const role = user?.app_metadata?.role || 'tutor';
  const home = role === 'admin' ? '/admin/dashboard' : role === 'parent' ? '/parents' : '/tutor/dashboard';
  if (within('/parents')) return !user ? '/login' : role !== 'parent' ? home : null;
  if (within('/admin')) return !user ? '/tutor' : role !== 'admin' ? home : null;
  if (pathname.startsWith('/tutor/')) return !user ? '/tutor' : role === 'parent' ? '/parents' : null;
  if (pathname === '/login' && user && role === 'parent') return '/parents';
  if (pathname === '/tutor' && user) return home;
  return null;
}
