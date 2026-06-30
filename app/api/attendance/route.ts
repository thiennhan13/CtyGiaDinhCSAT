import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const attendanceSchema = z.object({
  sessionId: z.string().uuid("Session ID không hợp lệ"),
  attendanceData: z.array(z.object({
    session_id: z.string().uuid(),
    student_id: z.string().uuid(),
    status: z.enum(['attended', 'absent']),
    notes: z.string().optional().nullable(),
  // .strip() loại bỏ mọi field thừa client gửi lên (ngăn giả mạo tuition_fee_snapshot)
  }).strip()).min(1, "Không có dữ liệu điểm danh"),
});

export async function POST(request: Request) {
  try {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = attendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { sessionId, attendanceData } = parsed.data;

    // Fetch the class_id to lookup class_students
    // USING supabaseUser to enforce RLS (only tutor of this class or admin can query/update)
    const { data: session } = await supabaseUser.from('sessions').select('class_id').eq('session_id', sessionId).single();
    if (!session) return NextResponse.json({ error: 'Session not found or you do not have permission' }, { status: 404 });

    const classId = session.class_id;
    const studentIds = attendanceData.map((d: any) => d.student_id);

    // Fetch current tuition fees for these students in this class (as fallback)
    const { data: classStudents } = await supabaseUser
      .from('class_students')
      .select('student_id, tuition_fee_per_session')
      .eq('class_id', classId)
      .in('student_id', studentIds);

    const currentFeeMap = new Map<string, number>();
    if (classStudents) {
      classStudents.forEach((cs) => {
        currentFeeMap.set(cs.student_id, cs.tuition_fee_per_session);
      });
    }

    // Lỗi FIX: Fetch existing attendance to preserve old snapshots if they exist
    // Điều này ngăn chặn việc ghi đè mức học phí mới của class_students lên buổi học cũ
    const { data: existingAtts } = await supabaseUser
      .from('session_attendance')
      .select('student_id, tuition_fee_snapshot')
      .eq('session_id', sessionId);
      
    const existingFeeMap = new Map<string, number>();
    if (existingAtts) {
      existingAtts.forEach(att => {
        if (att.tuition_fee_snapshot !== null) {
          existingFeeMap.set(att.student_id, parseFloat(String(att.tuition_fee_snapshot)));
        }
      });
    }

    // Enhance attendanceData with tuition_fee_snapshot
    const enhancedAttendanceData = attendanceData.map((d: any) => ({
      ...d,
      tuition_fee_snapshot: existingFeeMap.has(d.student_id)
        ? existingFeeMap.get(d.student_id)
        : (currentFeeMap.get(d.student_id) || 0)
    }));

    // Perform an UPSERT for attendance and UPDATE session status atomically via RPC
    const { data: rpcResult, error: rpcError } = await supabaseUser
      .rpc('take_attendance_safe', {
        p_session_id: sessionId,
        p_attendance_data: enhancedAttendanceData
      });

    if (rpcError) {
      throw rpcError;
    }

    return NextResponse.json({ message: 'Lưu điểm danh thành công' });
  } catch (error: any) {
    console.error('Error saving attendance:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
