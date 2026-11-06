type AuthUser = { app_metadata?: Record<string, unknown> } | null;
export type PortalRole = 'admin' | 'tutor' | 'parent';
export function portalRole(user: AuthUser): PortalRole | null {
  const meta = user?.app_metadata;
  if (meta?.role === 'admin' || meta?.role === 'tutor') return meta.role;
  const google = meta?.provider === 'google' || (Array.isArray(meta?.providers) && meta.providers.includes('google'));
  return google && (meta?.role == null || meta.role === 'parent') ? 'parent' : null;
}
export function portalHome(role: PortalRole | null) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'tutor') return '/tutor/dashboard';
  return role === 'parent' ? '/parents' : '/access-denied';
}
export function authRedirect(path: string, user: AuthUser, activeTutor = true): string | null {
  const area = path.split('/')[1];
  if (!['admin', 'tutor', 'parents', 'login'].includes(area)) return null;
  if (!user) return area === 'login' ? null : area === 'parents' ? '/login' : '/login?role=tutor';
  const role = portalRole(user);
  const home = portalHome(role === 'tutor' && !activeTutor ? null : role);
  if (area === 'login' || area !== (role === 'parent' ? 'parents' : role) || !activeTutor || path === '/tutor' || path === '/admin') return home;
  return null;
}
