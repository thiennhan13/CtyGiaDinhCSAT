import { portalHome, portalRole } from '@/lib/auth-routing';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TutorLayoutClient } from '@/components/layout/TutorLayoutClient';
import { publicPrivateRobots } from '@/lib/public-seo';

export const metadata = { robots: publicPrivateRobots };

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?role=tutor');
  const role = portalRole(user);
  if (role !== 'tutor') redirect(portalHome(role));
  const tutor = await supabase.rpc('current_tutor_id');
  if (tutor.error || !tutor.data) redirect('/access-denied');
  const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Người dùng';
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <TutorLayoutClient user={{ name, role: 'Gia Sư', initials }}>
      {children}
    </TutorLayoutClient>
  );
}

