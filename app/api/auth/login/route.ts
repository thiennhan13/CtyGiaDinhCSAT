import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSameOrigin } from '@/lib/parents';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/service';
import { authAttemptKeys } from '@/lib/parent-auth';
const schema = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(128) }).strict();
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return reply({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return reply({ error: 'Kiểm tra email và mật khẩu.' }, 422);
  try {
    const limit = await createAdminClient().rpc('consume_auth_attempt', authAttemptKeys(request, input.data.email));
    if (limit.error) return reply({ error: 'Chưa đăng nhập được. Vui lòng thử lại.' }, 503);
    if (!limit.data) return reply({ error: 'Vui lòng thử lại sau 15 phút.' }, 429);
    const db = await createClient();
    const signed = await db.auth.signInWithPassword(input.data);
    if (signed.error) return reply({ error: 'Email hoặc mật khẩu không chính xác.' }, 401);
    const role = signed.data.user?.app_metadata?.role;
    if (!['admin', 'tutor'].includes(role)) { await db.auth.signOut({ scope: 'local' }); return reply({ error: 'Tài khoản chưa được cấp quyền.' }, 403); }
    if (role === 'tutor') {
      const profile = await db.from('tutors').select('tutor_id,status,is_deleted').eq('auth_uid', signed.data.user!.id).single();
      if (profile.error || !profile.data || profile.data.status !== 'active' || profile.data.is_deleted) {
        await db.auth.signOut({ scope: 'local' });
        return reply({ error: 'Hồ sơ gia sư chưa được cấp quyền hoạt động.' }, profile.error ? 503 : 403);
      }
    }
    return reply({ redirectUrl: role === 'admin' ? '/admin/dashboard' : '/tutor/dashboard' });
  } catch { return reply({ error: 'Chưa đăng nhập được. Vui lòng thử lại.' }, 503); }
}
