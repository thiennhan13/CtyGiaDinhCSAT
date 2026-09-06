import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parentPhoneSchema, isSameOrigin } from '@/lib/parents';

const studentIds = z.array(z.string().uuid()).max(50).refine(ids => new Set(ids).size === ids.length);
const inputSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), name: z.string().trim().min(1).max(150), phone: parentPhoneSchema, studentIds: studentIds.min(1) }),
  z.object({ action: z.literal('update'), parentId: z.string().uuid(), name: z.string().trim().min(1).max(150), studentIds, active: z.boolean() }),
]);
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

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
    .select('parent_id, display_name, phone, active, parent_student_links(student_id, students(name))', { count: 'exact' })
    .order('display_name').order('parent_id').range(page * 25, page * 25 + 24);
  if (query) search = search.ilike(/^[+\d\s]+$/.test(query) ? 'phone' : 'display_name', `%${/^[+\d\s]+$/.test(query) ? query.replace(/\s/g, '').replace(/^0/, '+84') : escaped}%`);
  const { data, error, count } = await search;
  return error ? response({ error: 'Chưa tải được tài khoản phụ huynh. Kiểm tra migration 20260906_03 đã được áp dụng.' }, 503)
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
  let phone = input.action === 'create' ? input.phone : null;
  if (input.action === 'update') {
    const { data: account, error } = await supabase.from('parent_accounts').select('parent_id, phone').eq('parent_id', input.parentId).single();
    if (error?.code === '42703' || error?.code === '42P01') return response({ error: 'Cần áp dụng migration 20260906_03.' }, 503);
    if (!account) return response({ error: 'Không tìm thấy phụ huynh.' }, 404);
    phone = account.phone;
  }
  const { error } = await supabase.rpc('admin_save_parent_contact', {
    p_parent_id: input.action === 'update' ? input.parentId : null, p_display_name: input.name,
    p_phone: phone, p_student_ids: input.studentIds, p_active: input.action === 'update' ? input.active : true,
  });
  if (error) {
    if (error.code === '23505') return response({ error: 'Số điện thoại đã được đăng ký. Hãy chỉnh sửa hồ sơ hiện có.' }, 409);
    if (['PGRST202', '42883', '42P01', '42703'].includes(error.code)) return response({ error: 'Cần áp dụng migration 20260906_03 trước khi quản lý tra cứu.' }, 503);
    return response({ error: 'Chưa lưu được phụ huynh. Kiểm tra danh sách học sinh đã chọn.' }, 400);
  }
  return response({ message: input.action === 'create' ? 'Đã mở tra cứu cho số điện thoại.' : 'Đã cập nhật quyền tra cứu.' });
}
