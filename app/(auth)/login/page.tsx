import type { Metadata } from 'next';
import { ContactEntry } from '@/components/auth/ContactEntry';
import { loginCaptchaPresentation } from '@/lib/login-captcha';
export const metadata: Metadata = { title: 'Trang liên lạc — CSAT', robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  return <ContactEntry initialRole={query.role === 'tutor' ? 'tutor' : 'parent'} captcha={loginCaptchaPresentation()} />;
}
