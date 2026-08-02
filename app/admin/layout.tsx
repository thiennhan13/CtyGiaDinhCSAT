import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/layout/AdminLayoutClient';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/tutor');
  }

  // Tầng bảo vệ thứ 2 (sau middleware): chỉ admin mới vào được /admin/**
  const role = user.app_metadata?.role ?? 'tutor';
  if (role !== 'admin') {
    redirect('/tutor/dashboard');
  }

  const name = user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Người dùng';
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <AdminLayoutClient user={{ name, role: 'Admin', initials }}>
      {children}
    </AdminLayoutClient>
  );
}

