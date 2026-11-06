import { NextResponse } from 'next/server';
import { isSameOrigin } from '@/lib/parents';
import { createClient } from '@/lib/supabase/server';
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
  const db = await createClient();
  const { error } = await db.auth.signOut({ scope: 'local' });
  if (error) return NextResponse.json({ error: 'Chưa đăng xuất được. Vui lòng thử lại.' }, { status: 503 });
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
