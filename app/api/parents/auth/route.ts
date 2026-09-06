import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/service';
import { parentPhoneSchema, isSameOrigin } from '@/lib/parents';
import { LOOKUP_COOKIE, lookupCookieOptions, newLookupToken, hashLookupToken, lookupClientKey, readLookupHash } from '@/lib/parent-lookup';

const schema = z.object({ phone: parentPhoneSchema });
const response = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}) },
});
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return response({ error: 'Yêu cầu không hợp lệ.' }, 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: 'Vui lòng nhập số di động Việt Nam hợp lệ.' }, 400);
  try {
    const admin = createAdminClient();
    const token = newLookupToken();
    const { data, error } = await admin.rpc('start_parent_lookup', {
      p_phone: parsed.data.phone, p_token_hash: hashLookupToken(token), p_client_key: lookupClientKey(request),
    });
    if (error) return response({ error: 'Chưa mở được tra cứu. Vui lòng thử lại sau hoặc liên hệ CSAT.' }, 503);
    if (data === 'rate_limited') return response({ error: 'Vui lòng chờ một phút rồi thử lại.' }, 429);
    if (data === 'not_found') return response({ error: 'Số điện thoại chưa được mở tra cứu. Vui lòng liên hệ CSAT.' }, 404);
    if (data !== 'ok') return response({ error: 'Chưa mở được tra cứu. Vui lòng thử lại sau.' }, 503);
    const previousHash = await readLookupHash();
    if (previousHash) await admin.rpc('end_parent_lookup', { p_token_hash: previousHash });
    const cookieStore = await cookies();
    cookieStore.set(LOOKUP_COOKIE, token, lookupCookieOptions);
    cookieStore.set('parent_session', '', { path: '/', maxAge: 0 });
    return response({ success: true, redirectUrl: '/parents' });
  } catch { return response({ error: 'Chưa mở được tra cứu. Vui lòng thử lại sau.' }, 503); }
}
