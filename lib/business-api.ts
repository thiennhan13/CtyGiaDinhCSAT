import { isSameOrigin } from '@/lib/parents';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export function businessError(error: unknown) {
  const e = error as { code?: string; message?: string };
  const status = e.code === '42501' ? 403 : e.code === 'P0002' ? 404
    : ['23505', '23514', '40001', '40P01'].includes(e.code ?? '') ? 409
    : ['22003', '22023', '22P02', '22007', '22008', '23502', '23503'].includes(e.code ?? '') ? 422 : 500;
  return NextResponse.json({ error: status === 500 ? 'Không thể hoàn tất thao tác. Vui lòng thử lại.' : e.message, code: e.code }, { status });
}
export async function businessSession(adminOnly = true, request?: Request) {
  if (request && !isSameOrigin(request)) return { response: NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 }) };
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { response: NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 }) };
  if (adminOnly && user.app_metadata?.role !== 'admin')
    return { response: NextResponse.json({ error: 'Quyền truy cập bị từ chối.' }, { status: 403 }) };
  return { supabase, user };
}
