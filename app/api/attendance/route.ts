import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessError, businessSession } from '@/lib/business-api';
const schema = z.object({ sessionId: z.uuid(), attendanceData: z.array(z.object({
  session_id: z.uuid(), student_id: z.uuid(), status: z.enum(['attended','absent']), notes: z.string().max(10000).optional().nullable()
}).strip()).min(1) });
export async function POST(request: Request) {
  const session = await businessSession(false, request); if (session.response) return session.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.attendanceData.some(a => a.session_id !== parsed.data.sessionId))
    return NextResponse.json({ error: 'Dữ liệu điểm danh không hợp lệ.' }, { status: 422 });
  const { data, error } = await session.supabase.rpc('take_attendance_safe', {
    p_session_id: parsed.data.sessionId, p_attendance_data: parsed.data.attendanceData
  });
  return error ? businessError(error) : NextResponse.json(data);
}
