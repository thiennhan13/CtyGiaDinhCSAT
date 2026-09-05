import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CsatNavbar } from '@/components/layout/CsatNavbar';
import { ParentPasswordForm } from './password-form';

export default async function ParentAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (user.app_metadata?.role !== 'parent') redirect('/tutor');
  return <><CsatNavbar variant="guest" /><main className="mx-auto max-w-lg px-4 pb-12 pt-24">
    <Link href="/parents" className="text-sm text-primary hover:underline">← Cổng phụ huynh</Link>
    <h1 className="my-6 text-2xl font-bold">Đổi mật khẩu</h1><ParentPasswordForm />
  </main></>;
}
