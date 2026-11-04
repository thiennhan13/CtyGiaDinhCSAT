import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/parents';
import { LOOKUP_COOKIE } from '@/lib/parent-lookup';
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  const db = await createClient();
  const { error } = await db.auth.signOut({ scope: 'local' });
  if (error) return NextResponse.json({ error: 'Chưa đăng xuất được. Vui lòng thử lại.' }, { status: 503 });
  const jar = await cookies();
  jar.set(LOOKUP_COOKIE, '', { path: '/', maxAge: 0 });
  jar.set('parent_session', '', { path: '/', maxAge: 0 });
  return NextResponse.json({ success: true, redirectUrl: '/login' }, { headers: { 'Cache-Control': 'private, no-store' } });
}
