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
  })).min(1, "Không có dữ liệu điểm danh"),
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

    const adminClient = createAdminClient();

    // Fetch the class_id to lookup class_students
    const { data: session } = await adminClient.from('sessions').select('class_id').eq('session_id', sessionId).single();
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const classId = session.class_id;
    const studentIds = attendanceData.map((d: any) => d.student_id);

    // Fetch tuition fees for these students in this class
    const { data: classStudents } = await adminClient
      .from('class_students')
      .select('student_id, tuition_fee_per_session')
      .eq('class_id', classId)
      .in('student_id', studentIds);

    const feeMap = new Map<string, number>();
    if (classStudents) {
      classStudents.forEach((cs) => {
        feeMap.set(cs.student_id, cs.tuition_fee_per_session);
      });
    }

    // Enhance attendanceData with tuition_fee_snapshot
    const enhancedAttendanceData = attendanceData.map((d: any) => ({
      ...d,
      tuition_fee_snapshot: feeMap.get(d.student_id) || 0
    }));

    // Perform an UPSERT for attendance
    // attendanceData array has properties matching session_attendance table
    const { error } = await adminClient
      .from('session_attendance')
      .upsert(enhancedAttendanceData, { onConflict: 'session_id, student_id' });

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Lưu điểm danh thành công' });
  } catch (error: any) {
    console.error('Error saving attendance:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
