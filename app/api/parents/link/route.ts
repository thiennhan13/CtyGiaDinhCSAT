import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessSession, businessError } from '@/lib/business-api';
import { parentPhoneSchema } from '@/lib/parents';
import { readLoginBody, authAttemptKeys } from '@/lib/login-security';
import { createAdminClient } from '@/lib/supabase/service';
const messages: Record<string, string> = {
  PHONE_ALREADY_LINKED: 'Số điện thoại đã được liên kết với tài khoản phụ huynh khác.',
  ACCOUNT_ALREADY_LINKED: 'Tài khoản này đã liên kết với một học sinh.',
  PHONE_NOT_FOUND: 'Chưa tìm thấy hồ sơ phù hợp. Kiểm tra số điện thoại hoặc liên hệ CSAT.',
  LINK_BLOCKED: 'Liên kết đã bị khóa. Vui lòng liên hệ CSAT.',
  RATE_LIMITED: 'Vui lòng chờ 15 phút trước khi thử lại.',
};
export async function POST(request: Request) {
  const access = await businessSession(false, request); if (access.response) return access.response;
  const input = z.object({ phone: parentPhoneSchema }).strict().safeParse(await readLoginBody(request));
  if (!input.success) return NextResponse.json({ error: 'Số điện thoại không hợp lệ.' }, { status: 422 });
  const budget = await createAdminClient().rpc('consume_auth_attempt', authAttemptKeys(request, 'parent-link:' + access.user.id));
  if (budget.error || !budget.data) return NextResponse.json({ error: budget.error ? 'Chưa thể liên kết.' : messages.RATE_LIMITED }, { status: budget.error ? 503 : 429, headers: { 'Retry-After': '900' } });
  const result = await access.supabase.rpc('claim_parent_phone', { p_phone: input.data.phone });
  if (result.error) return businessError(result.error);
  const code = result.data?.code as string | undefined;
  return NextResponse.json(code ? { code, error: messages[code] || 'Chưa thể liên kết.' } : { success: true }, {
    status: code === 'RATE_LIMITED' ? 429 : code?.endsWith('ALREADY_LINKED') ? 409 : code ? 403 : 200,
    headers: { 'Cache-Control': 'private, no-store', ...(code === 'RATE_LIMITED' ? { 'Retry-After': '900' } : {}) },
  });
}
