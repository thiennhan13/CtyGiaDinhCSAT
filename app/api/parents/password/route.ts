import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { isSameOrigin } from '@/lib/parents';
import { parentSession, authAttemptKeys, verifyParentPassword } from '@/lib/parent-auth';
import { createAdminClient } from '@/lib/supabase/service';
import { LOOKUP_COOKIE, lookupCookieOptions } from '@/lib/parent-lookup';
const schema = z.object({ current_password: z.string().min(1).max(128), password: z.string().min(10).max(128), confirmation: z.string().max(128) }).strict().refine(v => v.password === v.confirmation, 'Mật khẩu xác nhận chưa khớp.');
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return reply({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return reply({ error: 'Mật khẩu mới cần ít nhất 10 ký tự và phần xác nhận phải khớp.' }, 422);
  try {
    const session = await parentSession(); if (!session) return reply({ error: 'Vui lòng đăng nhập lại.' }, 401);
    const admin = createAdminClient();
    const limit = await admin.rpc('consume_auth_attempt', authAttemptKeys(request, 'password:' + session.user.id));
    if (limit.error) return reply({ error: 'Chưa kiểm tra được yêu cầu.' }, 503);
    if (!limit.data) return reply({ error: 'Vui lòng thử lại sau 15 phút.' }, 429);
    if (!session.user.phone || !await verifyParentPassword(session.user.id, session.user.phone, input.data.current_password)) return reply({ error: 'Mật khẩu hiện tại chưa đúng hoặc chưa xác minh được. Vui lòng thử lại.' }, 400);
    const result = await session.db.auth.updateUser({ password: input.data.password, current_password: input.data.current_password });
    if (result.error) return reply({ error: 'Chưa đổi được mật khẩu. Kiểm tra mật khẩu hiện tại và yêu cầu mật khẩu mới.' }, 400);
    const revoked = await admin.rpc('revoke_parent_password_sessions', { p_auth_uid: session.user.id });
    const signout = await session.db.auth.signOut({ scope: 'global' });
    (await cookies()).set(LOOKUP_COOKIE, '', { ...lookupCookieOptions, maxAge: 0 });
    if (revoked.error || signout.error) return reply({ error: 'Mật khẩu đã đổi. Vui lòng đăng nhập lại; liên hệ CSAT để kiểm tra các phiên cũ.' }, 503);
    return reply({ ok: true });
  } catch { return reply({ error: 'Chưa hoàn tất yêu cầu. Vui lòng thử lại.' }, 503); }
}
