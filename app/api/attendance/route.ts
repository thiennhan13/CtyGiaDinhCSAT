import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { sessionId, attendanceData } = await request.json();

    if (!sessionId || !attendanceData || !Array.isArray(attendanceData)) {
      return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Perform an UPSERT for attendance
    // attendanceData array has properties matching session_attendance table
    const { error } = await adminClient
      .from('session_attendance')
      .upsert(attendanceData, { onConflict: 'session_id, student_id' });

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Lưu điểm danh thành công' });
  } catch (error: any) {
    console.error('Error saving attendance:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
