import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { parentPhoneSchema, isSameOrigin } from '@/lib/parents';

const schema = z.object({ phone: parentPhoneSchema, password: z.string().min(1).max(128) });
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  const limit = rateLimit(`parent-login:${getClientIp(request)}`, 10);
  if (!limit.success) return NextResponse.json({ error: 'Vui lòng chờ một phút rồi thử lại.' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Vui lòng nhập số điện thoại hợp lệ và mật khẩu.' }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ phone: parsed.data.phone!, password: parsed.data.password });
  if (error || !data.user) return NextResponse.json({ error: 'Số điện thoại hoặc mật khẩu không đúng.' }, { status: error?.status === 429 ? 429 : 401 });
  const { data: profile, error: profileError } = await supabase.from('parent_accounts').select('active').eq('auth_uid', data.user.id).single();
  if (data.user.app_metadata?.role !== 'parent' || profileError || !profile?.active) {
    await supabase.auth.signOut({ scope: 'local' });
    return NextResponse.json({ error: 'Tài khoản chưa được cấp quyền phụ huynh hoặc đã bị khóa. Vui lòng liên hệ CSAT.' }, { status: 403 });
  }
  const cookieStore = await cookies();
  cookieStore.set('parent_session', '', { path: '/', maxAge: 0 });
  return NextResponse.json({ success: true, redirectUrl: '/parents' }, { headers: { 'Cache-Control': 'no-store' } });
}
