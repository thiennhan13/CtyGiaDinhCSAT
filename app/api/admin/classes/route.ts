import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessError, businessSession } from '@/lib/business-api';
const actions = ['create','archive','hard_delete','extend','edit_session','change_tutor','update_csat_fee','update_student_fee',
  'rename_class','remove_student','add_sessions','cancel_sessions','set_status','enroll','drop_student','verify_attendance_fee','verify_session_roster'] as const;
const schema = z.object({ action: z.enum(actions), class_id: z.uuid().optional(), session_id: z.uuid().optional(),
  requestId: z.uuid().optional() }).passthrough();
export async function POST(request: Request) {
  const session = await businessSession(false, request); if (session.response) return session.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Thao tác hoặc định danh không hợp lệ.' }, { status: 422 });
  const { action, class_id, requestId, ...details } = parsed.data;
  let classId = class_id;
  if (!classId && action === 'edit_session' && details.session_id) {
    const found = await session.supabase.from('sessions').select('class_id').eq('session_id', details.session_id).single();
    if (found.error) return businessError(found.error);
    classId = found.data.class_id;
  }
  if (action !== 'create' && !classId) return NextResponse.json({ error: 'Thiếu lớp học.' }, { status: 422 });
  if (action === 'hard_delete') return NextResponse.json({ error: 'Lớp học được giữ lịch sử. Hãy dùng thao tác lưu trữ/kết thúc lớp.' }, { status: 409 });
  const mapped = action === 'archive' ? 'set_status' : action === 'remove_student' ? 'drop_student' : action;
  const { data, error } = await session.supabase.rpc('manage_class', { p_action: mapped, p_class_id: classId ?? null,
    p_data: action === 'archive' ? { ...details, status: 'archived' } : details, p_request_id: requestId ?? crypto.randomUUID() });
  return error ? businessError(error) : NextResponse.json(action === 'create' ? { ...data, data: { class_id: data.class_id } } : data);
}
