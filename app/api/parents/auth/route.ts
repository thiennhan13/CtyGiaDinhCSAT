import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/service';
import { authAttemptKeys, readLoginBody } from '@/lib/login-security';
import { parentPhoneSchema, isSameOrigin } from '@/lib/parents';
import { LOOKUP_COOKIE, lookupCookieOptions, newLookupToken, hashLookupToken, readLookupHash } from '@/lib/parent-lookup';

const schema = z.object({ phone: parentPhoneSchema }).strict();
const response = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', ...(status === 429 ? { 'Retry-After': '900' } : {}) },
});
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return response({ error: 'Yêu cầu không hợp lệ.' }, 403);
  const parsed = schema.safeParse(await readLoginBody(request));
  if (!parsed.success) return response({ error: 'Vui lòng nhập số di động Việt Nam hợp lệ.' }, 400);
  try {
    const admin = createAdminClient();
    const token = newLookupToken();
    const { data, error } = await admin.rpc('start_parent_phone_session', {
      p_phone: parsed.data.phone, p_token_hash: hashLookupToken(token),
      ...authAttemptKeys(request, 'parent:' + parsed.data.phone),
    });
    if (error) return response({ error: 'Chưa mở được tra cứu. Vui lòng thử lại sau.' }, 503);
    if (data === 'rate_limited') return response({ error: 'Bạn đã thử nhiều lần. Vui lòng thử lại sau 15 phút.' }, 429);
    if (data === 'not_found') return response({ error: 'Chưa mở được tra cứu với số điện thoại này. Vui lòng kiểm tra hoặc liên hệ CSAT.' }, 401);
    if (data !== 'ok') return response({ error: 'Chưa mở được tra cứu. Vui lòng thử lại sau.' }, 503);
    const previousHash = await readLookupHash();
    if (previousHash) {
      const ended = await admin.rpc('end_parent_lookup', { p_token_hash: previousHash });
      if (ended.error) {
        await admin.rpc('end_parent_lookup', { p_token_hash: hashLookupToken(token) });
        return response({ error: 'Chưa chuyển được phiên tra cứu. Vui lòng thử lại.' }, 503);
      }
    }
    const cookieStore = await cookies();
    cookieStore.set(LOOKUP_COOKIE, token, lookupCookieOptions);
    cookieStore.set('parent_session', '', { path: '/', maxAge: 0 });
    return response({ success: true, redirectUrl: '/parents' });
  } catch { return response({ error: 'Chưa mở được tra cứu. Vui lòng thử lại sau.' }, 503); }
}
