import type { Metadata } from 'next';
import { ContactEntry } from '@/components/auth/ContactEntry';
import { loginCaptchaPresentation } from '@/lib/login-captcha';
import { redirect } from 'next/navigation';
import { parentSession } from '@/lib/parent-auth';
export const metadata: Metadata = { title: 'Trang liên lạc — CSAT', robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  if (query.role !== 'tutor') {
    const session = await parentSession();
    const staff = ['admin', 'tutor'].includes(session?.user.app_metadata?.role ?? '');
    // Resume the verified session. The destination still checks current DB access,
    // including unlinked/blocked states; an explicit staff entry remains available.
    if (session && (!staff || session.access.state !== 'unlinked')) redirect('/parents');
  }
  return <>{query.error === 'google' && <p role="alert" className="mx-auto max-w-lg p-4 text-destructive">Đăng nhập Google chưa hoàn tất hoặc phiên xác nhận đã hết hạn. Vui lòng thử lại.</p>}<ContactEntry initialRole={query.role === 'tutor' ? 'tutor' : 'parent'} captcha={loginCaptchaPresentation()} /></>;
}
