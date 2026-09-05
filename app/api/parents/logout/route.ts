import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/parents';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  const cookieStore = await cookies();
  cookieStore.set('parent_session', '', { path: '/', maxAge: 0 });
  if (error) return NextResponse.json({ error: 'Chưa đăng xuất được. Vui lòng thử lại.' }, { status: 500 });
  return NextResponse.json({ success: true, redirectUrl: '/login' });
}
