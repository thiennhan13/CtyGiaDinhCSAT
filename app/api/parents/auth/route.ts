import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { authAttemptKeys } from '@/lib/parent-auth';
import { parentPhoneSchema, isSameOrigin } from '@/lib/parents';
import { LOOKUP_COOKIE, lookupCookieOptions, newLookupToken, hashLookupToken, readLookupHash } from '@/lib/parent-lookup';

const schema = z.object({ phone: parentPhoneSchema, password: z.string().min(1).max(128) }).strict();
const response = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', ...(status === 429 ? { 'Retry-After': '900' } : {}) },
});
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return response({ error: 'Yêu cầu không hợp lệ.' }, 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: 'Vui lòng nhập số di động Việt Nam hợp lệ.' }, 400);
  try {
    const admin = createAdminClient();
    const limit = await admin.rpc('consume_auth_attempt', authAttemptKeys(request, parsed.data.phone));
    if (limit.error) return response({ error: 'Chưa đăng nhập được. Vui lòng thử lại sau.' }, 503);
    if (!limit.data) return response({ error: 'Bạn đã thử nhiều lần. Vui lòng thử lại sau 15 phút.' }, 429);
    const auth = await createClient();
    const signed = await auth.auth.signInWithPassword({ phone: '+84' + parsed.data.phone.slice(1), password: parsed.data.password });
    if (signed.error?.code === 'phone_provider_disabled') {
      return response({ error: 'Đăng nhập phụ huynh hiện chưa sẵn sàng. Vui lòng liên hệ CSAT để được hỗ trợ.' }, 503);
    }
    if (signed.error || signed.data.user?.app_metadata?.role !== 'parent' || !signed.data.session) {
      if (signed.data.session) await auth.auth.signOut({ scope: 'local' });
      return response({ error: 'Số điện thoại hoặc mật khẩu không đúng, hoặc tài khoản chưa được cấp quyền.' }, 401);
    }
    const claims = await auth.auth.getClaims();
    const sessionId = claims.data?.claims?.session_id;
    if (claims.error || typeof sessionId !== 'string') { await auth.auth.signOut({ scope: 'local' }); return response({ error: 'Chưa xác nhận được phiên đăng nhập.' }, 503); }
    const token = newLookupToken();
    const { data, error } = await admin.rpc('start_parent_password_session', {
      p_auth_uid: signed.data.user.id, p_session_id: sessionId, p_token_hash: hashLookupToken(token),
    });
    if (error) { await auth.auth.signOut({ scope: 'local' }); return response({ error: 'Chưa mở được tra cứu. Vui lòng thử lại sau hoặc liên hệ CSAT.' }, 503); }
    if (data !== true) { await auth.auth.signOut({ scope: 'local' }); return response({ error: 'Số điện thoại hoặc mật khẩu không đúng, hoặc tài khoản chưa được cấp quyền.' }, 401); }
    const previousHash = await readLookupHash();
    if (previousHash) await admin.rpc('end_parent_lookup', { p_token_hash: previousHash });
    const cookieStore = await cookies();
    cookieStore.set(LOOKUP_COOKIE, token, lookupCookieOptions);
    cookieStore.set('parent_session', '', { path: '/', maxAge: 0 });
    return response({ success: true, redirectUrl: '/parents' });
  } catch { return response({ error: 'Chưa mở được tra cứu. Vui lòng thử lại sau.' }, 503); }
}
