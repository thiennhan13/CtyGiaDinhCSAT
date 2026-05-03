import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { class_id, date, start_time, end_time } = await request.json();

    if (!class_id || !date || !start_time || !end_time) {
      return NextResponse.json({ error: 'Vui lòng cung cấp đủ thông tin.' }, { status: 400 });
    }

    // Initialize Admin Supabase to bypass RLS for session insert
    // Or we could check if user has the right to this class, then insert using Admin Client
    const adminSupabase = createAdminClient();

    // Verify user is tutor of the class
    const { data: tutor } = await adminSupabase.from('tutors').select('tutor_id').eq('auth_uid', user.id).single();

    if (!tutor) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin gia sư.' }, { status: 403 });
    }

    const { data: classInfo } = await adminSupabase.from('classes').select('class_id, csat_fee_per_session').eq('class_id', class_id).eq('tutor_id', tutor.tutor_id).single();

    if (!classInfo) {
      return NextResponse.json({ error: 'Lớp học không thuộc quyền quản lý của bạn.' }, { status: 403 });
    }

    // Insert session using admin client since tutor doesn't have INSERT RLS policy on sessions
    const { data: session, error } = await adminSupabase
      .from('sessions')
      .insert([{
        class_id,
        date,
        start_time,
        end_time,
        status: 'scheduled',
        csat_fee_snapshot: classInfo.csat_fee_per_session
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Tạo lịch dạy bù thành công', session });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
