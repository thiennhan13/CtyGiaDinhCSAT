import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/service';
import { authAttemptKeys, readLoginBody } from '@/lib/login-security';
import { verifyLoginCaptcha } from '@/lib/login-captcha';
import { isSameOrigin } from '@/lib/parents';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', ...(status === 429 ? { 'Retry-After': '900' } : {}) } });
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
  const input = z.object({ captchaToken: z.string().max(2048).optional() }).strict().safeParse(await readLoginBody(request));
  if (!input.success) return json({ error: 'Yêu cầu không hợp lệ.' }, 422);
  try {
    const captcha = await verifyLoginCaptcha(input.data.captchaToken, 'parent_login');
    if (!captcha.ok) return json({ error: captcha.error }, captcha.status);
    const keys = authAttemptKeys(request, 'google-start');
    const budget = await createAdminClient().rpc('consume_auth_attempt', { ...keys, p_identity: keys.p_source });
    if (budget.error) return json({ error: 'Chưa mở được đăng nhập.' }, 503);
    if (!budget.data) return json({ error: 'Vui lòng chờ 15 phút trước khi thử lại.' }, 429);
    const origin = new URL(process.env.APP_ORIGIN || '').origin;
    const db = await createClient();
    const { data, error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback', skipBrowserRedirect: true } });
    if (error || !data.url) return json({ error: 'Chưa mở được đăng nhập Google. Vui lòng thử lại.' }, 503);
    return json({ url: data.url });
  } catch { return json({ error: 'Chưa mở được đăng nhập Google. Vui lòng thử lại.' }, 503); }
}
