import type { Metadata } from 'next';
import { ContactEntry } from '@/components/auth/ContactEntry';
import { loginCaptchaPresentation } from '@/lib/login-captcha';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { portalHome, portalRole } from '@/lib/auth-routing';
export const metadata: Metadata = { title: 'Trang liên lạc — CSAT', robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (user) redirect(portalHome(portalRole(user)));
  return <>{query.error === 'google' && <p role="alert" className="mx-auto max-w-lg p-4 text-destructive">Đăng nhập Google chưa hoàn tất hoặc phiên xác nhận đã hết hạn. Vui lòng thử lại.</p>}<ContactEntry initialRole={query.role === 'tutor' ? 'tutor' : 'parent'} captcha={loginCaptchaPresentation()} /></>;
}
