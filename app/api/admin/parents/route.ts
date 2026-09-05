import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/service';
import { parentPhoneSchema, isSameOrigin } from '@/lib/parents';

const studentIds = z.array(z.string().uuid()).max(50).refine(ids => new Set(ids).size === ids.length);
const inputSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), name: z.string().trim().min(1).max(150), phone: parentPhoneSchema, studentIds: studentIds.min(1) }),
  z.object({ action: z.literal('update'), authUid: z.string().uuid(), name: z.string().trim().min(1).max(150), studentIds, active: z.boolean() }),
  z.object({ action: z.literal('reset_password'), authUid: z.string().uuid() }),
]);
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const newPassword = () => `Csat!${randomBytes(12).toString('base64url')}7`;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'admin') return response({ error: 'Không có quyền truy cập.' }, 403);
  const params = new URL(request.url).searchParams;
  const query = (params.get('q') || '').trim().slice(0, 100);
  const escaped = query.replace(/[\\%_]/g, '\\$&');
  if (params.get('view') === 'students') {
    let search = supabase.from('students').select('student_id, name, parent_number, date_of_birth').eq('is_deleted', false).order('name').limit(20);
    if (query) search = search.ilike(/^\d+$/.test(query) ? 'parent_number' : 'name', `%${escaped}%`);
    const { data, error } = await search;
    return error ? response({ error: 'Không tải được danh sách học sinh.' }, 500) : response({ students: data });
  }
  const page = Math.max(0, Math.min(10000, Number.parseInt(params.get('page') || '0', 10) || 0));
  let search = supabase.from('parent_accounts')
    .select('auth_uid, display_name, phone, active, parent_student_links(student_id, students(name))', { count: 'exact' })
    .order('display_name').order('auth_uid').range(page * 25, page * 25 + 24);
  if (query) search = search.ilike(/^[+\d\s]+$/.test(query) ? 'phone' : 'display_name', `%${/^[+\d\s]+$/.test(query) ? query.replace(/\s/g, '').replace(/^0/, '+84') : escaped}%`);
  const { data, error, count } = await search;
  return error ? response({ error: 'Chưa tải được tài khoản phụ huynh. Kiểm tra migration 20260905_02 đã được áp dụng.' }, 503)
    : response({ parents: data, total: count || 0 });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return response({ error: 'Yêu cầu không hợp lệ.' }, 403);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'admin') return response({ error: 'Không có quyền truy cập.' }, 403);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: parsed.error.issues[0].message }, 400);
  const input = parsed.data;
  // Check migration availability before creating any Supabase Auth account.
  const { error: schemaError } = await supabase.from('parent_accounts').select('auth_uid').limit(1);
  if (schemaError) return response({ error: 'Cần chạy migration 20260905_02 trước khi cấp tài khoản.' }, 503);
  const admin = createAdminClient();

  if (input.action === 'create') {
    const { data: students, error } = await supabase.from('students').select('student_id').in('student_id', input.studentIds).eq('is_deleted', false);
    if (error || students?.length !== input.studentIds.length) return response({ error: 'Danh sách học sinh không hợp lệ.' }, 400);
    const password = newPassword();
    const { data, error: authError } = await admin.auth.admin.createUser({ phone: input.phone!, password, phone_confirm: true, app_metadata: { role: 'parent' }, user_metadata: { name: input.name } });
    if (authError || !data.user) return response({ error: 'Không tạo được tài khoản. Số điện thoại có thể đã được sử dụng; kiểm tra Supabase Auth trước khi thử lại.' }, 409);
    const { error: saveError } = await supabase.rpc('admin_save_parent_account', { p_auth_uid: data.user.id, p_display_name: input.name, p_phone: input.phone, p_student_ids: input.studentIds, p_active: true });
    if (saveError) {
      // Compensate only the account this request created; never adopt/delete an existing user.
      const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id);
      return response({ error: cleanupError ? `Chưa liên kết được học sinh. Tài khoản Auth ${data.user.id} cần admin kiểm tra và khóa hoặc thu hồi trước khi cấp lại.` : 'Chưa lưu được liên kết học sinh; tài khoản vừa tạo đã được thu hồi.' }, 500);
    }
    return response({ message: 'Đã cấp tài khoản phụ huynh.', phone: input.phone, password });
  }

  const { data: account } = await supabase.from('parent_accounts').select('auth_uid, phone').eq('auth_uid', input.authUid).single();
  if (!account) return response({ error: 'Không tìm thấy tài khoản phụ huynh.' }, 404);
  const { data: authData, error: authError } = await admin.auth.admin.getUserById(input.authUid);
  if (authError || authData.user?.app_metadata?.role !== 'parent') return response({ error: 'Tài khoản không phải phụ huynh; cần kiểm tra lại liên kết.' }, 409);
  if (input.action === 'reset_password') {
    const password = newPassword();
    const { error } = await admin.auth.admin.updateUserById(input.authUid, { password });
    return error ? response({ error: 'Chưa đặt lại được mật khẩu.' }, 500) : response({ message: 'Đã đặt lại mật khẩu.', phone: account.phone, password });
  }
  const { error } = await supabase.rpc('admin_save_parent_account', { p_auth_uid: input.authUid, p_display_name: input.name, p_phone: account.phone, p_student_ids: input.studentIds, p_active: input.active });
  return error ? response({ error: 'Chưa cập nhật được quyền truy cập. Kiểm tra học sinh và tài khoản đã chọn.' }, 400) : response({ message: 'Đã cập nhật quyền truy cập.' });
}
