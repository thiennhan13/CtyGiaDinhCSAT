import { redirect } from 'next/navigation';
import Link from 'next/link';
import { parentSession } from '@/lib/parent-auth';
import { ParentShell } from '@/components/learning/ParentShell';
import { ParentPasswordForm } from '@/components/auth/ParentPasswordForm';
export const dynamic = 'force-dynamic';
export default async function ParentAccountPage() {
 if (!await parentSession()) redirect('/login');
 return <ParentShell navigationEnabled={false}><div className="parent-card space-y-6"><Link href="/parents" className="underline">Về thông tin học tập</Link><h1 className="text-2xl font-bold">Đổi mật khẩu</h1><ParentPasswordForm/></div></ParentShell>;
}
