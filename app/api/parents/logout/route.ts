import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/service';
import { isSameOrigin } from '@/lib/parents';
import { LOOKUP_COOKIE, lookupCookieOptions, readLookupHash } from '@/lib/parent-lookup';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 403 });
  try {
    const hash = await readLookupHash();
    if (hash) {
      const { error } = await createAdminClient().rpc('end_parent_lookup', { p_token_hash: hash });
      if (error) throw new Error('Unavailable');
    }
    const cookieStore = await cookies();
    cookieStore.set(LOOKUP_COOKIE, '', { ...lookupCookieOptions, maxAge: 0 });
    cookieStore.set('parent_session', '', { path: '/', maxAge: 0 });
    return NextResponse.json({ success: true, redirectUrl: '/login' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Chưa đóng được phiên tra cứu. Vui lòng thử lại.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
