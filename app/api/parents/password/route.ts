import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parentPasswordSchema, isSameOrigin } from '@/lib/parents';
import { rateLimit } from '@/lib/rate-limit';

const schema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: parentPasswordSchema });
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'parent') return NextResponse.json({ error: 'Vui lòng đăng nhập tài khoản phụ huynh.' }, { status: 401 });
  const { data: profile } = await supabase.from('parent_accounts').select('active').eq('auth_uid', user.id).single();
  if (!profile?.active) return NextResponse.json({ error: 'Tài khoản không có quyền truy cập.' }, { status: 403 });
  if (!rateLimit(`parent-password:${user.id}`, 5).success) return NextResponse.json({ error: 'Vui lòng chờ một phút rồi thử lại.' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  // Supabase validates current_password only when its project setting is enabled.
  // Reauthenticate this exact user so the current password is always checked and
  // the password update uses a recent session (including secure-change projects).
  if (!user.phone) return NextResponse.json({ error: 'Tài khoản chưa có số đăng nhập hợp lệ. Vui lòng liên hệ CSAT.' }, { status: 403 });
  const { data: verified, error: verifyError } = await supabase.auth.signInWithPassword({ phone: user.phone, password: parsed.data.currentPassword });
  if (verifyError || !verified.user) return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng hoặc chưa xác thực được. Vui lòng thử lại.' }, { status: verifyError?.status === 429 ? 429 : 401 });
  if (verified.user.id !== user.id || verified.user.app_metadata?.role !== 'parent') {
    await supabase.auth.signOut({ scope: 'local' });
    return NextResponse.json({ error: 'Thông tin tài khoản đã thay đổi. Vui lòng đăng nhập lại.' }, { status: 403 });
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword, current_password: parsed.data.currentPassword });
  if (error) return NextResponse.json({ error: 'Chưa đổi được mật khẩu. Kiểm tra mật khẩu hiện tại; nếu phiên đã cũ, đăng nhập lại rồi thử lại.' }, { status: 400 });
  return NextResponse.json({ message: 'Đã đổi mật khẩu.' }, { headers: { 'Cache-Control': 'no-store' } });
}
