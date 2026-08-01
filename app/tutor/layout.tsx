import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TutorLayoutClient } from './TutorLayoutClient';

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const rawRole = user.app_metadata?.role || 'tutor';
  const role = rawRole === 'admin' ? 'Admin' : 'Gia Sư';
  const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Người dùng';
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <TutorLayoutClient user={{ name, role, initials }}>
      {children}
    </TutorLayoutClient>
  );
}

